package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.Document;
import com.docbox.service.OfflineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Offline Controller
 * Manages offline document access for PWA
 */
@RestController
@RequestMapping("/api/offline")
public class OfflineController {

    @Autowired
    private OfflineService offlineService;

    /**
     * Mark document for offline access
     * POST /api/offline/mark/{documentId}
     */
    @PostMapping("/mark/{documentId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markForOffline(
            @PathVariable Long documentId) {

        Document document = offlineService.markForOfflineAccess(documentId);

        Map<String, Object> response = new HashMap<>();
        response.put("documentId", document.getId());
        response.put("filename", document.getOriginalFilename());
        response.put("isOfflineAvailable", document.getIsOfflineAvailable());
        response.put("lastSynced", document.getOfflineLastSyncedAt());

        return ResponseEntity.ok(ApiResponse.success(
                "Document marked for offline access", response));
    }

    /**
     * Remove document from offline access
     * DELETE /api/offline/remove/{documentId}
     */
    @DeleteMapping("/remove/{documentId}")
    public ResponseEntity<ApiResponse<Void>> removeFromOffline(
            @PathVariable Long documentId) {

        offlineService.removeFromOfflineAccess(documentId);

        return ResponseEntity.ok(ApiResponse.success(
                "Document removed from offline access"));
    }

    /**
     * Get all offline-available documents
     * GET /api/offline/documents
     */
    @GetMapping("/documents")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getOfflineDocuments() {

        List<Map<String, Object>> documents = offlineService.getOfflineDocuments();

        return ResponseEntity.ok(ApiResponse.success(
                "Offline documents retrieved successfully", documents));
    }

    /**
     * Get offline manifest for PWA
     * GET /api/offline/manifest
     */
    @GetMapping("/manifest")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getOfflineManifest() {

        Map<String, Object> manifest = offlineService.getOfflineManifest();

        return ResponseEntity.ok(ApiResponse.success(
                "Offline manifest generated successfully", manifest));
    }

    /**
     * Auto-mark important documents for offline
     * POST /api/offline/auto-mark
     */
    @PostMapping("/auto-mark")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> autoMarkImportantDocuments() {

        int markedCount = offlineService.autoMarkImportantDocuments();

        Map<String, Integer> response = new HashMap<>();
        response.put("documentsMarked", markedCount);

        return ResponseEntity.ok(ApiResponse.success(
                markedCount + " important documents marked for offline access", response));
    }

    /**
     * Get sync status
     * GET /api/offline/sync-status
     */
    @GetMapping("/sync-status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSyncStatus() {

        Map<String, Object> status = offlineService.getSyncStatus();

        return ResponseEntity.ok(ApiResponse.success(
                "Sync status retrieved successfully", status));
    }

    /**
     * Bulk mark documents for offline
     * POST /api/offline/bulk-mark
     */
    @PostMapping("/bulk-mark")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> bulkMarkForOffline(
            @RequestBody Map<String, List<Long>> request) {

        List<Long> documentIds = request.get("documentIds");
        int markedCount = offlineService.bulkMarkForOffline(documentIds);

        Map<String, Integer> response = new HashMap<>();
        response.put("documentsMarked", markedCount);

        return ResponseEntity.ok(ApiResponse.success(
                markedCount + " documents marked for offline access", response));
    }

    /**
     * Bulk remove documents from offline
     * POST /api/offline/bulk-remove
     */
    @PostMapping("/bulk-remove")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> bulkRemoveFromOffline(
            @RequestBody Map<String, List<Long>> request) {

        List<Long> documentIds = request.get("documentIds");
        int removedCount = offlineService.bulkRemoveFromOffline(documentIds);

        Map<String, Integer> response = new HashMap<>();
        response.put("documentsRemoved", removedCount);

        return ResponseEntity.ok(ApiResponse.success(
                removedCount + " documents removed from offline access", response));
    }
}