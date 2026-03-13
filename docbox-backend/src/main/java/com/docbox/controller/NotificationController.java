package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.InAppNotification;
import com.docbox.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    /** GET /api/notifications */
    @GetMapping
    public ResponseEntity<ApiResponse<List<InAppNotification>>> getNotifications() {
        return ResponseEntity.ok(ApiResponse.success(
                "Notifications retrieved successfully", notificationService.getMyNotifications()));
    }

    /**
     * GET /api/notifications/unread/count
     * Returns { "success": true, "data": 5 }
     */
    @GetMapping("/unread/count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount() {
        return ResponseEntity.ok(ApiResponse.success(
                "Unread count retrieved", notificationService.getUnreadCount()));
    }

    /** PUT /api/notifications/{id}/read */
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read"));
    }

    /** PUT /api/notifications/mark-all-read */
    @PutMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read"));
    }

    /** DELETE /api/notifications/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(ApiResponse.success("Notification deleted"));
    }

    /** DELETE /api/notifications/clear-all */
    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<Void>> clearAll() {
        notificationService.clearAllNotifications();
        return ResponseEntity.ok(ApiResponse.success("All notifications cleared"));
    }

    /** GET /api/notifications/stats */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getNotificationStats() {
        return ResponseEntity.ok(ApiResponse.success(
                "Notification statistics retrieved successfully", notificationService.getNotificationStats()));
    }

    // ======================================================
    // NOTIFICATION SETTINGS — persisted per-user in DB
    // ======================================================

    /**
     * GET /api/notifications/settings
     * Returns this user's saved toggle prefs.
     * Defaults: emailNotifications=true, expiryAlerts=true,
     *           shareNotifications=true, weeklyReports=false
     */
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getNotificationSettings() {
        return ResponseEntity.ok(ApiResponse.success(
                "Notification settings retrieved successfully",
                notificationService.getUserNotificationSettings()));
    }

    /**
     * PUT /api/notifications/settings
     * Body: { "emailNotifications": true, "expiryAlerts": false, ... }
     * Partial updates are supported.
     */
    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateNotificationSettings(
            @RequestBody Map<String, Boolean> settings) {
        return ResponseEntity.ok(ApiResponse.success(
                "Notification settings updated successfully",
                notificationService.updateUserNotificationSettings(settings)));
    }

    // ── Test stubs ────────────────────────────────────────────────────────────

    @PostMapping("/test-email")
    public ResponseEntity<ApiResponse<Map<String, String>>> testEmail(@RequestBody Map<String, String> request) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Test email would be sent to: " + request.get("email"));
        response.put("note", "Email sending is stubbed. Configure SendGrid/AWS SES in production.");
        return ResponseEntity.ok(ApiResponse.success("Test email processed", response));
    }

    @PostMapping("/test-sms")
    public ResponseEntity<ApiResponse<Map<String, String>>> testSMS(@RequestBody Map<String, String> request) {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Test SMS would be sent to: " + request.get("phoneNumber"));
        response.put("note", "SMS sending is stubbed. Configure Twilio/AWS SNS in production.");
        return ResponseEntity.ok(ApiResponse.success("Test SMS processed", response));
    }
}