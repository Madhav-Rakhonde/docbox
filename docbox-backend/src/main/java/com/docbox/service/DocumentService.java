package com.docbox.service;

import com.docbox.entity.*;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentService.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private SharedLinkRepository sharedLinkRepository;

    @Autowired
    private DocumentAuditLogRepository documentAuditLogRepository;

    @Autowired
    private DocumentCategoryRepository categoryRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private OCRService ocrService;

    @Autowired
    private PDFProcessingService pdfProcessingService;

    @Autowired
    private DocumentClassificationService classificationService;

    @Autowired
    private DocumentValidationService validationService;

    @Autowired
    private FileHashService fileHashService;

    /**
     * ✅ ULTRA-FAST UPLOAD with duplicate detection and force option
     */
    @Transactional
    public Document uploadDocument(MultipartFile file, Long categoryId,
                                   Long familyMemberId, LocalDate expiryDate,
                                   String notes, Map<String, String> metadata, Boolean force) {

        long startTime = System.currentTimeMillis();
        logger.info("🚀 UPLOAD: {} (force={})", file.getOriginalFilename(), force);

        try {
            Long currentUserId = SecurityUtils.getCurrentUserId();
            User currentUser = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

            // ========================================
            // STEP 0: CALCULATE FILE HASH
            // ========================================
            String fileHash = fileHashService.calculateFileHash(file);
            logger.info("📊 File hash: {}", fileHash);

            // ========================================
            // STEP 1: CHECK FOR DUPLICATES (unless force=true)
            // ========================================
            if (force == null || !force) {
                Optional<Document> existingDocument = documentRepository.findByUserAndFileHash(currentUser, fileHash);

                if (existingDocument.isPresent()) {
                    Document duplicate = existingDocument.get();
                    logger.warn("⚠️ DUPLICATE DETECTED: {} (ID: {})",
                            duplicate.getOriginalFilename(), duplicate.getId());

                    throw new FileStorageException(
                            String.format("⚠️ Duplicate file detected! You already uploaded '%s' on %s (Category: %s)",
                                    duplicate.getOriginalFilename(),
                                    duplicate.getCreatedAt().toLocalDate(),
                                    duplicate.getCategory() != null ? duplicate.getCategory().getName() : "Unknown")
                    );
                }
            } else {
                logger.info("✅ FORCE UPLOAD: Skipping duplicate check");
            }

            FamilyMember familyMember = null;
            if (familyMemberId != null) {
                familyMember = familyMemberRepository.findById(familyMemberId).orElse(null);
            }

            // ========================================
            // STEP 2: FAST VALIDATION
            // ========================================
            DocumentValidationService.ValidationResult validation =
                    validationService.validateFile(file);

            if (!validation.isValid()) {
                throw new FileStorageException(validation.getReason());
            }

            String fileType = validation.getFileType();

            // ========================================
            // STEP 3: QUICK FILENAME CLASSIFICATION
            // ========================================
            String detectedCategory = "Others";

            if (categoryId == null) {
                detectedCategory = classificationService.detectCategory("", file.getOriginalFilename());
            }

            // ========================================
            // STEP 4: GET/CREATE CATEGORY
            // ========================================
            DocumentCategory category;
            if (categoryId != null) {
                category = categoryRepository.findById(categoryId)
                        .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
            } else {
                category = getOrCreateCategory(detectedCategory);
            }

            // ========================================
            // STEP 5: STORE FILE IN CATEGORY FOLDER
            // ========================================
            String categoryName = category.getName();
            String storedFilename = fileStorageService.storeFile(file, categoryName);
            logger.info("✅ File stored in: {}", storedFilename);

            // ========================================
            // STEP 6: CREATE DOCUMENT (NO THUMBNAIL)
            // ========================================
            Document document = new Document();
            document.setUser(currentUser);
            document.setCategory(category);
            document.setOriginalFilename(file.getOriginalFilename());
            document.setStoredFilename(storedFilename);
            document.setFilePath(storedFilename);
            document.setUploadedBy(currentUser);
            document.setFileSize(file.getSize());
            document.setFileType(fileType);
            document.setMimeType(file.getContentType());
            document.setThumbnailPath(null); // ✅ No thumbnail
            document.setFamilyMember(familyMember);
            document.setAutoCategoryDetected(detectedCategory);
            document.setFileHash(fileHash);

            if (expiryDate != null) {
                document.setExpiryDate(expiryDate);
            }

            if (notes != null) {
                document.setNotes(notes);
            }

            document.setIsOfflineAvailable(false);
            document.setIsFavorite(false);
            document.setIsArchived(false);
            document.setIsValidated(false);

            document = documentRepository.save(document);

            long duration = System.currentTimeMillis() - startTime;
            logger.info("✅ COMPLETE: ID={} ({}ms)", document.getId(), duration);

            // ========================================
            // STEP 7: BACKGROUND OCR
            // ========================================
            byte[] fileBytes = file.getBytes();
            if (fileType.matches("JPG|JPEG|PNG|WEBP|HEIC|BMP|TIFF")) {
                processOcrForSearchAsync(document.getId(), fileBytes);
            } else if (fileType.equals("PDF")) {
                processPdfTextForSearchAsync(document.getId(), fileBytes);
            }

            return document;

        } catch (FileStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            logger.error("❌ FAILED: {}", ex.getMessage());
            throw new FileStorageException("Upload failed: " + ex.getMessage(), ex);
        }
    }

    /**
     * ✅ Backward compatibility - existing method signature
     */
    @Transactional
    public Document uploadDocument(MultipartFile file, Long categoryId,
                                   Long familyMemberId, LocalDate expiryDate,
                                   String notes, Map<String, String> metadata) {
        return uploadDocument(file, categoryId, familyMemberId, expiryDate, notes, metadata, false);
    }

    /**
     * ✅ NEW: Find duplicate documents for a user
     */
    public List<Document> findDuplicates(Long userId) {
        User user = userRepository.findById(userId).orElseThrow();

        List<Document> allUserDocs = documentRepository.findByUser(user);
        Map<String, List<Document>> hashGroups = allUserDocs.stream()
                .filter(doc -> doc.getFileHash() != null)
                .collect(Collectors.groupingBy(Document::getFileHash));

        return hashGroups.values().stream()
                .filter(group -> group.size() > 1)
                .flatMap(List::stream)
                .collect(Collectors.toList());
    }

    /**
     * ✅ Find duplicate by hash
     */
    public Optional<Document> findDuplicateByHash(User user, String fileHash) {
        return documentRepository.findByUserAndFileHash(user, fileHash);
    }

    @Async
    public void processOcrForSearchAsync(Long documentId, byte[] imageBytes) {
        try {
            logger.info("🔍 Background OCR for search: {}", documentId);

            OCRService.OcrResult ocrResult = ocrService.extractTextWithConfidence(imageBytes);

            Document document = documentRepository.findById(documentId).orElse(null);
            if (document != null && ocrResult != null) {
                if (ocrResult.getText().length() > 0) {
                    String truncatedText = ocrResult.getText().substring(
                            0, Math.min(5000, ocrResult.getText().length())
                    );
                    document.setOcrText(truncatedText);
                }
                document.setOcrConfidence(BigDecimal.valueOf(ocrResult.getConfidence()));
                document.setIsValidated(true);
                documentRepository.save(document);
            }

        } catch (Exception ex) {
            logger.error("❌ Background OCR failed: {}", ex.getMessage());
        }
    }

    @Async
    public void processPdfTextForSearchAsync(Long documentId, byte[] pdfBytes) {
        try {
            logger.info("📄 Background PDF text extraction: {}", documentId);

            String extractedText = pdfProcessingService.extractText(pdfBytes);

            Document document = documentRepository.findById(documentId).orElse(null);
            if (document != null && extractedText != null && extractedText.length() > 0) {
                String truncatedText = extractedText.substring(
                        0, Math.min(5000, extractedText.length())
                );
                document.setOcrText(truncatedText);
                document.setOcrConfidence(BigDecimal.valueOf(100.0));
                document.setIsValidated(true);
                documentRepository.save(document);
            }

        } catch (Exception ex) {
            logger.error("❌ Background text extraction failed: {}", ex.getMessage());
        }
    }

    @Transactional
    public Document changeCategory(Long documentId, Long newCategoryId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        DocumentCategory newCategory = categoryRepository.findById(newCategoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", newCategoryId));

        document.setCategory(newCategory);
        document = documentRepository.save(document);

        logger.info("✅ Category changed: Document {} → {}", documentId, newCategory.getName());
        return document;
    }

    @Transactional
    public DocumentCategory createCategory(String name, String icon, String description) {
        if (categoryRepository.findByName(name).isPresent()) {
            throw new IllegalArgumentException("Category already exists: " + name);
        }

        DocumentCategory category = new DocumentCategory();
        category.setName(name);
        category.setIcon(icon != null ? icon : "📁");
        category.setDescription(description != null ? description : "Custom category");
        category.setDisplayOrder(999);

        category = categoryRepository.save(category);
        logger.info("✅ Custom category created: {}", name);

        return category;
    }

    public List<DocumentCategory> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Transactional
    public void deleteCategory(Long categoryId) {
        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));

        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();

        List<Document> documents;
        if (user.isPrimaryAccount()) {
            documents = documentRepository.findByCategoryAndPrimaryAccount(category, userId);
        } else {
            documents = documentRepository.findByCategoryAndUser(category, user);
        }

        if (!documents.isEmpty()) {
            throw new IllegalStateException("Cannot delete category with documents. Please move documents first.");
        }

        categoryRepository.delete(category);
        logger.info("✅ Category deleted: {}", category.getName());
    }

    @Transactional
    public DocumentCategory updateCategory(Long categoryId, String name, String icon, String description) {
        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));

        if (name != null) {
            category.setName(name);
        }
        if (icon != null) {
            category.setIcon(icon);
        }
        if (description != null) {
            category.setDescription(description);
        }

        category = categoryRepository.save(category);
        logger.info("✅ Category updated: {}", category.getName());

        return category;
    }

    private DocumentCategory getOrCreateCategory(String categoryName) {
        return categoryRepository.findByName(categoryName)
                .orElseGet(() -> {
                    DocumentCategory newCategory = new DocumentCategory();
                    newCategory.setName(categoryName);
                    newCategory.setIcon(getDefaultIcon(categoryName));
                    newCategory.setDescription("Auto-created category");
                    newCategory.setDisplayOrder(100);
                    return categoryRepository.save(newCategory);
                });
    }

    private String getDefaultIcon(String categoryName) {
        Map<String, String> iconMap = Map.ofEntries(
                Map.entry("Aadhaar Card", "🪪"),
                Map.entry("PAN Card", "💳"),
                Map.entry("Passport", "🛂"),
                Map.entry("Driving License", "🚗"),
                Map.entry("Voter ID", "🗳️"),
                Map.entry("Ration Card", "🎫"),
                Map.entry("Income Certificate", "💰"),
                Map.entry("Domicile Certificate", "🏠"),
                Map.entry("Caste Certificate", "📄"),
                Map.entry("Birth Certificate", "👶"),
                Map.entry("Marriage Certificate", "💍"),
                Map.entry("Education Certificates", "🎓"),
                Map.entry("Medical Reports", "🏥"),
                Map.entry("Property Documents", "🏘️"),
                Map.entry("Insurance Papers", "🛡️"),
                Map.entry("Financial Documents", "💵"),
                Map.entry("Bills & Receipts", "🧾"),
                Map.entry("Employment Documents", "💼"),
                Map.entry("Vehicle Documents", "🚙"),
                Map.entry("Legal Documents", "⚖️"),
                Map.entry("Others", "📁")
        );
        return iconMap.getOrDefault(categoryName, "📄");
    }

    public Map<String, Object> getStorageStats() {
        Long userId = SecurityUtils.getCurrentUserId();
        Map<String, Object> stats = new HashMap<>();

        long totalDocuments = documentRepository.getTotalDocumentCount(userId);
        stats.put("totalDocuments", totalDocuments);

        Long totalStorage = documentRepository.getTotalStorageUsed(userId);
        stats.put("totalStorageBytes", totalStorage != null ? totalStorage : 0L);
        stats.put("totalStorageMB", totalStorage != null ? totalStorage / (1024 * 1024) : 0L);
        stats.put("totalStorageGB", totalStorage != null ?
                String.format("%.2f", totalStorage / (1024.0 * 1024.0 * 1024.0)) : "0.00");

        stats.put("storageLimitBytes", 5368709120L);
        stats.put("storageLimitGB", 5);

        double percentage = totalStorage != null ?
                (totalStorage * 100.0) / 5368709120L : 0.0;
        stats.put("storagePercentage", String.format("%.1f", percentage));

        List<Object[]> categoryStats = documentRepository.getDocumentCountByCategory(userId);
        List<Map<String, Object>> categoryCounts = new ArrayList<>();
        for (Object[] row : categoryStats) {
            Map<String, Object> catData = new HashMap<>();
            catData.put("category", row[0] != null ? row[0].toString() : "Others");
            catData.put("count", row[1] != null ? ((Number) row[1]).longValue() : 0L);
            categoryCounts.add(catData);
        }
        stats.put("documentsByCategory", categoryCounts);

        List<Map<String, Object>> storageByCat = new ArrayList<>();
        for (Object[] row : categoryStats) {
            String categoryName = row[0] != null ? row[0].toString() : "Others";

            List<Document> categoryDocs;
            DocumentCategory category = categoryRepository.findByName(categoryName).orElse(null);
            if (category != null) {
                User user = userRepository.findById(userId).orElseThrow();
                if (user.isPrimaryAccount()) {
                    categoryDocs = documentRepository.findByCategoryAndPrimaryAccount(category, userId);
                } else {
                    categoryDocs = documentRepository.findByCategoryAndUser(category, user);
                }

                long categoryStorage = categoryDocs.stream()
                        .mapToLong(doc -> doc.getFileSize() != null ? doc.getFileSize() : 0L)
                        .sum();

                Map<String, Object> storageData = new HashMap<>();
                storageData.put("category", categoryName);
                storageData.put("bytes", categoryStorage);
                storageByCat.add(storageData);
            }
        }
        stats.put("storageByCategory", storageByCat);

        List<Object[]> fileTypeStats = documentRepository.getDocumentCountByFileType(userId);
        List<Map<String, Object>> fileTypeCounts = new ArrayList<>();
        for (Object[] row : fileTypeStats) {
            Map<String, Object> typeData = new HashMap<>();
            typeData.put("fileType", row[0] != null ? row[0].toString() : "Unknown");
            typeData.put("count", row[1] != null ? ((Number) row[1]).longValue() : 0L);
            fileTypeCounts.add(typeData);
        }
        stats.put("documentsByFileType", fileTypeCounts);

        return stats;
    }

    public byte[] loadDocumentFile(Document document) {
        return fileStorageService.loadFileAsBytes(document.getStoredFilename());
    }

    public List<Document> searchDocuments(String query) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();

        if (user.isPrimaryAccount()) {
            return documentRepository.searchDocumentsForPrimaryAccount(userId, query);
        } else {
            return documentRepository.searchDocumentsByUser(user, query);
        }
    }

    public List<Document> getDocumentsByCategory(Long categoryId) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();

        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));

        if (user.isPrimaryAccount()) {
            return documentRepository.findByCategoryAndPrimaryAccount(category, userId);
        } else {
            return documentRepository.findByCategoryAndUser(category, user);
        }
    }

    public List<Document> getFavoriteDocuments() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();

        if (user.isPrimaryAccount()) {
            return documentRepository.findFavoriteDocumentsForPrimaryAccount(userId);
        } else {
            return documentRepository.findByUserAndIsFavoriteTrue(user);
        }
    }

    public List<Document> getArchivedDocuments() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();

        if (user.isPrimaryAccount()) {
            return documentRepository.findArchivedDocumentsForPrimaryAccount(userId);
        } else {
            return documentRepository.findByUserAndIsArchivedTrue(user);
        }
    }

    public List<Document> getExpiringDocuments(int days) {
        Long userId = SecurityUtils.getCurrentUserId();
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = LocalDate.now().plusDays(days);
        return documentRepository.findDocumentsExpiringBetween(userId, startDate, endDate);
    }

    public List<Document> getMyDocuments() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElseThrow();

        if (user.isPrimaryAccount()) {
            return documentRepository.findAllDocumentsForPrimaryAccount(userId);
        } else {
            return documentRepository.findByUser(user);
        }
    }

    public Document getDocument(Long id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", id));
    }

    @Transactional
    public void deleteDocument(Long id) {
        Document document = getDocument(id);

        try {
            documentAuditLogRepository.deleteByDocumentId(id);
        } catch (Exception e) {
            logger.debug("No audit logs");
        }

        try {
            sharedLinkRepository.deleteByDocumentId(id);
        } catch (Exception e) {
            logger.debug("No shared links");
        }

        fileStorageService.deleteFile(document.getStoredFilename());

        documentRepository.delete(document);
        logger.info("✅ Deleted: {}", id);
    }

    @Transactional
    public Document updateDocument(Long id, Map<String, Object> updates) {
        Document document = getDocument(id);

        if (updates.containsKey("categoryId")) {
            Long categoryId = Long.parseLong(updates.get("categoryId").toString());
            DocumentCategory category = categoryRepository.findById(categoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
            document.setCategory(category);
        }

        if (updates.containsKey("expiryDate")) {
            String dateStr = updates.get("expiryDate").toString();
            document.setExpiryDate(LocalDate.parse(dateStr));
        }

        if (updates.containsKey("notes")) {
            document.setNotes(updates.get("notes").toString());
        }

        if (updates.containsKey("isFavorite")) {
            document.setIsFavorite(Boolean.parseBoolean(updates.get("isFavorite").toString()));
        }

        if (updates.containsKey("isArchived")) {
            document.setIsArchived(Boolean.parseBoolean(updates.get("isArchived").toString()));
        }

        return documentRepository.save(document);
    }
}