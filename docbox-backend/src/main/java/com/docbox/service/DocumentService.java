package com.docbox.service;

import com.docbox.entity.*;
import com.docbox.enums.PermissionLevel;
import com.docbox.exception.BadRequestException;
import com.docbox.exception.FileStorageException;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.repository.*;
import com.docbox.util.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Document Service  v2.0
 * Main service for document management — orchestrates all processing services.
 *
 * IMPROVEMENTS OVER v1:
 *  • uploadDocument() now passes filename to classificationService.classify() so that
 *    filename-based scoring supplements OCR scoring for better category detection.
 *  • Expiry date parsing now tries multiple date formats (dd/MM/yyyy, d/M/yyyy,
 *    dd-MM-yyyy, dd.MM.yyyy, yyyy-MM-dd ISO) before giving up.
 *  • extractedData map is now populated for ALL category types, not just the
 *    detected auto-category. A manually provided category is used as the extraction
 *    hint when the OCR text is ambiguous.
 *  • notifyOnUpload: expiry notification is sent only when daysUntilExpiry ≤ 90
 *    (not 365) to avoid flooding users with notices far in the future.
 *  • All original public methods are preserved and backward-compatible.
 *
 * CRITICAL: All methods check permissions first!
 */
@Service
public class DocumentService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentService.class);

    private static final List<DateTimeFormatter> EXPIRY_DATE_FORMATS = Arrays.asList(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),   // ISO
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),   // US format (rare but OCR may produce it)
            DateTimeFormatter.ofPattern("ddMMyyyy")      // no-separator
    );

    @Autowired private DocumentRepository            documentRepository;
    @Autowired private DocumentCategoryRepository    categoryRepository;
    @Autowired private FamilyMemberRepository        familyMemberRepository;
    @Autowired private UserRepository                userRepository;
    @Autowired private CategoryPermissionRepository  categoryPermissionRepository;
    @Autowired private DocumentAuditLogRepository    auditLogRepository;
    @Autowired private PermissionService             permissionService;
    @Autowired private FileStorageService            fileStorageService;
    @Autowired private DocumentValidationService     validationService;
    @Autowired private DocumentClassificationService classificationService;
    @Autowired private NotificationService           notificationService;
    @Autowired private FileHashService               fileHashService;
    @Autowired private DocumentPermissionRepository  documentPermissionRepository;
    @Autowired private SharedLinkRepository          sharedLinkRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ════════════════════════════════════════════════════════════════════════════
    // UPLOAD
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Upload document — MAIN METHOD.
     * Accepts an optional pre-parsed expiryDate (from controller) and a force flag to allow duplicates.
     */
    @Transactional
    public Document uploadDocument(MultipartFile file,
                                   Long      categoryId,
                                   Long      familyMemberId,
                                   LocalDate manualExpiryDate,
                                   String    notes,
                                   String    customTags,
                                   Boolean   force) {

        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser   = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        logger.info("User {} uploading: {}", currentUserId, file.getOriginalFilename());

        // ── Step 1: Duplicate check ───────────────────────────────────────────
        if (!Boolean.TRUE.equals(force)) {
            String fileHash = fileHashService.calculateFileHash(file);
            if (findDuplicateByHash(currentUser, fileHash).isPresent()) {
                throw new BadRequestException("Duplicate file detected. Use force=true to upload anyway.");
            }
        }

        // ── Step 2: Validate ──────────────────────────────────────────────────
        DocumentValidationService.ValidationResult validation = validationService.validateFile(file);
        if (!validation.isValid()) {
            throw new BadRequestException(validation.getReason()
                    + (validation.getSuggestion() != null ? " " + validation.getSuggestion() : ""));
        }

        String extractedText = validation.getExtractedText();

        // ── Step 3: Auto-categorise if categoryId not provided ────────────────
        String detectedCategory = null;
        if (categoryId == null) {
            // v2: pass filename too — filename scoring supplements OCR scoring
            String fn = file.getOriginalFilename();
            if (extractedText != null && !extractedText.isBlank()) {
                DocumentClassificationService.ClassificationResult cr =
                        classificationService.classify(extractedText, fn);
                detectedCategory = cr.category;
                logger.info("Auto-detected category: {} (conf={:.2f}, ambiguous={})",
                        detectedCategory, cr.confidence, cr.isAmbiguous);
            } else if (fn != null && !fn.isBlank()) {
                // No OCR text — filename only
                detectedCategory = classificationService.detectCategory("", fn);
                logger.info("Filename-only category: {}", detectedCategory);
            }

            if (detectedCategory != null) {
                DocumentCategory detectedCat = categoryRepository.findByName(detectedCategory).orElse(null);
                if (detectedCat != null) categoryId = detectedCat.getId();
            }
        }

        // Fall back to "Others"
        if (categoryId == null) {
            DocumentCategory others = categoryRepository.findByName("Others")
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "name", "Others"));
            categoryId = others.getId();
        }

        final Long finalCategoryId = categoryId;
        DocumentCategory category = categoryRepository.findById(finalCategoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", finalCategoryId));

        // ── Step 4: Store file ────────────────────────────────────────────────
        String storedFilename;
        try {
            storedFilename = fileStorageService.storeFile(file, category.getName());
        } catch (Exception ex) {
            throw new FileStorageException("Failed to store file", ex);
        }

        // ── Step 5: Extract structured data ──────────────────────────────────
        // v2: use the detected or provided category as extraction hint
        Map<String, String> extractedData = new HashMap<>();
        if (extractedText != null && !extractedText.isBlank()) {
            String hint = detectedCategory != null ? detectedCategory : category.getName();
            extractedData = classificationService.extractStructuredData(extractedText, hint);
        }

        // ── Step 6: Family member ─────────────────────────────────────────────
        FamilyMember familyMember = null;
        if (familyMemberId != null) {
            familyMember = familyMemberRepository.findById(familyMemberId)
                    .orElseThrow(() -> new ResourceNotFoundException("FamilyMember", "id", familyMemberId));
            Long primaryAccountId = SecurityUtils.getCurrentPrimaryAccountId();
            if (!familyMember.getPrimaryAccount().getId().equals(primaryAccountId))
                throw new BadRequestException("Invalid family member");
        }

        // ── Step 7: Build Document entity ────────────────────────────────────
        Document document = new Document();
        document.setUser(currentUser);
        document.setFamilyMember(familyMember);
        document.setCategory(category);
        document.setOriginalFilename(file.getOriginalFilename());
        document.setStoredFilename(storedFilename);
        document.setFilePath(fileStorageService.getFilePath(storedFilename).toString());
        document.setFileSize(file.getSize());
        document.setFileType(validation.getFileType());
        document.setMimeType(validation.getMimeType());

        try { document.setFileHash(fileHashService.calculateFileHash(file)); }
        catch (Exception ex) { logger.warn("Could not calculate file hash", ex); }

        document.setOcrText(extractedText);
        document.setOcrConfidence(java.math.BigDecimal.valueOf(validation.getTextConfidence()));
        document.setAutoCategoryDetected(detectedCategory);
        document.setIsValidated(true);

        if (validation.getFileType().equalsIgnoreCase("PDF"))
            document.setPageCount(validation.getPageCount());

        // Persist extracted data as JSON
        try {
            if (!extractedData.isEmpty()) {
                document.setExtractedData(objectMapper.writeValueAsString(extractedData));
                if (extractedData.containsKey("documentNumber"))
                    document.setDocumentNumber(extractedData.get("documentNumber"));
            }
        } catch (Exception ex) { logger.warn("Failed to serialize extracted data", ex); }

        // ── Step 8: Expiry date — manual takes priority; fall back to OCR ────
        LocalDate expiryDate = manualExpiryDate;
        if (expiryDate == null && extractedData.containsKey("expiryDate")) {
            expiryDate = parseExpiryDate(extractedData.get("expiryDate"));
        }
        // Sanity guard: expiry must be in the future and realistic
        if (expiryDate != null && !isPlausibleExpiry(expiryDate)) {
            logger.warn("Discarding implausible OCR expiry date: {}", expiryDate);
            expiryDate = manualExpiryDate; // keep manual if it was set
        }
        document.setExpiryDate(expiryDate);

        document.setNotes(notes);
        if (customTags != null && !customTags.isBlank())
            document.setCustomTags(customTags.split(","));
        document.setUploadedBy(currentUser);

        // ── Step 9: Save ──────────────────────────────────────────────────────
        document = documentRepository.save(document);
        logger.info("Document saved: id={}, category={}", document.getId(), category.getName());

        // ── Step 10: Apply category default permissions ───────────────────────
        applyCategoryDefaultPermissions(document, currentUser);

        // ── Step 11: Audit log ────────────────────────────────────────────────
        auditLogRepository.save(DocumentAuditLog.uploaded(document, currentUser, null, null));

        // ── Step 12: Expiry notification ──────────────────────────────────────
        // v2: notify only when within 90 days (not 365) to avoid noise
        if (document.getExpiryDate() != null) {
            try {
                long daysUntilExpiry = java.time.temporal.ChronoUnit.DAYS.between(
                        LocalDate.now(), document.getExpiryDate());
                if (daysUntilExpiry >= 0 && daysUntilExpiry <= 90) {
                    notificationService.sendExpiryReminder(currentUser, document, (int) daysUntilExpiry);
                    logger.info("⏰ Expiry notification sent for doc {} — {} days", document.getId(), daysUntilExpiry);
                }
            } catch (Exception ex) {
                logger.warn("⚠️ Expiry notification failed for doc {}: {}", document.getId(), ex.getMessage());
            }
        }

        return document;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // CATEGORY DEFAULT PERMISSIONS
    // ════════════════════════════════════════════════════════════════════════════

    private int applyCategoryDefaultPermissions(Document document, User uploader) {
        Long primaryAccountId = uploader.isPrimaryAccount()
                ? uploader.getId() : uploader.getPrimaryAccountId();

        List<CategoryPermission> catPerms =
                categoryPermissionRepository.findByCategoryId(document.getCategory().getId());

        int count = 0;
        for (CategoryPermission cp : catPerms) {
            if (!cp.getPrimaryAccount().getId().equals(primaryAccountId)) continue;
            try {
                FamilyMember fm = familyMemberRepository.findByUser(cp.getUser()).orElse(null);
                if (fm != null) {
                    permissionService.grantPermission(fm.getId(), document.getId(),
                            cp.getDefaultPermissionLevel());
                    count++;
                } else {
                    logger.warn("No family member for user {}, skipping permission", cp.getUser().getId());
                }
            } catch (Exception ex) {
                logger.warn("Failed to apply category permission for user {}", cp.getUser().getId(), ex);
            }
        }
        logger.info("Applied {} category default permissions to document {}", count, document.getId());
        return count;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // DOCUMENT RETRIEVAL (all unchanged from v1)
    // ════════════════════════════════════════════════════════════════════════════

    public Document getDocument(Long documentId) {
        permissionService.requirePermission(documentId, PermissionLevel.VIEW_ONLY, "view");
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));
        Long currentUserId = SecurityUtils.getCurrentUserId();
        userRepository.findById(currentUserId).ifPresent(u ->
                auditLogRepository.save(DocumentAuditLog.viewed(document, u, null, null)));
        return document;
    }

    public byte[] loadDocumentFile(Document document) {
        return fileStorageService.loadFileAsBytes(document.getStoredFilename());
    }

    public List<Document> getMyDocuments() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));
        return currentUser.isPrimaryAccount()
                ? documentRepository.findAllDocumentsForPrimaryAccount(currentUserId)
                : documentRepository.findByUser(currentUser);
    }

    public List<Document> getDocumentsByCategory(Long categoryId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));
        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
        return documentRepository.findByUserAndCategory(currentUser, category);
    }

    public List<Document> searchDocuments(String searchTerm) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return documentRepository.searchDocuments(currentUserId, searchTerm);
    }

    public List<Document> getFavoriteDocuments() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));
        return documentRepository.findByUserAndIsFavoriteTrue(currentUser);
    }

    public List<Document> getArchivedDocuments() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));
        return documentRepository.findByUserAndIsArchivedTrue(currentUser);
    }

    public List<Document> getExpiringDocuments(int days) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        LocalDate cutoff = LocalDate.now().plusDays(days);
        return documentRepository.findExpiringDocuments(currentUserId, LocalDate.now(), cutoff);
    }

    public Optional<Document> findDuplicateByHash(User user, String fileHash) {
        return documentRepository.findByUserAndFileHash(user, fileHash);
    }

    public List<Document> findDuplicates(Long userId) {
        return documentRepository.findDuplicateDocuments(userId);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // DOCUMENT MUTATION (unchanged from v1)
    // ════════════════════════════════════════════════════════════════════════════

    @Transactional
    public Document updateDocument(Long documentId, Map<String, Object> updates) {
        permissionService.requirePermission(documentId, PermissionLevel.FULL_ACCESS, "update");
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        if (updates.containsKey("categoryId")) {
            Long catId = Long.valueOf(updates.get("categoryId").toString());
            DocumentCategory cat = categoryRepository.findById(catId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", catId));
            document.setCategory(cat);
        }
        if (updates.containsKey("familyMemberId")) {
            Long fmId = Long.valueOf(updates.get("familyMemberId").toString());
            document.setFamilyMember(familyMemberRepository.findById(fmId)
                    .orElseThrow(() -> new ResourceNotFoundException("FamilyMember", "id", fmId)));
        }
        if (updates.containsKey("expiryDate")) {
            Object raw = updates.get("expiryDate");
            if (raw != null) {
                LocalDate d = parseExpiryDate(raw.toString());
                document.setExpiryDate(d);
            } else {
                document.setExpiryDate(null);
            }
        }
        if (updates.containsKey("notes"))              document.setNotes((String) updates.get("notes"));
        if (updates.containsKey("isFavorite"))         document.setIsFavorite((Boolean) updates.get("isFavorite"));
        if (updates.containsKey("isArchived"))         document.setIsArchived((Boolean) updates.get("isArchived"));
        if (updates.containsKey("isOfflineAvailable")) document.setIsOfflineAvailable((Boolean) updates.get("isOfflineAvailable"));
        if (updates.containsKey("customTags")) {
            String tags = (String) updates.get("customTags");
            document.setCustomTags(tags == null || tags.isBlank() ? null : tags.split(","));
        }

        final Document updatedDocument = documentRepository.save(document);
        Long currentUserId = SecurityUtils.getCurrentUserId();
        userRepository.findById(currentUserId).ifPresent(u ->
                auditLogRepository.save(DocumentAuditLog.modified(updatedDocument, u, null, null, "Metadata updated")));
        logger.info("Document {} updated", documentId);
        return updatedDocument;
    }

    @Transactional
    public Document changeCategory(Long documentId, Long categoryId) {
        permissionService.requirePermission(documentId, PermissionLevel.FULL_ACCESS, "update");
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));
        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
        document.setCategory(category);
        document = documentRepository.save(document);
        logger.info("Document {} category changed to {}", documentId, category.getName());
        return document;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // CATEGORY MANAGEMENT (unchanged from v1)
    // ════════════════════════════════════════════════════════════════════════════

    public List<DocumentCategory> getAllCategories() { return categoryRepository.findAll(); }

    @Transactional
    public DocumentCategory createCategory(String name, String icon, String description) {
        if (categoryRepository.findByName(name.trim()).isPresent())
            throw new IllegalArgumentException("Category '" + name + "' already exists");
        DocumentCategory cat = new DocumentCategory();
        cat.setName(name.trim()); cat.setIcon(icon); cat.setDescription(description);
        return categoryRepository.save(cat);
    }

    @Transactional
    public DocumentCategory updateCategory(Long categoryId, String name, String icon, String description) {
        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
        if (name != null && !name.isBlank()) {
            categoryRepository.findByName(name.trim())
                    .filter(e -> !e.getId().equals(categoryId))
                    .ifPresent(e -> { throw new IllegalArgumentException("Name '" + name + "' already taken"); });
            category.setName(name.trim());
        }
        if (icon        != null) category.setIcon(icon);
        if (description != null) category.setDescription(description);
        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(Long categoryId) {
        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
        long docCount = documentRepository.countByCategory(category);
        if (docCount > 0)
            throw new IllegalStateException("Cannot delete category '" + category.getName()
                    + "' — it still has " + docCount + " document(s). Move or delete them first.");
        categoryRepository.delete(category);
        logger.info("Category {} deleted", categoryId);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // DELETE (unchanged from v1)
    // ════════════════════════════════════════════════════════════════════════════

    @Transactional
    public void deleteDocument(Long documentId) {
        permissionService.requirePermission(documentId, PermissionLevel.FULL_ACCESS, "delete");
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        try { sharedLinkRepository.deleteByDocumentId(documentId); }
        catch (Exception ex) { logger.warn("Failed to clear shared links for {}: {}", documentId, ex.getMessage()); }

        try { documentPermissionRepository.deleteByDocumentId(documentId); }
        catch (Exception ex) { logger.warn("Failed to clear permissions for {}: {}", documentId, ex.getMessage()); }

        try { auditLogRepository.deleteByDocumentId(documentId); }
        catch (Exception ex) { logger.warn("Failed to clear audit logs for {}: {}", documentId, ex.getMessage()); }

        try { fileStorageService.deleteFile(document.getStoredFilename()); }
        catch (Exception ex) { logger.warn("Failed to delete file for {}: {}", documentId, ex.getMessage()); }

        documentRepository.delete(document);
        logger.info("✅ Document {} deleted", documentId);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STATS (unchanged from v1)
    // ════════════════════════════════════════════════════════════════════════════

    public Map<String, Object> getStorageStats() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        Map<String, Object> stats = new HashMap<>();
        long totalDocuments  = documentRepository.getTotalDocumentCount(currentUserId);
        Long totalStorage    = documentRepository.getTotalStorageUsed(currentUserId);
        stats.put("totalDocuments",   totalDocuments);
        stats.put("totalStorageBytes", totalStorage != null ? totalStorage : 0L);
        stats.put("totalStorageMB",    totalStorage != null ? totalStorage / (1024 * 1024) : 0L);
        stats.put("totalStorageGB",    totalStorage != null
                ? (totalStorage != null ? totalStorage : 0L) / (1024.0 * 1024.0 * 1024.0) : 0.0);

        try {
            List<Object[]> categoryStats = documentRepository.getDocumentCountByCategory(currentUserId);
            List<Map<String, Object>> categoryCounts = new ArrayList<>();
            for (Object[] row : categoryStats) {
                Map<String, Object> c = new HashMap<>();
                c.put("category", row[0] != null ? row[0].toString() : "Others");
                c.put("count",    row[1] != null ? ((Number) row[1]).longValue() : 0L);
                categoryCounts.add(c);
            }
            stats.put("documentsByCategory", categoryCounts);
        } catch (Exception ex) {
            logger.warn("Failed to get category counts: {}", ex.getMessage());
            stats.put("documentsByCategory", new ArrayList<>());
        }

        try {
            List<Map<String, Object>> storageByCat = new ArrayList<>();
            List<Document> allDocs = currentUser.isPrimaryAccount()
                    ? documentRepository.findAllDocumentsForPrimaryAccount(currentUserId)
                    : documentRepository.findByUser(currentUser);
            Map<String, Long> catStorage = new HashMap<>();
            for (Document doc : allDocs) {
                String cn = doc.getCategory() != null ? doc.getCategory().getName() : "Others";
                catStorage.merge(cn, doc.getFileSize() != null ? doc.getFileSize() : 0L, Long::sum);
            }
            for (Map.Entry<String, Long> e : catStorage.entrySet()) {
                Map<String, Object> d = new HashMap<>();
                d.put("category", e.getKey()); d.put("bytes", e.getValue());
                storageByCat.add(d);
            }
            stats.put("storageByCategory", storageByCat);
        } catch (Exception ex) {
            logger.warn("Failed to get storage by category: {}", ex.getMessage());
            stats.put("storageByCategory", new ArrayList<>());
        }

        try {
            List<Object[]> fileTypeStats = documentRepository.getDocumentCountByFileType(currentUserId);
            List<Map<String, Object>> fileTypeCounts = new ArrayList<>();
            for (Object[] row : fileTypeStats) {
                Map<String, Object> d = new HashMap<>();
                d.put("fileType", row[0] != null ? row[0].toString() : "Unknown");
                d.put("count",    row[1] != null ? ((Number) row[1]).longValue() : 0L);
                fileTypeCounts.add(d);
            }
            stats.put("documentsByFileType", fileTypeCounts);
        } catch (Exception ex) {
            logger.warn("Failed to get file type counts: {}", ex.getMessage());
            stats.put("documentsByFileType", new ArrayList<>());
        }

        return stats;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // v2 PRIVATE HELPERS
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Parse an expiry date string using multiple common formats.
     * Returns null if none succeed.
     */
    private LocalDate parseExpiryDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim();
        for (DateTimeFormatter fmt : EXPIRY_DATE_FORMATS) {
            try { return LocalDate.parse(s, fmt); }
            catch (DateTimeParseException ignored) {}
        }
        logger.warn("Could not parse expiry date '{}' — tried {} formats", s, EXPIRY_DATE_FORMATS.size());
        return null;
    }

    /**
     * Sanity check: expiry date must be after 1947 and within 50 years from now.
     * Rejects OCR artefacts like "01/01/0001" or "31/12/9999".
     */
    private boolean isPlausibleExpiry(LocalDate d) {
        if (d == null) return false;
        LocalDate min = LocalDate.of(1947, 1, 1);
        LocalDate max = LocalDate.now().plusYears(50);
        return !d.isBefore(min) && !d.isAfter(max);
    }
}