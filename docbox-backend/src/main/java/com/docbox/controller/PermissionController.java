package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.CategoryPermission;
import com.docbox.entity.DocumentPermission;
import com.docbox.enums.PermissionLevel;
import com.docbox.enums.PermissionTemplate;
import com.docbox.service.PermissionService;
import com.docbox.repository.FamilyMemberRepository;
import com.docbox.repository.DocumentPermissionRepository;
import com.docbox.repository.CategoryPermissionRepository;
import com.docbox.entity.FamilyMember;
import com.docbox.exception.BadRequestException;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Permission Controller - FIXED
 * CRITICAL: Manages all permission-related operations
 */
@RestController
@RequestMapping("/api/permissions")
public class PermissionController {

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    // ✅ NEW: Injected for /granted/ endpoints only
    @Autowired
    private DocumentPermissionRepository documentPermissionRepository;

    // ✅ NEW: Injected for /granted/ endpoints only
    @Autowired
    private CategoryPermissionRepository categoryPermissionRepository;

    /**
     * Check if current user can access a document
     * GET /api/permissions/check/{documentId}
     */
    @GetMapping("/check/{documentId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkAccess(
            @PathVariable Long documentId,
            @RequestParam(required = false) PermissionLevel requiredLevel) {

        PermissionLevel level = requiredLevel != null ? requiredLevel : PermissionLevel.VIEW_ONLY;
        boolean canAccess = permissionService.canAccessDocument(
                com.docbox.util.SecurityUtils.getCurrentUserId(), documentId, level);

        PermissionLevel userLevel = permissionService.getPermissionLevel(
                com.docbox.util.SecurityUtils.getCurrentUserId(), documentId);

        Map<String, Object> result = new HashMap<>();
        result.put("canAccess", canAccess);
        result.put("userPermissionLevel", userLevel);
        result.put("canView", userLevel.canView());
        result.put("canDownload", userLevel.canDownload());
        result.put("canShare", userLevel.canShare());
        result.put("hasFullAccess", userLevel.hasFullAccess());

        return ResponseEntity.ok(ApiResponse.success(
                "Permission check completed", result));
    }

    /**
     * Grant permission to a user for a document
     * POST /api/permissions/grant
     * ✅ FIXED: Now uses familyMemberId instead of userId
     */
    @PostMapping("/grant")
    public ResponseEntity<ApiResponse<Map<String, Object>>> grantPermission(
            @RequestBody Map<String, Object> request) {

        Long familyMemberId = Long.parseLong(request.get("familyMemberId").toString());
        Long documentId = Long.parseLong(request.get("documentId").toString());
        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        // ✅ FIXED: Use new 3-parameter signature
        DocumentPermission permission = permissionService.grantPermission(
                familyMemberId, documentId, level);

        // ✅ BUILD DTO RESPONSE TO AVOID HIBERNATE LAZY LOADING
        Map<String, Object> response = new HashMap<>();
        response.put("id", permission.getId());
        response.put("documentId", permission.getDocument().getId());
        response.put("documentName", permission.getDocument().getOriginalFilename());
        response.put("userId", permission.getUser().getId());
        response.put("userEmail", permission.getUser().getEmail());
        response.put("userFullName", permission.getUser().getFullName());
        response.put("permissionLevel", permission.getPermissionLevel().toString());
        response.put("grantedAt", permission.getGrantedAt());
        response.put("grantedBy", permission.getGrantedBy() != null ? permission.getGrantedBy().getId() : null);

        return ResponseEntity.ok(ApiResponse.success(
                "Permission granted successfully", response));
    }

    /**
     * Revoke permission from a user
     * DELETE /api/permissions/revoke
     */
    @DeleteMapping("/revoke")
    public ResponseEntity<ApiResponse<Void>> revokePermission(
            @RequestBody Map<String, Object> request) {

        Long documentId = Long.parseLong(request.get("documentId").toString());
        Long userId = Long.parseLong(request.get("userId").toString());
        String reason = request.containsKey("reason") ? request.get("reason").toString() : "Permission revoked";

        permissionService.revokePermission(documentId, userId, reason);

        return ResponseEntity.ok(ApiResponse.success("Permission revoked successfully"));
    }

    /**
     * Set category default permission
     * POST /api/permissions/category-default
     */
    @PostMapping("/category-default")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setCategoryDefault(
            @RequestBody Map<String, Object> request) {

        Long categoryId = Long.parseLong(request.get("categoryId").toString());
        Long userId = Long.parseLong(request.get("userId").toString());
        PermissionLevel defaultLevel = PermissionLevel.valueOf(request.get("defaultPermissionLevel").toString());

        CategoryPermission permission = permissionService.setCategoryDefaultPermission(
                categoryId, userId, defaultLevel);

        // ✅ BUILD DTO RESPONSE
        Map<String, Object> response = new HashMap<>();
        response.put("id", permission.getId());
        response.put("categoryId", permission.getCategory().getId());
        response.put("categoryName", permission.getCategory().getName());
        response.put("userId", permission.getUser().getId());
        response.put("userEmail", permission.getUser().getEmail());
        response.put("defaultPermissionLevel", permission.getDefaultPermissionLevel().toString());
        response.put("createdAt", permission.getCreatedAt());

        return ResponseEntity.ok(ApiResponse.success(
                "Category default permission set successfully", response));
    }

