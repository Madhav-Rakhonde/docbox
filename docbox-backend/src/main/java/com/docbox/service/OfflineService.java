package com.docbox.service;

import com.docbox.entity.Document;
import com.docbox.entity.User;
import com.docbox.enums.PermissionLevel;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.repository.DocumentRepository;
import com.docbox.repository.UserRepository;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Offline Service
 * Manages offline document access and synchronization
 * Ensures users can access documents even without internet
 */
@Service
public class OfflineService {

    private static final Logger logger = LoggerFactory.getLogger(OfflineService.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private FileStorageService fileStorageService;

    /**
     * Mark document for offline availability
     * This prepares the document for offline access
     */
    @Transactional
    public Document markForOfflineAccess(Long documentId) {
        Long userId = SecurityUtils.getCurrentUserId();

        // Check permission
        permissionService.requirePermission(documentId, PermissionLevel.VIEW_ONLY, "mark for offline");

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        document.setIsOfflineAvailable(true);
        document.setOfflineLastSyncedAt(LocalDateTime.now());
        document = documentRepository.save(document);

        logger.info("Document {} marked for offline access by user {}", documentId, userId);

        return document;
    }

    /**
     * Remove document from offline access
     */
    @Transactional
    public void removeFromOfflineAccess(Long documentId) {
        Long userId = SecurityUtils.getCurrentUserId();

        permissionService.requirePermission(documentId, PermissionLevel.VIEW_ONLY, "remove from offline");

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        document.setIsOfflineAvailable(false);
        document.setOfflineLastSyncedAt(null);
        documentRepository.save(document);

        logger.info("Document {} removed from offline access by user {}", documentId, userId);
    }

    /**
     * Get all documents available offline for current user
     * IMPORTANT: ALL documents user has access to are available offline
     * Not just the ones explicitly marked
     */
    public List<Map<String, Object>> getOfflineDocuments() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        List<Document> offlineDocuments;

        if (user.isPrimaryAccount()) {
            // Primary account gets ALL family documents for offline
            offlineDocuments = documentRepository.findAllDocumentsForPrimaryAccount(
                    userId, PageRequest.of(0, 10000)).getContent();
        } else {
            // Sub-account gets ALL documents they have permission to access
            offlineDocuments = documentRepository.findByUser(
                    user, PageRequest.of(0, 10000)).getContent();
        }

        logger.info("Retrieved {} documents for offline access for user {}",
                offlineDocuments.size(), userId);

        return offlineDocuments.stream()
                .map(this::buildOfflineDocumentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get offline manifest for PWA
     * This provides all necessary data for offline functionality
     * IMPORTANT: Includes ALL documents user can access, not just marked ones
     */
    public Map<String, Object> getOfflineManifest() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        List<Document> offlineDocuments;

        if (user.isPrimaryAccount()) {
            // Get ALL family documents
            offlineDocuments = documentRepository.findAllDocumentsForPrimaryAccount(
                    userId, PageRequest.of(0, 10000)).getContent();
        } else {
            // Get ALL accessible documents
            offlineDocuments = documentRepository.findByUser(
                    user, PageRequest.of(0, 10000)).getContent();
        }

        Map<String, Object> manifest = new HashMap<>();
        manifest.put("version", "1.0");
        manifest.put("lastUpdated", LocalDateTime.now());
        manifest.put("userId", userId);
        manifest.put("documentCount", offlineDocuments.size());

        // Document URLs to cache - ALL documents
        List<String> documentUrls = offlineDocuments.stream()
                .map(doc -> "/api/documents/" + doc.getId() + "/download")
                .collect(Collectors.toList());
        manifest.put("documentUrls", documentUrls);

        // Thumbnail URLs to cache - ALL thumbnails
        List<String> thumbnailUrls = offlineDocuments.stream()
                .filter(doc -> doc.getThumbnailPath() != null)
                .map(doc -> "/api/documents/" + doc.getId() + "/thumbnail")
                .collect(Collectors.toList());
        manifest.put("thumbnailUrls", thumbnailUrls);

        // Document metadata - ALL documents
        List<Map<String, Object>> documents = offlineDocuments.stream()
                .map(this::buildOfflineDocumentResponse)
                .collect(Collectors.toList());
        manifest.put("documents", documents);

        // Add API endpoints to cache
        List<String> apiEndpoints = Arrays.asList(
                "/api/users/me",
                "/api/categories",
                "/api/family-members",
                "/api/documents"
        );
        manifest.put("apiEndpoints", apiEndpoints);

        logger.info("Generated offline manifest for user {} with {} documents (ALL accessible)",
                userId, offlineDocuments.size());

        return manifest;
    }

    /**
     * Auto-mark important documents for offline access
     * Automatically makes critical documents available offline
     */
    @Transactional
    public int autoMarkImportantDocuments() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        List<Document> documents = new ArrayList<>();

        if (user.isPrimaryAccount()) {
            // Get all family documents
            documents = documentRepository.findAllDocumentsForPrimaryAccount(
                    userId, PageRequest.of(0, 1000)).getContent();
        } else {
            documents = documentRepository.findByUser(
                    user, PageRequest.of(0, 1000)).getContent();
        }

        int markedCount = 0;

        for (Document doc : documents) {
            // Auto-mark important categories
            if (isImportantCategory(doc.getCategory().getName())) {
                if (!doc.getIsOfflineAvailable()) {
                    doc.setIsOfflineAvailable(true);
                    doc.setOfflineLastSyncedAt(LocalDateTime.now());
                    documentRepository.save(doc);
                    markedCount++;
                }
            }
        }

        logger.info("Auto-marked {} important documents for offline access for user {}",
                markedCount, userId);

        return markedCount;
    }

