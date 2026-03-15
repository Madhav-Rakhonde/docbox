package com.docbox.service;

import com.docbox.entity.*;
import com.docbox.enums.PermissionLevel;
import com.docbox.enums.PermissionTemplate;
import com.docbox.exception.BadRequestException;
import com.docbox.exception.PermissionDeniedException;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.repository.*;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * CRITICAL SERVICE: Permission Management
 * This is the heart of DocBox's access control system
 *
 * Every document access MUST go through this service
 *
 * FIX v2.0:
 *   1. getPermissionLevel() now checks CategoryPermission (Rule 3.5)
 *      — previously category permissions were stored but never consulted,
 *        meaning grantCategoryPermission() had zero effect on actual access.
 *   2. getGrantedDocumentPermissions() / getGrantedCategoryPermissions()
 *      now use targeted repository queries instead of findAll()
 *      — findAll() on large tables is a production killer.
 */
@Service
public class PermissionService {

    private static final Logger logger = LoggerFactory.getLogger(PermissionService.class);

    @Autowired
    private DocumentPermissionRepository permissionRepository;

    @Autowired
    private CategoryPermissionRepository categoryPermissionRepository;

    @Autowired
    private PermissionAuditLogRepository auditLogRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentCategoryRepository categoryRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    /**
     * CRITICAL METHOD: Check if user can access document
     * This is called before EVERY document operation
     */
    public boolean canAccessDocument(Long userId, Long documentId) {
        return canAccessDocument(userId, documentId, PermissionLevel.VIEW_ONLY);
    }

    /**
     * CRITICAL METHOD: Check if user has specific permission level
     */
    public boolean canAccessDocument(Long userId, Long documentId, PermissionLevel requiredLevel) {
        try {
            PermissionLevel userLevel = getPermissionLevel(userId, documentId);
            return userLevel.isSufficientFor(requiredLevel);
        } catch (Exception e) {
            logger.error("Error checking document access: {}", e.getMessage());
            return false;
        }
    }

    /**
     * CRITICAL METHOD: Get user's permission level for a document
     *
     * FIX v2.0: Added Rule 3.5 — CategoryPermission check.
     * Previously sub-accounts granted category-level access via grantCategoryPermission()
     * would still get NO_ACCESS because this method never consulted category_permissions table.
     */
    public PermissionLevel getPermissionLevel(Long userId, Long documentId) {
        // Get document
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        // Get user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Rule 1: Document owner always has FULL_ACCESS
        if (document.getUser().getId().equals(userId)) {
            logger.debug("User {} is document owner - FULL_ACCESS", userId);
            return PermissionLevel.FULL_ACCESS;
        }

        // Rule 2: If document belongs to a family member and user is that family member's account
        if (document.getFamilyMember() != null &&
                document.getFamilyMember().getUser() != null &&
                document.getFamilyMember().getUser().getId().equals(userId)) {
            logger.debug("User {} is family member owner - FULL_ACCESS", userId);
            return PermissionLevel.FULL_ACCESS;
        }

        // Rule 3: Check explicit document permission
        Optional<DocumentPermission> permission = permissionRepository.findActivePermission(
                documentId, userId, LocalDateTime.now());

        if (permission.isPresent()) {
            logger.debug("User {} has explicit document permission: {}", userId, permission.get().getPermissionLevel());
            return permission.get().getPermissionLevel();
        }

        // Rule 3.5: Check category-level permission
        // FIX: This rule was previously missing, meaning grantCategoryPermission() had zero effect.
        // A primary account can grant a sub-account access to an entire category.
        // When checking access, we look up whether there's a CategoryPermission record
        // for this user, this document's category, under the primary account that owns the document.
        if (document.getCategory() != null) {
            Long docOwnerPrimaryId = null;
            User docOwner = document.getUser();

            if (docOwner.isPrimaryAccount()) {
                // The document owner IS the primary account
                docOwnerPrimaryId = docOwner.getId();
            } else if (docOwner.getPrimaryAccountId() != null) {
                // The document owner is a sub-account; use their primary account
                docOwnerPrimaryId = docOwner.getPrimaryAccountId();
            }

            if (docOwnerPrimaryId != null) {
                Optional<CategoryPermission> catPerm = categoryPermissionRepository
                        .findByCategoryIdAndPrimaryAccountIdAndUserId(
                                document.getCategory().getId(),
                                docOwnerPrimaryId,
                                userId
                        );
                if (catPerm.isPresent()) {
                    PermissionLevel catLevel = catPerm.get().getDefaultPermissionLevel();
                    logger.debug("User {} has category-level permission for doc {}: {}",
                            userId, documentId, catLevel);
                    return catLevel;
                }
            }
        }

        // Rule 4: Primary account can access all documents in their family
        if (user.isPrimaryAccount()) {
            // Check if document belongs to this primary account's family
            Long docOwnerId = document.getUser().getId();
            User docOwner = userRepository.findById(docOwnerId).orElse(null);

            if (docOwner != null) {
                Long docPrimaryAccountId = docOwner.getPrimaryAccountId();
                if (docPrimaryAccountId != null && docPrimaryAccountId.equals(userId)) {
                    logger.debug("Primary account {} accessing family document - FULL_ACCESS", userId);
                    return PermissionLevel.FULL_ACCESS;
                } else if (docOwner.getId().equals(userId)) {
                    logger.debug("Primary account {} accessing own document - FULL_ACCESS", userId);
                    return PermissionLevel.FULL_ACCESS;
                }
            }
        }

        // Rule 5: No access
        logger.debug("User {} has NO_ACCESS to document {}", userId, documentId);
        return PermissionLevel.NO_ACCESS;
    }