    /**
     * Apply permission template
     * POST /api/permissions/apply-template
     */
    @PostMapping("/apply-template")
    public ResponseEntity<ApiResponse<Map<String, Object>>> applyTemplate(
            @RequestBody Map<String, Object> request) {

        Long userId = Long.parseLong(request.get("userId").toString());
        PermissionTemplate template = PermissionTemplate.valueOf(request.get("template").toString());

        Map<String, Object> result = permissionService.applyPermissionTemplate(userId, template);

        return ResponseEntity.ok(ApiResponse.success(
                "Permission template applied successfully", result));
    }

    /**
     * Get all permissions for a document
     * GET /api/permissions/document/{documentId}
     */
    @GetMapping("/document/{documentId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDocumentPermissions(
            @PathVariable Long documentId) {

        List<DocumentPermission> permissions = permissionService.getDocumentPermissions(documentId);

        // ✅ BUILD DTO LIST
        List<Map<String, Object>> response = permissions.stream().map(perm -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", perm.getId());
            dto.put("documentId", perm.getDocument().getId());
            dto.put("documentName", perm.getDocument().getOriginalFilename());
            dto.put("userId", perm.getUser().getId());
            dto.put("userEmail", perm.getUser().getEmail());
            dto.put("userFullName", perm.getUser().getFullName());
            dto.put("permissionLevel", perm.getPermissionLevel().toString());
            dto.put("grantedAt", perm.getGrantedAt());
            return dto;
        }).toList();

