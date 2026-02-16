package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.EmergencyAccessRequest;
import com.docbox.enums.PermissionLevel;
import com.docbox.service.EmergencyAccessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Emergency Access Controller
 * Manages emergency access requests
 */
@RestController
@RequestMapping("/api/emergency-access")
public class EmergencyAccessController {

    @Autowired
    private EmergencyAccessService emergencyAccessService;

    /**
     * Create emergency access request
     * POST /api/emergency-access/request
     */
    @PostMapping("/request")
    public ResponseEntity<ApiResponse<EmergencyAccessRequest>> createRequest(
            @RequestBody Map<String, Object> request) {

        Long documentId = Long.parseLong(request.get("documentId").toString());
        String reason = request.get("reason").toString();

        EmergencyAccessRequest accessRequest = emergencyAccessService.createRequest(
                documentId, reason);

        return ResponseEntity.ok(ApiResponse.success(
                "Emergency access request created successfully. " +
                        "Your primary account will be notified to review.",
                accessRequest));
    }

    /**
     * Review emergency access request (approve/reject)
     * POST /api/emergency-access/review/{requestId}
     */
    @PostMapping("/review/{requestId}")
    public ResponseEntity<ApiResponse<EmergencyAccessRequest>> reviewRequest(
            @PathVariable Long requestId,
            @RequestBody Map<String, Object> request) {

        boolean approved = Boolean.parseBoolean(request.get("approved").toString());
        String reviewNotes = request.containsKey("reviewNotes") ?
                request.get("reviewNotes").toString() : null;

        PermissionLevel grantedLevel = null;
        if (approved && request.containsKey("grantedPermissionLevel")) {
            grantedLevel = PermissionLevel.valueOf(request.get("grantedPermissionLevel").toString());
        }

        LocalDateTime expiresAt = null;
        if (approved && request.containsKey("permissionExpiresAt")) {
            expiresAt = LocalDateTime.parse(request.get("permissionExpiresAt").toString());
        }

        EmergencyAccessRequest accessRequest = emergencyAccessService.reviewRequest(
                requestId, approved, reviewNotes, grantedLevel, expiresAt);

        String message = approved ?
                "Emergency access request approved and permission granted" :
                "Emergency access request rejected";

        return ResponseEntity.ok(ApiResponse.success(message, accessRequest));
    }

    /**
     * Get pending requests (for primary account)
     * GET /api/emergency-access/pending
     */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<EmergencyAccessRequest>>> getPendingRequests() {
        List<EmergencyAccessRequest> requests = emergencyAccessService.getPendingRequests();
        return ResponseEntity.ok(ApiResponse.success(
                "Pending requests retrieved successfully", requests));
    }

    /**
     * Get all requests (for primary account)
     * GET /api/emergency-access/all
     */
    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<EmergencyAccessRequest>>> getAllRequests() {
        List<EmergencyAccessRequest> requests = emergencyAccessService.getAllRequests();
        return ResponseEntity.ok(ApiResponse.success(
                "All requests retrieved successfully", requests));
    }

    /**
     * Get my requests (for sub-accounts)
     * GET /api/emergency-access/my-requests
     */
    @GetMapping("/my-requests")
    public ResponseEntity<ApiResponse<List<EmergencyAccessRequest>>> getMyRequests() {
        List<EmergencyAccessRequest> requests = emergencyAccessService.getMyRequests();
        return ResponseEntity.ok(ApiResponse.success(
                "Your requests retrieved successfully", requests));
    }

    /**
     * Get pending count (for primary account)
     * GET /api/emergency-access/pending-count
     */
    @GetMapping("/pending-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getPendingCount() {
        long count = emergencyAccessService.getPendingCount();

        Map<String, Long> result = new HashMap<>();
        result.put("pendingCount", count);

        return ResponseEntity.ok(ApiResponse.success(
                "Pending count retrieved", result));
    }
}