    /**
     * Grant permission to a user for a document.
     *
     * Returns a plain Map DTO so that all lazy-loaded associations (User, Document)
     * are accessed while the @Transactional session is still open.
     */
    @Transactional
    public Map<String, Object> grantPermission(Long familyMemberId, Long documentId, PermissionLevel level) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        FamilyMember familyMember = familyMemberRepository.findById(familyMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyMember", "id", familyMemberId));

        User targetUser = familyMember.getUser();
        if (targetUser == null) {
            targetUser = familyMember.getPrimaryAccount();
        }

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        DocumentPermission existing = permissionRepository
                .findByDocumentIdAndUserId(documentId, targetUser.getId())
                .orElse(null);

        DocumentPermission permission;
        if (existing != null) {
            existing.setPermissionLevel(level);
            existing.setUpdatedAt(LocalDateTime.now());
            permission = permissionRepository.save(existing);
        } else {
            permission = new DocumentPermission();
            permission.setDocument(document);
            permission.setUser(targetUser);
            permission.setPermissionLevel(level);
            permission.setGrantedBy(currentUser);
            permission.setGrantedAt(LocalDateTime.now());
            permission.setUpdatedAt(LocalDateTime.now());
            permission = permissionRepository.save(permission);
        }

        Map<String, Object> dto = new HashMap<>();
        dto.put("id", permission.getId());
        dto.put("documentId", permission.getDocument().getId());
        dto.put("documentName", permission.getDocument().getOriginalFilename());
        dto.put("userId", permission.getUser().getId());
        dto.put("userEmail", permission.getUser().getEmail());
        dto.put("userFullName", permission.getUser().getFullName());
        dto.put("permissionLevel", permission.getPermissionLevel().toString());
        dto.put("grantedAt", permission.getGrantedAt());
        dto.put("grantedBy", permission.getGrantedBy() != null ? permission.getGrantedBy().getId() : null);
        return dto;
    }

    /**
     * Revoke permission from a user
     */
    @Transactional
    public void revokePermission(Long documentId, Long userId, String reason) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (!canAccessDocument(currentUserId, documentId, PermissionLevel.FULL_ACCESS)) {
            throw new PermissionDeniedException("You don't have permission to revoke access to this document");
        }

        DocumentPermission permission = permissionRepository.findByDocumentIdAndUserId(documentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found"));

        PermissionLevel oldLevel = permission.getPermissionLevel();
        permissionRepository.delete(permission);
        logger.info("Revoked permission for user {} on document {}", userId, documentId);

        Document document = documentRepository.findById(documentId).orElse(null);
        User user = userRepository.findById(userId).orElse(null);
        User revokedBy = userRepository.findById(currentUserId).orElse(null);

        if (document != null && user != null && revokedBy != null) {
            PermissionAuditLog auditLog = PermissionAuditLog.revoked(
                    document, user, oldLevel, revokedBy, reason);
            auditLogRepository.save(auditLog);
        }
    }