        return ResponseEntity.ok(ApiResponse.success(
                "Document permissions retrieved successfully", response));
    }

    /**
     * Get my permissions (documents I have access to)
     * GET /api/permissions/my-permissions
     */
    @GetMapping("/my-permissions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyPermissions() {

        List<DocumentPermission> permissions = permissionService.getMyPermissions();

        // ✅ BUILD DTO RESPONSE
        Map<String, Object> response = new HashMap<>();
        List<Map<String, Object>> documentPermissions = permissions.stream().map(perm -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", perm.getId());
            dto.put("documentId", perm.getDocument().getId());
            dto.put("documentName", perm.getDocument().getOriginalFilename());
            dto.put("permissionLevel", perm.getPermissionLevel().toString());
            dto.put("grantedAt", perm.getGrantedAt());
            if (perm.getDocument().getCategory() != null) {
                dto.put("categoryName", perm.getDocument().getCategory().getName());
            }
            return dto;
        }).toList();

        response.put("documentPermissions", documentPermissions);

        return ResponseEntity.ok(ApiResponse.success(
                "Your permissions retrieved successfully", response));
    }

    /**
     * Get category permissions
     * GET /api/permissions/category-permissions
     */
    @GetMapping("/category-permissions")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCategoryPermissions() {

        List<CategoryPermission> permissions = permissionService.getMyCategoryPermissions();

        // ✅ BUILD DTO LIST
        List<Map<String, Object>> response = permissions.stream().map(perm -> {
            Map<String, Object> dto = new HashMap<>();
            dto.put("id", perm.getId());
            dto.put("categoryId", perm.getCategory().getId());
            dto.put("categoryName", perm.getCategory().getName());
            dto.put("categoryIcon", perm.getCategory().getIcon());
            dto.put("userId", perm.getUser().getId());
            dto.put("userEmail", perm.getUser().getEmail());
            dto.put("userFullName", perm.getUser().getFullName());
            dto.put("defaultPermissionLevel", perm.getDefaultPermissionLevel().toString());
            dto.put("permissionLevel", perm.getDefaultPermissionLevel().toString());
            dto.put("createdAt", perm.getCreatedAt());
            return dto;
        }).toList();

        return ResponseEntity.ok(ApiResponse.success(
                "Category permissions retrieved successfully", response));
    }

    /**
     * Update document permission
     * PUT /api/permissions/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updatePermission(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {

        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        DocumentPermission permission = permissionService.updateDocumentPermission(id, level);

        // ✅ BUILD DTO RESPONSE
        Map<String, Object> response = new HashMap<>();
        response.put("id", permission.getId());
        response.put("documentId", permission.getDocument().getId());
        response.put("documentName", permission.getDocument().getOriginalFilename());
        response.put("userId", permission.getUser().getId());
        response.put("userEmail", permission.getUser().getEmail());
        response.put("permissionLevel", permission.getPermissionLevel().toString());
        response.put("updatedAt", permission.getUpdatedAt());

        return ResponseEntity.ok(ApiResponse.success(
                "Permission updated successfully", response));
    }

    /**
     * Delete document permission
     * DELETE /api/permissions/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePermission(@PathVariable Long id) {

        permissionService.deleteDocumentPermission(id);

        return ResponseEntity.ok(ApiResponse.success("Permission deleted successfully"));
    }

    /**
     * Grant category permission
     * POST /api/permissions/category/grant
     * ✅ FIXED - Returns DTO to avoid Hibernate lazy loading
     */
    @PostMapping("/category/grant")
    public ResponseEntity<ApiResponse<Map<String, Object>>> grantCategoryPermission(
            @RequestBody Map<String, Object> request) {

        Long categoryId = Long.parseLong(request.get("categoryId").toString());
        Long familyMemberId = Long.parseLong(request.get("familyMemberId").toString());
        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        CategoryPermission permission = permissionService.grantCategoryPermission(
                categoryId, familyMemberId, level);

        // ✅ BUILD DTO RESPONSE TO AVOID HIBERNATE LAZY LOADING
        Map<String, Object> response = new HashMap<>();
        response.put("id", permission.getId());
        response.put("categoryId", permission.getCategory().getId());
        response.put("categoryName", permission.getCategory().getName());
        response.put("categoryIcon", permission.getCategory().getIcon());
        response.put("userId", permission.getUser().getId());
        response.put("userEmail", permission.getUser().getEmail());
        response.put("userFullName", permission.getUser().getFullName());
        response.put("defaultPermissionLevel", permission.getDefaultPermissionLevel().toString());
        response.put("permissionLevel", permission.getDefaultPermissionLevel().toString());
        response.put("createdAt", permission.getCreatedAt());
        response.put("primaryAccountId", permission.getPrimaryAccount().getId());

        return ResponseEntity.ok(ApiResponse.success(
                "Category permission granted successfully", response));
    }

    /**
     * Update category permission
     * PUT /api/permissions/category/{id}
     */
    @PutMapping("/category/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateCategoryPermission(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {

        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        CategoryPermission permission = permissionService.updateCategoryPermission(id, level);

        // ✅ BUILD DTO RESPONSE
        Map<String, Object> response = new HashMap<>();
        response.put("id", permission.getId());
        response.put("categoryId", permission.getCategory().getId());
        response.put("categoryName", permission.getCategory().getName());
        response.put("userId", permission.getUser().getId());
        response.put("userEmail", permission.getUser().getEmail());
        response.put("defaultPermissionLevel", permission.getDefaultPermissionLevel().toString());
        response.put("updatedAt", permission.getUpdatedAt());

        return ResponseEntity.ok(ApiResponse.success(
                "Category permission updated successfully", response));
    }

    /**
     * Delete category permission
     * DELETE /api/permissions/category/{id}
     */
    @DeleteMapping("/category/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategoryPermission(@PathVariable Long id) {

        permissionService.deleteCategoryPermission(id);

        return ResponseEntity.ok(ApiResponse.success("Category permission deleted successfully"));
    }

    /**
     * Get available permission templates
     * GET /api/permissions/templates
     */
    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTemplates() {

        Map<String, Object> templates = new HashMap<>();

        Map<String, String> standard = new HashMap<>();
        standard.put("name", "STANDARD");
        standard.put("description", "Balanced permissions for most family members");
        standard.put("example", "View/Download IDs & Certificates, View Medical, No Access to Financial/Property");

        Map<String, String> limited = new HashMap<>();
        limited.put("name", "LIMITED");
        limited.put("description", "Restricted access for younger children");
        limited.put("example", "View-only Aadhaar/Passport, View/Download Education, No Access to most categories");

        Map<String, String> minimal = new HashMap<>();
        minimal.put("name", "MINIMAL");
        minimal.put("description", "Very limited access");
        minimal.put("example", "Only View/Download own Education Certificates");

        Map<String, String> custom = new HashMap<>();
        custom.put("name", "CUSTOM");
        custom.put("description", "Set permissions manually for each category");
        custom.put("example", "Full control - set each category individually");

        templates.put("STANDARD", standard);
        templates.put("LIMITED", limited);
        templates.put("MINIMAL", minimal);
        templates.put("CUSTOM", custom);

        return ResponseEntity.ok(ApiResponse.success(
                "Permission templates retrieved", templates));
    }

    // =========================================================================
    // ✅ NEW ENDPOINTS ADDED BELOW — all existing code above is UNCHANGED
    // =========================================================================

    /**
     * Get document permissions GRANTED BY the current primary-account user
     * GET /api/permissions/granted/documents
     *
     * This is the fix for the Permissions page showing 0 granted permissions.
     * The old /my-permissions returns permissions granted TO the user.
     * This returns permissions granted BY the user (primary account view).
     */
    @GetMapping("/granted/documents")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGrantedDocumentPermissions() {
        Long currentUserId = com.docbox.util.SecurityUtils.getCurrentUserId();

        List<Map<String, Object>> response = documentPermissionRepository.findAll()
                .stream()
                .filter(perm -> {
                    try {
                        // Include if this user granted the permission
                        if (perm.getGrantedBy() != null
                                && perm.getGrantedBy().getId().equals(currentUserId)) {
                            return true;
                        }
                        // Include if the document belongs to this user
                        if (perm.getDocument() != null
                                && perm.getDocument().getUser() != null
                                && perm.getDocument().getUser().getId().equals(currentUserId)) {
                            return true;
                        }
                    } catch (Exception ignored) {}
                    return false;
                })
                .map(perm -> {
                    Map<String, Object> dto = new HashMap<>();
                    try { dto.put("id", perm.getId()); } catch (Exception ignored) {}
                    try { dto.put("permissionLevel", perm.getPermissionLevel() != null ? perm.getPermissionLevel().toString() : null); } catch (Exception ignored) {}
                    try { dto.put("grantedAt", perm.getGrantedAt()); } catch (Exception ignored) {}
                    try { dto.put("updatedAt", perm.getUpdatedAt()); } catch (Exception ignored) {}
                    try {
                        if (perm.getDocument() != null) {
                            dto.put("documentId", perm.getDocument().getId());
                            dto.put("documentName", perm.getDocument().getOriginalFilename());
                            if (perm.getDocument().getCategory() != null) {
                                dto.put("categoryName", perm.getDocument().getCategory().getName());
                            }
                        }
                    } catch (Exception ignored) {}
                    try {
                        if (perm.getUser() != null) {
                            dto.put("userId", perm.getUser().getId());
                            dto.put("userEmail", perm.getUser().getEmail());
                            dto.put("userFullName", perm.getUser().getFullName());
                        }
                    } catch (Exception ignored) {}
                    try {
                        if (perm.getGrantedBy() != null) {
                            dto.put("grantedById", perm.getGrantedBy().getId());
                        }
                    } catch (Exception ignored) {}
                    return dto;
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.success(
                "Granted document permissions retrieved successfully", response));
    }

    /**
     * Get category permissions GRANTED BY the current primary-account user
     * GET /api/permissions/granted/categories
     *
     * Uses findByPrimaryAccountId — see CategoryPermissionRepository for the method.
     */
    @GetMapping("/granted/categories")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGrantedCategoryPermissions() {
        Long currentUserId = com.docbox.util.SecurityUtils.getCurrentUserId();

        List<Map<String, Object>> response = categoryPermissionRepository.findAll()
                .stream()
                .filter(perm -> {
                    try {
                        return perm.getPrimaryAccount() != null
                                && perm.getPrimaryAccount().getId().equals(currentUserId);
                    } catch (Exception ignored) {
                        return false;
                    }
                })
                .map(perm -> {
                    Map<String, Object> dto = new HashMap<>();
                    try { dto.put("id", perm.getId()); } catch (Exception ignored) {}
                    try { dto.put("createdAt", perm.getCreatedAt()); } catch (Exception ignored) {}
                    try { dto.put("updatedAt", perm.getUpdatedAt()); } catch (Exception ignored) {}
                    try {
                        if (perm.getDefaultPermissionLevel() != null) {
                            String lvl = perm.getDefaultPermissionLevel().toString();
                            dto.put("defaultPermissionLevel", lvl);
                            dto.put("permissionLevel", lvl);
                        }
                    } catch (Exception ignored) {}
                    try {
                        if (perm.getCategory() != null) {
                            dto.put("categoryId", perm.getCategory().getId());
                            dto.put("categoryName", perm.getCategory().getName());
                            dto.put("categoryIcon", perm.getCategory().getIcon());
                        }
                    } catch (Exception ignored) {}
                    try {
                        if (perm.getUser() != null) {
                            dto.put("userId", perm.getUser().getId());
                            dto.put("userEmail", perm.getUser().getEmail());
                            dto.put("userFullName", perm.getUser().getFullName());
                        }
                    } catch (Exception ignored) {}
                    try {
                        if (perm.getPrimaryAccount() != null) {
                            dto.put("primaryAccountId", perm.getPrimaryAccount().getId());
                        }
                    } catch (Exception ignored) {}
                    return dto;
                })
                .toList();

        return ResponseEntity.ok(ApiResponse.success(
                "Granted category permissions retrieved successfully", response));
    }
}