    /**
     * Get sync status for all offline documents
     */
    public Map<String, Object> getSyncStatus() {
        Long userId = SecurityUtils.getCurrentUserId();

        List<Document> offlineDocuments = documentRepository.findOfflineDocumentsForPrimaryAccount(userId);

        Map<String, Object> status = new HashMap<>();
        status.put("totalOfflineDocuments", offlineDocuments.size());
        status.put("lastSyncTime", LocalDateTime.now());

        // Calculate total offline storage
        long totalSize = offlineDocuments.stream()
                .mapToLong(Document::getFileSize)
                .sum();

        status.put("offlineStorageBytes", totalSize);
        status.put("offlineStorageMB", totalSize / (1024 * 1024));

        // Documents needing sync (modified after offline sync)
        long needingSync = offlineDocuments.stream()
                .filter(doc -> doc.getOfflineLastSyncedAt() != null &&
                        doc.getUpdatedAt().isAfter(doc.getOfflineLastSyncedAt()))
                .count();
        status.put("documentsNeedingSync", needingSync);

        return status;
    }

    /**
     * Bulk mark documents for offline access
     */
    @Transactional
    public int bulkMarkForOffline(List<Long> documentIds) {
        Long userId = SecurityUtils.getCurrentUserId();
        int markedCount = 0;

        for (Long documentId : documentIds) {
            try {
                // Check permission
                if (permissionService.canAccessDocument(userId, documentId, PermissionLevel.VIEW_ONLY)) {
                    Document document = documentRepository.findById(documentId).orElse(null);
                    if (document != null && !document.getIsOfflineAvailable()) {
                        document.setIsOfflineAvailable(true);
                        document.setOfflineLastSyncedAt(LocalDateTime.now());
                        documentRepository.save(document);
                        markedCount++;
                    }
                }
            } catch (Exception e) {
                logger.warn("Failed to mark document {} for offline: {}", documentId, e.getMessage());
            }
        }

        logger.info("Bulk marked {} documents for offline access by user {}", markedCount, userId);

        return markedCount;
    }

    /**
     * Bulk remove documents from offline access
     */
    @Transactional
    public int bulkRemoveFromOffline(List<Long> documentIds) {
        Long userId = SecurityUtils.getCurrentUserId();
        int removedCount = 0;

        for (Long documentId : documentIds) {
            try {
                if (permissionService.canAccessDocument(userId, documentId, PermissionLevel.VIEW_ONLY)) {
                    Document document = documentRepository.findById(documentId).orElse(null);
                    if (document != null && document.getIsOfflineAvailable()) {
                        document.setIsOfflineAvailable(false);
                        document.setOfflineLastSyncedAt(null);
                        documentRepository.save(document);
                        removedCount++;
                    }
                }
            } catch (Exception e) {
                logger.warn("Failed to remove document {} from offline: {}", documentId, e.getMessage());
            }
        }

        logger.info("Bulk removed {} documents from offline access by user {}", removedCount, userId);

        return removedCount;
    }

    /**
     * Check if category is important enough for auto-offline
     */
    private boolean isImportantCategory(String categoryName) {
        List<String> importantCategories = Arrays.asList(
                "Aadhaar Card",
                "PAN Card",
                "Passport",
                "Driving License",
                "Voter ID",
                "Birth Certificate",
                "Marriage Certificate",
                "Insurance Papers"
        );

        return importantCategories.contains(categoryName);
    }

    /**
     * Build offline document response
     */
    private Map<String, Object> buildOfflineDocumentResponse(Document doc) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", doc.getId());
        data.put("filename", doc.getOriginalFilename());
        data.put("fileSize", doc.getFileSize());
        data.put("fileType", doc.getFileType());
        data.put("category", doc.getCategory().getName());
        data.put("downloadUrl", "/api/documents/" + doc.getId() + "/download");
        data.put("thumbnailUrl", doc.getThumbnailPath() != null ?
                "/api/documents/" + doc.getId() + "/thumbnail" : null);
        data.put("lastSynced", doc.getOfflineLastSyncedAt());
        data.put("createdAt", doc.getCreatedAt());
        data.put("updatedAt", doc.getUpdatedAt());

        return data;
    }
}