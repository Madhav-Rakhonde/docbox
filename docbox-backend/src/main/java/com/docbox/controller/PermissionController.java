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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Permission Controller
 *
 * FIX v2.0:
 *   setCategoryDefault() was building the response DTO *outside* the @Transactional
 *   boundary by accessing lazy-loaded associations on the returned CategoryPermission entity.
 *   This caused LazyInitializationException at runtime because the Hibernate session
 *   was already closed when the controller called permission.getCategory().getName() etc.
 *
 *   Fix: delegate to PermissionService.grantCategoryPermission() which already returns
 *   a safe Map DTO built inside its own @Transactional session.  All other endpoints
 *   are unchanged.
 */
@RestController
@RequestMapping("/api/permissions")
public class PermissionController {

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private DocumentPermissionRepository documentPermissionRepository;

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

        return ResponseEntity.ok(ApiResponse.success("Permission check completed", result));
    }

    /**
     * Grant permission to a user for a document
     * POST /api/permissions/grant
     */
    @PostMapping("/grant")
    public ResponseEntity<ApiResponse<Map<String, Object>>> grantPermission(
            @RequestBody Map<String, Object> request) {

        Long familyMemberId = Long.parseLong(request.get("familyMemberId").toString());
        Long documentId = Long.parseLong(request.get("documentId").toString());
        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        Map<String, Object> response = permissionService.grantPermission(familyMemberId, documentId, level);

        return ResponseEntity.ok(ApiResponse.success("Permission granted successfully", response));
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
     *
     * FIX v2.0: Previously called setCategoryDefaultPermission() which returns a
     * CategoryPermission entity, then accessed its lazy associations outside the
     * transaction — causing LazyInitializationException.
     *
     * Fix: delegate to grantCategoryPermission() which returns a safe Map DTO
     * built inside @Transactional, then look up familyMemberId from userId.
     *
     * NOTE: This endpoint accepts userId (not familyMemberId) for backwards compatibility.
     * It looks up the FamilyMember record for that user and delegates to the safe path.
     */
    @PostMapping("/category-default")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setCategoryDefault(
            @RequestBody Map<String, Object> request) {

        Long categoryId = Long.parseLong(request.get("categoryId").toString());
        Long userId = Long.parseLong(request.get("userId").toString());
        PermissionLevel defaultLevel = PermissionLevel.valueOf(request.get("defaultPermissionLevel").toString());

        // Look up the FamilyMember for this userId so we can delegate to grantCategoryPermission()
        // which returns a safe DTO and avoids LazyInitializationException
        FamilyMember familyMember = familyMemberRepository.findByUserId(userId)
                .orElse(null);

        Map<String, Object> response;
        if (familyMember != null) {
            // Use the safe grantCategoryPermission path (DTO built inside @Transactional)
            response = permissionService.grantCategoryPermission(categoryId, familyMember.getId(), defaultLevel);
        } else {
            // FamilyMember record not found for this userId — fall back to the original
            // setCategoryDefaultPermission but build the DTO here inside a fresh call
            // that delegates to the service (which still has @Transactional protection).
            // This path handles edge cases like primary-account self-permissions.
            CategoryPermission permission = permissionService.setCategoryDefaultPermission(
                    categoryId, userId, defaultLevel);

            // Build DTO here — within the same request thread but outside the
            // setCategoryDefaultPermission transaction. To avoid lazy-load issues,
            // we call updateCategoryPermission or just build a minimal safe response.
            response = new HashMap<>();
            response.put("id", permission.getId());
            response.put("categoryId", categoryId);
            response.put("userId", userId);
            response.put("defaultPermissionLevel", defaultLevel.toString());
            response.put("permissionLevel", defaultLevel.toString());
        }

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
        Map<String, Object> response = permissionService.updateDocumentPermission(id, level);

        return ResponseEntity.ok(ApiResponse.success("Permission updated successfully", response));
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
     */
    @PostMapping("/category/grant")
    public ResponseEntity<ApiResponse<Map<String, Object>>> grantCategoryPermission(
            @RequestBody Map<String, Object> request) {

        Long categoryId = Long.parseLong(request.get("categoryId").toString());
        Long familyMemberId = Long.parseLong(request.get("familyMemberId").toString());
        PermissionLevel level = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        Map<String, Object> response = permissionService.grantCategoryPermission(
                categoryId, familyMemberId, level);

        return ResponseEntity.ok(ApiResponse.success("Category permission granted successfully", response));
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
        Map<String, Object> response = permissionService.updateCategoryPermission(id, level);

        return ResponseEntity.ok(ApiResponse.success("Category permission updated successfully", response));
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

        return ResponseEntity.ok(ApiResponse.success("Permission templates retrieved", templates));
    }

    /**
     * Get document permissions GRANTED BY the current primary-account user
     * GET /api/permissions/granted/documents
     */
    @GetMapping("/granted/documents")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGrantedDocumentPermissions() {
        List<Map<String, Object>> response = permissionService.getGrantedDocumentPermissions();
        return ResponseEntity.ok(ApiResponse.success(
                "Granted document permissions retrieved successfully", response));
    }

    /**
     * Get category permissions GRANTED BY the current primary-account user
     * GET /api/permissions/granted/categories
     */
    @GetMapping("/granted/categories")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGrantedCategoryPermissions() {
        List<Map<String, Object>> response = permissionService.getGrantedCategoryPermissions();
        return ResponseEntity.ok(ApiResponse.success(
                "Granted category permissions retrieved successfully", response));
    }
}