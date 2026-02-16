package com.docbox.service;

import com.docbox.entity.Document;
import com.docbox.entity.FamilyMember;
import com.docbox.entity.User;
import com.docbox.entity.DocumentCategory;
import com.docbox.enums.PermissionLevel;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.repository.DocumentRepository;
import com.docbox.repository.DocumentCategoryRepository;
import com.docbox.repository.FamilyMemberRepository;
import com.docbox.repository.UserRepository;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class BulkOperationsService {

    private static final Logger logger = LoggerFactory.getLogger(BulkOperationsService.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentCategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    public byte[] bulkDownloadAsZip(List<Long> documentIds) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ZipOutputStream zos = new ZipOutputStream(baos);

            int successCount = 0;

            for (Long documentId : documentIds) {
                try {
                    if (!permissionService.canAccessDocument(currentUserId, documentId, PermissionLevel.VIEW_DOWNLOAD)) {
                        logger.warn("User {} doesn't have permission to download document {}", currentUserId, documentId);
                        continue;
                    }

                    Document document = documentRepository.findById(documentId).orElse(null);
                    if (document == null) {
                        logger.warn("Document {} not found", documentId);
                        continue;
                    }

                    byte[] fileBytes = fileStorageService.loadFileAsBytes(document.getStoredFilename());

                    ZipEntry zipEntry = new ZipEntry(document.getOriginalFilename());
                    zos.putNextEntry(zipEntry);
                    zos.write(fileBytes);
                    zos.closeEntry();

                    successCount++;

                } catch (Exception e) {
                    logger.error("Failed to add document {} to ZIP", documentId, e);
                }
            }

            zos.close();

            logger.info("Bulk download: {} documents added to ZIP by user {}", successCount, currentUserId);

            return baos.toByteArray();

        } catch (IOException e) {
            logger.error("Failed to create ZIP file", e);
            throw new RuntimeException("Failed to create ZIP file", e);
        }
    }

    @Transactional
    public Map<String, Object> bulkDelete(List<Long> documentIds) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        int successCount = 0;
        int failCount = 0;
        List<String> errors = new ArrayList<>();

        for (Long documentId : documentIds) {
            try {
                if (!permissionService.canAccessDocument(currentUserId, documentId, PermissionLevel.FULL_ACCESS)) {
                    errors.add("No permission to delete document " + documentId);
                    failCount++;
                    continue;
                }

                Document document = documentRepository.findById(documentId).orElse(null);
                if (document == null) {
                    errors.add("Document " + documentId + " not found");
                    failCount++;
                    continue;
                }

                fileStorageService.deleteFile(document.getStoredFilename());

                // ❌ REMOVED: Thumbnail deletion

                documentRepository.delete(document);

                successCount++;

            } catch (Exception e) {
                logger.error("Failed to delete document {}", documentId, e);
                errors.add("Failed to delete document " + documentId + ": " + e.getMessage());
                failCount++;
            }
        }

        logger.info("Bulk delete: {} succeeded, {} failed by user {}", successCount, failCount, currentUserId);

        Map<String, Object> result = new HashMap<>();
        result.put("total", documentIds.size());
        result.put("deleted", successCount);
        result.put("failed", failCount);
        result.put("errors", errors);

        return result;
    }

    @Transactional
    public Map<String, Object> bulkUpdateCategory(List<Long> documentIds, Long categoryId) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));

        int successCount = 0;
        int failCount = 0;
        List<String> errors = new ArrayList<>();

        for (Long documentId : documentIds) {
            try {
                if (!permissionService.canAccessDocument(currentUserId, documentId, PermissionLevel.FULL_ACCESS)) {
                    errors.add("No permission to update document " + documentId);
                    failCount++;
                    continue;
                }

                Document document = documentRepository.findById(documentId).orElse(null);
                if (document == null) {
                    errors.add("Document " + documentId + " not found");
                    failCount++;
                    continue;
                }

                document.setCategory(category);
                documentRepository.save(document);

                successCount++;

            } catch (Exception e) {
                logger.error("Failed to update category for document {}", documentId, e);
                errors.add("Failed to update document " + documentId + ": " + e.getMessage());
                failCount++;
            }
        }

        logger.info("Bulk category update: {} succeeded, {} failed by user {}", successCount, failCount, currentUserId);

        Map<String, Object> result = new HashMap<>();
        result.put("total", documentIds.size());
        result.put("updated", successCount);
        result.put("failed", failCount);
        result.put("errors", errors);

        return result;
    }

    @Transactional
    public Map<String, Object> bulkUpdatePermissions(List<Long> documentIds, Long userId, PermissionLevel permissionLevel) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        int successCount = 0;
        int failCount = 0;
        List<String> errors = new ArrayList<>();

        for (Long documentId : documentIds) {
            try {
                if (!permissionService.canAccessDocument(currentUserId, documentId, PermissionLevel.FULL_ACCESS)) {
                    errors.add("No permission to modify permissions for document " + documentId);
                    failCount++;
                    continue;
                }

                Document document = documentRepository.findById(documentId).orElse(null);
                if (document == null) {
                    errors.add("Document " + documentId + " not found");
                    failCount++;
                    continue;
                }

                FamilyMember familyMember = familyMemberRepository.findByUser(targetUser).orElse(null);

                if (familyMember != null) {
                    permissionService.grantPermission(
                            familyMember.getId(),
                            documentId,
                            permissionLevel
                    );
                    successCount++;
                } else {
                    errors.add("No family member found for user " + userId);
                    failCount++;
                }

            } catch (Exception e) {
                logger.error("Failed to update permissions for document {}", documentId, e);
                errors.add("Failed to update document " + documentId + ": " + e.getMessage());
                failCount++;
            }
        }

        logger.info("Bulk permission update: {} succeeded, {} failed by user {}", successCount, failCount, currentUserId);

        Map<String, Object> result = new HashMap<>();
        result.put("total", documentIds.size());
        result.put("permissionsGranted", successCount);
        result.put("failed", failCount);
        result.put("errors", errors);

        return result;
    }

    @Transactional
    public Map<String, Object> bulkMarkFavorite(List<Long> documentIds, boolean favorite) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        int successCount = 0;
        int failCount = 0;

        for (Long documentId : documentIds) {
            try {
                if (!permissionService.canAccessDocument(currentUserId, documentId, PermissionLevel.VIEW_ONLY)) {
                    failCount++;
                    continue;
                }

                Document document = documentRepository.findById(documentId).orElse(null);
                if (document == null) {
                    failCount++;
                    continue;
                }

                document.setIsFavorite(favorite);
                documentRepository.save(document);

                successCount++;

            } catch (Exception e) {
                logger.error("Failed to mark favorite for document {}", documentId, e);
                failCount++;
            }
        }

        logger.info("Bulk mark favorite: {} succeeded, {} failed", successCount, failCount);

        Map<String, Object> result = new HashMap<>();
        result.put("updated", successCount);
        result.put("failed", failCount);

        return result;
    }

    @Transactional
    public Map<String, Object> bulkArchive(List<Long> documentIds, boolean archive) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        int successCount = 0;
        int failCount = 0;

        for (Long documentId : documentIds) {
            try {
                if (!permissionService.canAccessDocument(currentUserId, documentId, PermissionLevel.FULL_ACCESS)) {
                    failCount++;
                    continue;
                }

                Document document = documentRepository.findById(documentId).orElse(null);
                if (document == null) {
                    failCount++;
                    continue;
                }

                document.setIsArchived(archive);
                documentRepository.save(document);

                successCount++;

            } catch (Exception e) {
                logger.error("Failed to archive document {}", documentId, e);
                failCount++;
            }
        }

        logger.info("Bulk archive: {} succeeded, {} failed", successCount, failCount);

        Map<String, Object> result = new HashMap<>();
        result.put("updated", successCount);
        result.put("failed", failCount);

        return result;
    }
}