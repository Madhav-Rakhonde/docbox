package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.enums.PermissionLevel;
import com.docbox.service.BulkOperationsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Bulk Operations Controller
 * Handles bulk operations on multiple documents
 */
@RestController
@RequestMapping("/api/bulk")
public class BulkOperationsController {

    @Autowired
    private BulkOperationsService bulkOperationsService;

    /**
     * Bulk download documents as ZIP
     * POST /api/bulk/download-zip
     */
    @PostMapping("/download-zip")
    public ResponseEntity<Resource> bulkDownloadAsZip(
            @RequestBody Map<String, List<Long>> request) {

        List<Long> documentIds = request.get("documentIds");

        byte[] zipBytes = bulkOperationsService.bulkDownloadAsZip(documentIds);
        ByteArrayResource resource = new ByteArrayResource(zipBytes);

        String filename = "documents_" + LocalDate.now() + ".zip";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(zipBytes.length)
                .body(resource);
    }

    /**
     * Bulk delete documents
     * POST /api/bulk/delete
     */
    @PostMapping("/delete")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkDelete(
            @RequestBody Map<String, List<Long>> request) {

        List<Long> documentIds = request.get("documentIds");

        Map<String, Object> result = bulkOperationsService.bulkDelete(documentIds);

        return ResponseEntity.ok(ApiResponse.success(
                "Bulk delete completed", result));
    }

    /**
     * Bulk update category
     * POST /api/bulk/update-category
     */
    @PostMapping("/update-category")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkUpdateCategory(
            @RequestBody Map<String, Object> request) {

        @SuppressWarnings("unchecked")
        List<Long> documentIds = (List<Long>) request.get("documentIds");
        Long categoryId = Long.parseLong(request.get("categoryId").toString());

        Map<String, Object> result = bulkOperationsService.bulkUpdateCategory(documentIds, categoryId);

        return ResponseEntity.ok(ApiResponse.success(
                "Bulk category update completed", result));
    }

    /**
     * Bulk update permissions
     * POST /api/bulk/update-permissions
     */
    @PostMapping("/update-permissions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkUpdatePermissions(
            @RequestBody Map<String, Object> request) {

        @SuppressWarnings("unchecked")
        List<Long> documentIds = (List<Long>) request.get("documentIds");
        Long userId = Long.parseLong(request.get("userId").toString());
        PermissionLevel permissionLevel = PermissionLevel.valueOf(request.get("permissionLevel").toString());

        Map<String, Object> result = bulkOperationsService.bulkUpdatePermissions(
                documentIds, userId, permissionLevel);

        return ResponseEntity.ok(ApiResponse.success(
                "Bulk permissions update completed", result));
    }

    /**
     * Bulk mark as favorite
     * POST /api/bulk/mark-favorite
     */
    @PostMapping("/mark-favorite")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkMarkFavorite(
            @RequestBody Map<String, Object> request) {

        @SuppressWarnings("unchecked")
        List<Long> documentIds = (List<Long>) request.get("documentIds");
        boolean favorite = Boolean.parseBoolean(request.get("favorite").toString());

        Map<String, Object> result = bulkOperationsService.bulkMarkFavorite(documentIds, favorite);

        return ResponseEntity.ok(ApiResponse.success(
                "Bulk favorite update completed", result));
    }

    /**
     * Bulk archive documents
     * POST /api/bulk/archive
     */
    @PostMapping("/archive")
    public ResponseEntity<ApiResponse<Map<String, Object>>> bulkArchive(
            @RequestBody Map<String, Object> request) {

        @SuppressWarnings("unchecked")
        List<Long> documentIds = (List<Long>) request.get("documentIds");
        boolean archive = Boolean.parseBoolean(request.get("archive").toString());

        Map<String, Object> result = bulkOperationsService.bulkArchive(documentIds, archive);

        return ResponseEntity.ok(ApiResponse.success(
                "Bulk archive completed", result));
    }
}