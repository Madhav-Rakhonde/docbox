package com.docbox.service;

import com.docbox.entity.*;
import com.docbox.enums.PermissionLevel;
import com.docbox.exception.BadRequestException;
import com.docbox.exception.FileStorageException;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.repository.*;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DocumentService v3.1
 *
 * FIX v3.1 — Two critical bugs fixed:
 *
 * BUG #1 — getMyDocuments() for sub-accounts only returned their own uploaded docs.
 *   Documents shared with them via DocumentPermission or CategoryPermission were invisible.
 *   Fix: merge own docs + explicitly-shared docs into a single deduplicated list.
 *
 * BUG #2 — getDocumentsByCategory() for sub-accounts only returned their own docs in that
 *   category. Documents from that category shared with them were invisible.
 *   Fix: merge own docs + shared docs that match the requested category.
 *
 * All other methods are identical to v3.0.
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
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("ddMMyyyy")
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
    @Autowired private DocumentProcessingService     processingService;

    // ══════════════════════════════════════════════════════════════════════
    // UPLOAD — v3.0 logic, unchanged
    // ══════════════════════════════════════════════════════════════════════

    @Transactional
    public Document uploadDocument(MultipartFile file,
                                   Long      categoryId,
                                   Long      familyMemberId,
                                   LocalDate manualExpiryDate,
                                   String    notes,
                                   String    customTags,
                                   Boolean   force) {

        long uploadStart = System.currentTimeMillis();
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser   = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        logger.info("Upload started: user={} file={}", currentUserId, file.getOriginalFilename());

        final byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (Exception ex) {
            throw new BadRequestException("Could not read uploaded file: " + ex.getMessage());
        }

        DocumentValidationService.ValidationResult quickCheck =
                validationService.validateFileQuick(file);
        if (!quickCheck.isValid()) {
            throw new BadRequestException(quickCheck.getReason());
        }

        String fileHash = fileHashService.calculateHash(fileBytes);
        if (!Boolean.TRUE.equals(force)) {
            if (findDuplicateByHash(currentUser, fileHash).isPresent()) {
                throw new BadRequestException(
                        "Duplicate file detected. Use force=true to upload anyway.");
            }
        }

        DocumentCategory category;
        boolean needsBackgroundProcessing;

        if (categoryId != null) {
            category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
            needsBackgroundProcessing = false;
        } else {
            category = categoryRepository.findByName("Others")
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "name", "Others"));
            needsBackgroundProcessing = true;
        }

        String storedFilename;
        String filePath;
        try {
            storedFilename = fileStorageService.storeFile(file, category.getName());
            filePath       = fileStorageService.getFileUrl(storedFilename);
        } catch (Exception ex) {
            throw new FileStorageException("Failed to store file", ex);
        }

        Document document = new Document();
        document.setUser(currentUser);
        document.setUploadedBy(currentUser);
        document.setOriginalFilename(file.getOriginalFilename());
        document.setStoredFilename(storedFilename);
        document.setFilePath(filePath);
        document.setFileSize(file.getSize());
        document.setMimeType(file.getContentType());
        document.setFileType(getFileExtension(file.getOriginalFilename()).toUpperCase());
        document.setCategory(category);
        document.setNotes(notes);
        document.setFileHash(fileHash);
        document.setIsOfflineAvailable(false);
        document.setIsFavorite(false);
        document.setIsArchived(false);

        if (familyMemberId != null) {
            FamilyMember fm = familyMemberRepository.findById(familyMemberId).orElse(null);
            if (fm != null) document.setFamilyMember(fm);
        } else if (!currentUser.isPrimaryAccount()) {
            familyMemberRepository.findByUserId(currentUserId)
                    .ifPresent(document::setFamilyMember);
        }

        if (manualExpiryDate != null) {
            document.setExpiryDate(manualExpiryDate);
        }

        document.setProcessingStatus(needsBackgroundProcessing ? "PROCESSING" : "READY");
        document = documentRepository.save(document);

        logger.info("Document {} saved (status={}) in {}ms — returning to user",
                document.getId(),
                document.getProcessingStatus(),
                System.currentTimeMillis() - uploadStart);

        final Long savedDocumentId = document.getId();
        final String filename      = file.getOriginalFilename();

        if (needsBackgroundProcessing) {
            processingService.processDocumentAsync(savedDocumentId, fileBytes, filename);
            logger.info("Document {} queued for background OCR + classification", savedDocumentId);
        } else if (manualExpiryDate == null) {
            processingService.processDocumentAsync(savedDocumentId, fileBytes, filename);
            logger.info("Document {} queued for background expiry extraction", savedDocumentId);
        } else {
            sendExpiryNotificationAsync(document, currentUser);
        }

        return document;
    }

    @Async
    protected void sendExpiryNotificationAsync(Document document, User user) {
        try {
            if (document.getExpiryDate() != null) {
                long daysUntil = document.getDaysUntilExpiry();
                if (daysUntil <= 90) {
                    notificationService.notifyDocumentExpiring(
                            user.getId(),
                            document.getCategory().getName(),
                            (int) daysUntil
                    );
                }
            }
        } catch (Exception ex) {
            logger.warn("Failed to send expiry notification: {}", ex.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // READ METHODS
    // ══════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Document getDocument(Long documentId) {
        permissionService.requirePermission(documentId, PermissionLevel.VIEW_ONLY, "view");
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));
    }

    /**
     * Get all documents visible to the current user.
     *
     * FIX v3.1:
     * - Primary account: unchanged — returns all family docs.
     * - Sub-account: previously returned ONLY their own uploads.
     *   Now also includes docs shared with them via DocumentPermission,
     *   so documents granted by the primary account actually appear in their list.
     */
    @Transactional(readOnly = true)
    public List<Document> getMyDocuments() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (currentUser.isPrimaryAccount()) {
            return documentRepository.findAllDocumentsForPrimaryAccount(currentUserId);
        } else {
            // Own documents
            List<Document> ownDocs = documentRepository.findByUser(currentUser);

            // Documents explicitly shared with this user via DocumentPermission
            List<DocumentPermission> sharedPerms = documentPermissionRepository.findByUserId(currentUserId);
            List<Document> sharedDocs = sharedPerms.stream()
                    .map(DocumentPermission::getDocument)
                    .filter(doc -> !doc.getUser().getId().equals(currentUserId)) // avoid duplicates
                    .collect(Collectors.toList());

            // Merge and deduplicate by document ID
            Map<Long, Document> merged = new LinkedHashMap<>();
            ownDocs.forEach(d -> merged.put(d.getId(), d));
            sharedDocs.forEach(d -> merged.put(d.getId(), d));

            return new ArrayList<>(merged.values());
        }
    }

    /**
     * Get documents by category for the current user.
     *
     * FIX v3.1:
     * - Primary account: unchanged.
     * - Sub-account: previously returned only their OWN docs in that category.
     *   Now also includes shared docs from that same category.
     */
    @Transactional(readOnly = true)
    public List<Document> getDocumentsByCategory(Long categoryId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));

        if (currentUser.isPrimaryAccount()) {
            return documentRepository.findByCategoryAndPrimaryAccount(category, currentUserId);
        } else {
            // Own docs in this category
            List<Document> ownDocs = documentRepository.findByUserAndCategory(currentUser, category);

            // Shared docs in this category
            List<DocumentPermission> sharedPerms = documentPermissionRepository.findByUserId(currentUserId);
            List<Document> sharedDocs = sharedPerms.stream()
                    .map(DocumentPermission::getDocument)
                    .filter(doc -> !doc.getUser().getId().equals(currentUserId))
                    .filter(doc -> doc.getCategory() != null &&
                            doc.getCategory().getId().equals(categoryId))
                    .collect(Collectors.toList());

            // Merge and deduplicate
            Map<Long, Document> merged = new LinkedHashMap<>();
            ownDocs.forEach(d -> merged.put(d.getId(), d));
            sharedDocs.forEach(d -> merged.put(d.getId(), d));

            return new ArrayList<>(merged.values());
        }
    }

    @Transactional(readOnly = true)
    public List<Document> getFavoriteDocuments() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));
        return documentRepository.findByUserAndIsFavoriteTrue(currentUser);
    }

    @Transactional(readOnly = true)
    public List<Document> getArchivedDocuments() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));
        return documentRepository.findByUserAndIsArchivedTrue(currentUser);
    }

    @Transactional(readOnly = true)
    public List<Document> getExpiringDocuments(int days) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return documentRepository.findDocumentsExpiringBetween(
                currentUserId, LocalDate.now(), LocalDate.now().plusDays(days));
    }

    @Transactional(readOnly = true)
    public List<Document> searchDocuments(String query) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        return documentRepository.searchDocuments(currentUserId, query);
    }

    @Transactional(readOnly = true)
    public Optional<Document> findDuplicateByHash(User user, String fileHash) {
        return documentRepository.findByUserAndFileHash(user, fileHash);
    }

    @Transactional(readOnly = true)
    public List<Document> findDuplicates(Long userId) {
        return documentRepository.findDuplicateDocuments(userId);
    }

    // ══════════════════════════════════════════════════════════════════════
    // FILE DOWNLOAD
    // ══════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public byte[] loadDocumentFile(Document document) {
        return fileStorageService.loadFileAsBytes(document.getStoredFilename());
    }

    // ══════════════════════════════════════════════════════════════════════
    // WRITE METHODS
    // ══════════════════════════════════════════════════════════════════════

    @Transactional
    public Document updateDocument(Long documentId, Map<String, Object> updates) {
        permissionService.requirePermission(documentId, PermissionLevel.FULL_ACCESS, "update");
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        if (updates.containsKey("notes"))       document.setNotes((String) updates.get("notes"));
        if (updates.containsKey("isFavorite"))  document.setIsFavorite((Boolean) updates.get("isFavorite"));
        if (updates.containsKey("isArchived"))  document.setIsArchived((Boolean) updates.get("isArchived"));
        if (updates.containsKey("expiryDate") && updates.get("expiryDate") != null) {
            try { document.setExpiryDate(LocalDate.parse(updates.get("expiryDate").toString())); }
            catch (Exception ex) { logger.warn("Invalid expiryDate format: {}", updates.get("expiryDate")); }
        }
        if (updates.containsKey("categoryId")) {
            Long newCatId = Long.valueOf(updates.get("categoryId").toString());
            DocumentCategory newCategory = categoryRepository.findById(newCatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", newCatId));
            document.setCategory(newCategory);
        }
        return documentRepository.save(document);
    }

    @Transactional
    public Document changeCategory(Long documentId, Long categoryId) {
        permissionService.requirePermission(documentId, PermissionLevel.FULL_ACCESS, "change category");
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));
        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
        document.setCategory(category);
        return documentRepository.save(document);
    }

    @Transactional
    public void deleteDocument(Long documentId) {
        permissionService.requirePermission(documentId, PermissionLevel.FULL_ACCESS, "delete");
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        try { sharedLinkRepository.deleteByDocumentId(documentId); }
        catch (Exception ex) { logger.warn("Failed to clear shared links: {}", ex.getMessage()); }

        try { documentPermissionRepository.deleteByDocumentId(documentId); }
        catch (Exception ex) { logger.warn("Failed to clear permissions: {}", ex.getMessage()); }

        try { auditLogRepository.deleteByDocumentId(documentId); }
        catch (Exception ex) { logger.warn("Failed to clear audit logs: {}", ex.getMessage()); }

        try { fileStorageService.deleteFile(document.getStoredFilename()); }
        catch (Exception ex) { logger.warn("Failed to delete file: {}", ex.getMessage()); }

        documentRepository.delete(document);
        logger.info("Document {} deleted", documentId);
    }

    // ══════════════════════════════════════════════════════════════════════
    // CATEGORIES
    // ══════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<DocumentCategory> getAllCategories() { return categoryRepository.findAll(); }

    @Transactional(readOnly = true)
    public List<DocumentCategory> getCategories() { return categoryRepository.findAll(); }

    @Transactional
    public DocumentCategory createCategory(String name, String icon, String description) {
        if (categoryRepository.findByName(name.trim()).isPresent())
            throw new IllegalArgumentException("Category '" + name + "' already exists");
        DocumentCategory category = new DocumentCategory();
        category.setName(name.trim());
        category.setIcon(icon);
        category.setDescription(description);
        return categoryRepository.save(category);
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
                    + "' — it has " + docCount + " document(s). Move or delete them first.");
        categoryRepository.delete(category);
        logger.info("Category {} deleted", categoryId);
    }

    // ══════════════════════════════════════════════════════════════════════
    // STATS
    // ══════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public Map<String, Object> getStorageStats() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        Map<String, Object> stats = new HashMap<>();
        long totalDocuments = documentRepository.getTotalDocumentCount(currentUserId);
        Long totalStorage   = documentRepository.getTotalStorageUsed(currentUserId);
        stats.put("totalDocuments",    totalDocuments);
        stats.put("totalStorageBytes", totalStorage != null ? totalStorage : 0L);
        stats.put("totalStorageMB",    totalStorage != null ? totalStorage / (1024 * 1024) : 0L);
        stats.put("totalStorageGB",    totalStorage != null ? totalStorage / (1024.0 * 1024.0 * 1024.0) : 0.0);

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
            List<Document> allDocs = currentUser.isPrimaryAccount()
                    ? documentRepository.findAllDocumentsForPrimaryAccount(currentUserId)
                    : documentRepository.findByUser(currentUser);
            Map<String, Long> catStorage = new HashMap<>();
            for (Document doc : allDocs) {
                String cn = doc.getCategory() != null ? doc.getCategory().getName() : "Others";
                catStorage.merge(cn, doc.getFileSize() != null ? doc.getFileSize() : 0L, Long::sum);
            }
            List<Map<String, Object>> storageByCat = new ArrayList<>();
            for (Map.Entry<String, Long> e : catStorage.entrySet()) {
                Map<String, Object> d = new HashMap<>();
                d.put("category", e.getKey());
                d.put("bytes", e.getValue());
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

    // ══════════════════════════════════════════════════════════════════════
    // STATUS UPDATE
    // ══════════════════════════════════════════════════════════════════════

    @Transactional
    public Document updateDocumentStatus(Long documentId, String status) {
        permissionService.requirePermission(documentId, PermissionLevel.FULL_ACCESS, "update status");

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        document.setProcessingStatus(status);
        document = documentRepository.save(document);

        logger.info("Document {} processingStatus set to {} by user {}",
                documentId, status, SecurityUtils.getCurrentUserId());

        return document;
    }

    // ══════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════════════

    private LocalDate parseExpiryDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim();
        for (DateTimeFormatter fmt : EXPIRY_DATE_FORMATS) {
            try { return LocalDate.parse(s, fmt); }
            catch (DateTimeParseException ignored) {}
        }
        logger.warn("Could not parse expiry date '{}'", s);
        return null;
    }

    private boolean isPlausibleExpiry(LocalDate d) {
        if (d == null) return false;
        LocalDate min = LocalDate.of(1947, 1, 1);
        LocalDate max = LocalDate.now().plusYears(50);
        return !d.isBefore(min) && !d.isAfter(max);
    }

    private String getFileExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot == -1 ? "" : filename.substring(dot + 1);
    }
}