    /**
     * Set category-level default permission
     */
    @Transactional
    public CategoryPermission setCategoryDefaultPermission(Long categoryId, Long userId,
                                                           PermissionLevel defaultLevel) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (!currentUser.isPrimaryAccount()) {
            throw new PermissionDeniedException("Only primary account can set category permissions");
        }

        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));
        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!targetUser.getPrimaryAccountId().equals(currentUserId)) {
            throw new BadRequestException("Can only set permissions for your family members");
        }

        Optional<CategoryPermission> existing = categoryPermissionRepository
                .findByCategoryIdAndPrimaryAccountIdAndUserId(categoryId, currentUserId, userId);

        CategoryPermission categoryPermission;
        if (existing.isPresent()) {
            categoryPermission = existing.get();
            categoryPermission.setDefaultPermissionLevel(defaultLevel);
        } else {
            categoryPermission = new CategoryPermission();
            categoryPermission.setCategory(category);
            categoryPermission.setPrimaryAccount(currentUser);
            categoryPermission.setUser(targetUser);
            categoryPermission.setDefaultPermissionLevel(defaultLevel);
            categoryPermission.setCreatedBy(currentUser);
        }

        categoryPermission = categoryPermissionRepository.save(categoryPermission);
        logger.info("Set category default permission: category={}, user={}, level={}",
                categoryId, userId, defaultLevel);

        return categoryPermission;
    }

    /**
     * Apply permission template to a user
     */
    @Transactional
    public Map<String, Object> applyPermissionTemplate(Long userId, PermissionTemplate template) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (!currentUser.isPrimaryAccount()) {
            throw new PermissionDeniedException("Only primary account can apply templates");
        }

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (!targetUser.getPrimaryAccountId().equals(currentUserId)) {
            throw new BadRequestException("Can only apply templates to your family members");
        }

        List<DocumentCategory> categories = categoryRepository.findAll();
        Map<String, PermissionLevel> templateMapping = getTemplateMapping(template);
        int categoriesUpdated = 0;

        for (DocumentCategory category : categories) {
            PermissionLevel level = templateMapping.getOrDefault(
                    category.getName(), PermissionLevel.NO_ACCESS);
            setCategoryDefaultPermission(category.getId(), userId, level);
            categoriesUpdated++;
        }

        logger.info("Applied template {} to user {}: {} categories updated",
                template, userId, categoriesUpdated);

        Map<String, Object> result = new HashMap<>();
        result.put("template", template);
        result.put("userId", userId);
        result.put("categoriesUpdated", categoriesUpdated);

        return result;
    }

    /**
     * Get template mapping for category permissions
     */
    private Map<String, PermissionLevel> getTemplateMapping(PermissionTemplate template) {
        Map<String, PermissionLevel> mapping = new HashMap<>();

        switch (template) {
            case STANDARD:
                mapping.put("Aadhaar Card", PermissionLevel.VIEW_DOWNLOAD);
                mapping.put("PAN Card", PermissionLevel.VIEW_DOWNLOAD);
                mapping.put("Passport", PermissionLevel.VIEW_DOWNLOAD);
                mapping.put("Driving License", PermissionLevel.VIEW_DOWNLOAD);
                mapping.put("Voter ID", PermissionLevel.VIEW_DOWNLOAD);
                mapping.put("Education Certificates", PermissionLevel.VIEW_DOWNLOAD);
                mapping.put("Medical Reports", PermissionLevel.VIEW_ONLY);
                mapping.put("Property Documents", PermissionLevel.NO_ACCESS);
                mapping.put("Insurance Papers", PermissionLevel.VIEW_ONLY);
                mapping.put("Financial Documents", PermissionLevel.NO_ACCESS);
                mapping.put("Vehicle Documents", PermissionLevel.VIEW_ONLY);
                mapping.put("Bills & Receipts", PermissionLevel.VIEW_ONLY);
                mapping.put("Employment Documents", PermissionLevel.VIEW_ONLY);
                mapping.put("Legal Documents", PermissionLevel.NO_ACCESS);
                mapping.put("Birth Certificate", PermissionLevel.VIEW_DOWNLOAD);
                mapping.put("Marriage Certificate", PermissionLevel.VIEW_ONLY);
                mapping.put("Ration Card", PermissionLevel.VIEW_DOWNLOAD);
                mapping.put("Others", PermissionLevel.VIEW_ONLY);
                break;

            case LIMITED:
                mapping.put("Aadhaar Card", PermissionLevel.VIEW_ONLY);
                mapping.put("PAN Card", PermissionLevel.NO_ACCESS);
                mapping.put("Passport", PermissionLevel.VIEW_ONLY);
                mapping.put("Education Certificates", PermissionLevel.VIEW_DOWNLOAD);
                mapping.put("Medical Reports", PermissionLevel.NO_ACCESS);
                mapping.put("Birth Certificate", PermissionLevel.VIEW_ONLY);
                break;

            case MINIMAL:
                mapping.put("Education Certificates", PermissionLevel.VIEW_DOWNLOAD);
                break;

            case CUSTOM:
                break;
        }

        return mapping;
    }

    /**
     * Check if user can perform specific action on document
     */
    public void requirePermission(Long documentId, PermissionLevel requiredLevel, String action) {
        Long userId = SecurityUtils.getCurrentUserId();

        if (!canAccessDocument(userId, documentId, requiredLevel)) {
            String message = String.format(
                    "Permission denied: You don't have permission to %s this document", action);
            logger.warn("Permission denied: user={}, document={}, required={}, action={}",
                    userId, documentId, requiredLevel, action);
            throw new PermissionDeniedException(message);
        }
    }

    /**
     * Get all permissions for a document
     */
    public List<DocumentPermission> getDocumentPermissions(Long documentId) {
        requirePermission(documentId, PermissionLevel.FULL_ACCESS, "view permissions for");
        return permissionRepository.findByDocumentId(documentId);
    }

    /**
     * Get all permissions for current user
     */
    public List<DocumentPermission> getMyPermissions() {
        Long userId = SecurityUtils.getCurrentUserId();
        return permissionRepository.findByUserId(userId);
    }

    /**
     * Get category permissions for current user
     */
    public List<CategoryPermission> getMyCategoryPermissions() {
        Long userId = SecurityUtils.getCurrentUserId();
        return categoryPermissionRepository.findByUserId(userId);
    }

    /**
     * Get all documents accessible by current user with permission details
     */
    public List<Map<String, Object>> getAccessibleDocuments() {
        Long userId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        List<Map<String, Object>> accessibleDocs = new ArrayList<>();

        if (currentUser.isPrimaryAccount()) {
            List<Document> allDocs = documentRepository.findAllDocumentsForPrimaryAccount(userId);
            for (Document doc : allDocs) {
                Map<String, Object> docMap = new HashMap<>();
                docMap.put("id", doc.getId());
                docMap.put("filename", doc.getOriginalFilename());
                docMap.put("category", doc.getCategory() != null ? doc.getCategory().getName() : "Others");
                docMap.put("owner", currentUser.getFullName());
                docMap.put("permissionLevel", "FULL_ACCESS");
                docMap.put("canView", true);
                docMap.put("canDownload", true);
                docMap.put("canShare", true);
                docMap.put("hasFullAccess", true);
                accessibleDocs.add(docMap);
            }
        } else {
            List<DocumentPermission> permissions = permissionRepository.findByUserId(userId);
            for (DocumentPermission perm : permissions) {
                Document doc = perm.getDocument();
                Map<String, Object> docMap = new HashMap<>();
                docMap.put("id", doc.getId());
                docMap.put("filename", doc.getOriginalFilename());
                docMap.put("category", doc.getCategory() != null ? doc.getCategory().getName() : "Others");
                docMap.put("owner", doc.getUser().getFullName());
                docMap.put("permissionLevel", perm.getPermissionLevel().name());
                docMap.put("canView", true);
                docMap.put("canDownload", perm.getPermissionLevel().ordinal() >= PermissionLevel.VIEW_DOWNLOAD.ordinal());
                docMap.put("canShare", perm.getPermissionLevel().ordinal() >= PermissionLevel.VIEW_DOWNLOAD_SHARE.ordinal());
                docMap.put("hasFullAccess", perm.getPermissionLevel() == PermissionLevel.FULL_ACCESS);
                accessibleDocs.add(docMap);
            }
        }

        return accessibleDocs;
    }

    /**
     * Update document permission level.
     */
    @Transactional
    public Map<String, Object> updateDocumentPermission(Long permissionId, PermissionLevel newLevel) {
        DocumentPermission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", permissionId));

        permission.setPermissionLevel(newLevel);
        permission.setUpdatedAt(LocalDateTime.now());
        permission = permissionRepository.save(permission);

        Map<String, Object> dto = new HashMap<>();
        dto.put("id", permission.getId());
        dto.put("documentId", permission.getDocument().getId());
        dto.put("documentName", permission.getDocument().getOriginalFilename());
        if (permission.getDocument().getCategory() != null) {
            dto.put("categoryName", permission.getDocument().getCategory().getName());
        }
        dto.put("userId", permission.getUser().getId());
        dto.put("userEmail", permission.getUser().getEmail());
        dto.put("userFullName", permission.getUser().getFullName());
        dto.put("permissionLevel", permission.getPermissionLevel().toString());
        dto.put("grantedAt", permission.getGrantedAt());
        dto.put("updatedAt", permission.getUpdatedAt());
        dto.put("grantedBy", permission.getGrantedBy() != null ? permission.getGrantedBy().getId() : null);
        return dto;
    }

    /**
     * Delete document permission
     */
    @Transactional
    public void deleteDocumentPermission(Long permissionId) {
        DocumentPermission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Permission", "id", permissionId));
        permissionRepository.delete(permission);
        logger.info("Deleted document permission: id={}", permissionId);
    }

    /**
     * Get all document permissions granted BY the current primary-account user.
     *
     * FIX v2.0: Replaced findAll().stream().filter() with targeted repository query.
     * findAll() on large tables is a serious performance issue in production.
     * The repository must have: findByGrantedByIdOrDocumentUserId(Long, Long)
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getGrantedDocumentPermissions() {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        // FIX: Use targeted query instead of findAll().stream().filter()
        List<DocumentPermission> permissions =
                permissionRepository.findByGrantedByIdOrDocumentUserId(currentUserId, currentUserId);

        return permissions.stream()
                .map(perm -> {
                    Map<String, Object> dto = new HashMap<>();
                    dto.put("id", perm.getId());
                    dto.put("permissionLevel", perm.getPermissionLevel() != null ? perm.getPermissionLevel().toString() : null);
                    dto.put("grantedAt", perm.getGrantedAt());
                    dto.put("updatedAt", perm.getUpdatedAt());
                    if (perm.getDocument() != null) {
                        dto.put("documentId", perm.getDocument().getId());
                        dto.put("documentName", perm.getDocument().getOriginalFilename());
                        if (perm.getDocument().getCategory() != null) {
                            dto.put("categoryName", perm.getDocument().getCategory().getName());
                        }
                    }
                    if (perm.getUser() != null) {
                        dto.put("userId", perm.getUser().getId());
                        dto.put("userEmail", perm.getUser().getEmail());
                        dto.put("userFullName", perm.getUser().getFullName());
                    }
                    if (perm.getGrantedBy() != null) {
                        dto.put("grantedById", perm.getGrantedBy().getId());
                    }
                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Get all category permissions granted BY the current primary-account user.
     *
     * FIX v2.0: Replaced findAll().stream().filter() with targeted repository query.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getGrantedCategoryPermissions() {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        // FIX: Use targeted query instead of findAll().stream().filter()
        List<CategoryPermission> permissions =
                categoryPermissionRepository.findByPrimaryAccountId(currentUserId);

        return permissions.stream()
                .map(perm -> {
                    Map<String, Object> dto = new HashMap<>();
                    dto.put("id", perm.getId());
                    dto.put("createdAt", perm.getCreatedAt());
                    dto.put("updatedAt", perm.getUpdatedAt());
                    if (perm.getDefaultPermissionLevel() != null) {
                        String lvl = perm.getDefaultPermissionLevel().toString();
                        dto.put("defaultPermissionLevel", lvl);
                        dto.put("permissionLevel", lvl);
                    }
                    if (perm.getCategory() != null) {
                        dto.put("categoryId", perm.getCategory().getId());
                        dto.put("categoryName", perm.getCategory().getName());
                        dto.put("categoryIcon", perm.getCategory().getIcon());
                    }
                    if (perm.getUser() != null) {
                        dto.put("userId", perm.getUser().getId());
                        dto.put("userEmail", perm.getUser().getEmail());
                        dto.put("userFullName", perm.getUser().getFullName());
                    }
                    if (perm.getPrimaryAccount() != null) {
                        dto.put("primaryAccountId", perm.getPrimaryAccount().getId());
                    }
                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Grant category permission to family member.
     */
    @Transactional
    public Map<String, Object> grantCategoryPermission(Long categoryId, Long familyMemberId, PermissionLevel level) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        FamilyMember familyMember = familyMemberRepository.findById(familyMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyMember", "id", familyMemberId));

        User targetUser = familyMember.getUser();
        if (targetUser == null) {
            targetUser = familyMember.getPrimaryAccount();
        }

        DocumentCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        CategoryPermission existing = categoryPermissionRepository
                .findByCategoryIdAndPrimaryAccountIdAndUserId(categoryId, currentUserId, targetUser.getId())
                .orElse(null);

        if (existing != null) {
            existing.setDefaultPermissionLevel(level);
            existing.setUpdatedAt(LocalDateTime.now());
            existing = categoryPermissionRepository.save(existing);
        } else {
            CategoryPermission permission = new CategoryPermission();
            permission.setCategory(category);
            permission.setPrimaryAccount(currentUser);
            permission.setUser(targetUser);
            permission.setDefaultPermissionLevel(level);
            permission.setCreatedBy(currentUser);
            permission.setUpdatedAt(LocalDateTime.now());
            existing = categoryPermissionRepository.save(permission);
        }

        Map<String, Object> dto = new HashMap<>();
        dto.put("id", existing.getId());
        dto.put("categoryId", existing.getCategory().getId());
        dto.put("categoryName", existing.getCategory().getName());
        dto.put("categoryIcon", existing.getCategory().getIcon());
        dto.put("userId", existing.getUser().getId());
        dto.put("userEmail", existing.getUser().getEmail());
        dto.put("userFullName", existing.getUser().getFullName());
        dto.put("defaultPermissionLevel", existing.getDefaultPermissionLevel().toString());
        dto.put("permissionLevel", existing.getDefaultPermissionLevel().toString());
        dto.put("createdAt", existing.getCreatedAt());
        dto.put("updatedAt", existing.getUpdatedAt());
        if (existing.getPrimaryAccount() != null) {
            dto.put("primaryAccountId", existing.getPrimaryAccount().getId());
        }
        return dto;
    }

    /**
     * Update category permission level.
     */
    @Transactional
    public Map<String, Object> updateCategoryPermission(Long permissionId, PermissionLevel newLevel) {
        CategoryPermission permission = categoryPermissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("CategoryPermission", "id", permissionId));

        permission.setDefaultPermissionLevel(newLevel);
        permission.setUpdatedAt(LocalDateTime.now());
        permission = categoryPermissionRepository.save(permission);

        Map<String, Object> dto = new HashMap<>();
        dto.put("id", permission.getId());
        dto.put("categoryId", permission.getCategory().getId());
        dto.put("categoryName", permission.getCategory().getName());
        dto.put("categoryIcon", permission.getCategory().getIcon());
        dto.put("userId", permission.getUser().getId());
        dto.put("userEmail", permission.getUser().getEmail());
        dto.put("userFullName", permission.getUser().getFullName());
        dto.put("defaultPermissionLevel", permission.getDefaultPermissionLevel().toString());
        dto.put("permissionLevel", permission.getDefaultPermissionLevel().toString());
        dto.put("createdAt", permission.getCreatedAt());
        dto.put("updatedAt", permission.getUpdatedAt());
        if (permission.getPrimaryAccount() != null) {
            dto.put("primaryAccountId", permission.getPrimaryAccount().getId());
        }
        return dto;
    }

    /**
     * Delete category permission
     */
    @Transactional
    public void deleteCategoryPermission(Long permissionId) {
        CategoryPermission permission = categoryPermissionRepository.findById(permissionId)
                .orElseThrow(() -> new ResourceNotFoundException("CategoryPermission", "id", permissionId));
        categoryPermissionRepository.delete(permission);
        logger.info("Deleted category permission: id={}", permissionId);
    }

    /**
     * Expire old permissions (scheduled task)
     */
    @Transactional
    public int expireOldPermissions() {
        int expired = permissionRepository.expireOldPermissions();
        logger.info("Expired {} old permissions", expired);
        return expired;
    }
}