package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.CategoryPermission;
import com.docbox.entity.DocumentPermission;
import com.docbox.enums.PermissionLevel;
import com.docbox.enums.PermissionTemplate;
import com.docbox.service.PermissionService;
import com.docbox.repository.FamilyMemberRepository;
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
    public ResponseEntity<ApiResponse<DocumentPermission>> grantPermission(
            @RequestBody Map<String, Object> request) {

        Long familyMemberId = Long.parseLong(request.get("familyMemberId").toString());
        Long documentId = Long.parseLong(request.get("documentId").toString());
        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        // ✅ FIXED: Use new 3-parameter signature
        DocumentPermission permission = permissionService.grantPermission(
                familyMemberId, documentId, level);

        return ResponseEntity.ok(ApiResponse.success(
                "Permission granted successfully", permission));
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
    public ResponseEntity<ApiResponse<CategoryPermission>> setCategoryDefault(
            @RequestBody Map<String, Object> request) {

        Long categoryId = Long.parseLong(request.get("categoryId").toString());
        Long userId = Long.parseLong(request.get("userId").toString());
        PermissionLevel defaultLevel = PermissionLevel.valueOf(request.get("defaultPermissionLevel").toString());

        CategoryPermission permission = permissionService.setCategoryDefaultPermission(
                categoryId, userId, defaultLevel);

        return ResponseEntity.ok(ApiResponse.success(
                "Category default permission set successfully", permission));
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
    public ResponseEntity<ApiResponse<List<DocumentPermission>>> getDocumentPermissions(
            @PathVariable Long documentId) {

        List<DocumentPermission> permissions = permissionService.getDocumentPermissions(documentId);

        return ResponseEntity.ok(ApiResponse.success(
                "Document permissions retrieved successfully", permissions));
    }

    /**
     * Get my permissions (documents I have access to)
     * GET /api/permissions/my-permissions
     */
    @GetMapping("/my-permissions")
    public ResponseEntity<ApiResponse<List<DocumentPermission>>> getMyPermissions() {

        List<DocumentPermission> permissions = permissionService.getMyPermissions();

        return ResponseEntity.ok(ApiResponse.success(
                "Your permissions retrieved successfully", permissions));
    }

    /**
     * Get category permissions
     * GET /api/permissions/category-permissions
     */
    @GetMapping("/category-permissions")
    public ResponseEntity<ApiResponse<List<CategoryPermission>>> getCategoryPermissions() {

        List<CategoryPermission> permissions = permissionService.getMyCategoryPermissions();

        return ResponseEntity.ok(ApiResponse.success(
                "Category permissions retrieved successfully", permissions));
    }

    /**
     * Update document permission
     * PUT /api/permissions/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentPermission>> updatePermission(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {

        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        DocumentPermission permission = permissionService.updateDocumentPermission(id, level);

        return ResponseEntity.ok(ApiResponse.success(
                "Permission updated successfully", permission));
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
     * ✅ ALREADY CORRECT - Uses familyMemberId
     */
    @PostMapping("/category/grant")
    public ResponseEntity<ApiResponse<CategoryPermission>> grantCategoryPermission(
            @RequestBody Map<String, Object> request) {

        Long categoryId = Long.parseLong(request.get("categoryId").toString());
        Long familyMemberId = Long.parseLong(request.get("familyMemberId").toString());
        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        CategoryPermission permission = permissionService.grantCategoryPermission(
                categoryId, familyMemberId, level);

        return ResponseEntity.ok(ApiResponse.success(
                "Category permission granted successfully", permission));
    }

    /**
     * Update category permission
     * PUT /api/permissions/category/{id}
     */
    @PutMapping("/category/{id}")
    public ResponseEntity<ApiResponse<CategoryPermission>> updateCategoryPermission(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {

        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        CategoryPermission permission = permissionService.updateCategoryPermission(id, level);

        return ResponseEntity.ok(ApiResponse.success(
                "Category permission updated successfully", permission));
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
}