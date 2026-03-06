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

/**
 * Notification Controller
 * Handles BOTH in-app notifications AND email/SMS settings
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;
    /**
     * Get all in-app notifications for current user
     * GET /api/notifications
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<InAppNotification>>> getNotifications() {
        List<InAppNotification> notifications = notificationService.getMyNotifications();
        return ResponseEntity.ok(ApiResponse.success(
                "Notifications retrieved successfully", notifications));
    }

    /**
     * Get unread notifications count
     * GET /api/notifications/unread-count
     */
    @GetMapping("/unread/count")
    public ResponseEntity<ApiResponse<Long>> getUnreadCount() {
        Long count = notificationService.getUnreadCount();
        return ResponseEntity.ok(ApiResponse.success("Unread count retrieved", count));
    }

    /**
     * Mark notification as read
     * PUT /api/notifications/{id}/read
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read"));
    }

    /**
     * Mark all notifications as read
     * PUT /api/notifications/mark-all-read
     */
    @PutMapping("/mark-all-read")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read"));
    }

    /**
     * Delete notification
     * DELETE /api/notifications/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(ApiResponse.success("Notification deleted"));
    }

    /**
     * Clear all notifications
     * DELETE /api/notifications/clear-all
     */
    @DeleteMapping("/clear-all")
    public ResponseEntity<ApiResponse<Void>> clearAll() {
        notificationService.clearAllNotifications();
        return ResponseEntity.ok(ApiResponse.success("All notifications cleared"));
    }

    // ==========================================
    // EMAIL/SMS NOTIFICATION ENDPOINTS (EXISTING)
    // ==========================================

    /**
     * Get notification statistics
     * GET /api/notifications/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getNotificationStats() {
        Map<String, Object> stats = notificationService.getNotificationStats();
        return ResponseEntity.ok(ApiResponse.success(
                "Notification statistics retrieved successfully", stats));
    }

    /**
     * Test email notification
     * POST /api/notifications/test-email
     */
    @PostMapping("/test-email")
    public ResponseEntity<ApiResponse<Map<String, String>>> testEmail(
            @RequestBody Map<String, String> request) {

        String email = request.get("email");

        Map<String, String> response = new HashMap<>();
        response.put("message", "Test email would be sent to: " + email);
        response.put("note", "Email sending is stubbed. Configure SendGrid/AWS SES in production.");

        return ResponseEntity.ok(ApiResponse.success("Test email processed", response));
    }

    /**
     * Test SMS notification
     * POST /api/notifications/test-sms
     */
    @PostMapping("/test-sms")
    public ResponseEntity<ApiResponse<Map<String, String>>> testSMS(
            @RequestBody Map<String, String> request) {

        String phoneNumber = request.get("phoneNumber");

        Map<String, String> response = new HashMap<>();
        response.put("message", "Test SMS would be sent to: " + phoneNumber);
        response.put("note", "SMS sending is stubbed. Configure Twilio/AWS SNS in production.");

        return ResponseEntity.ok(ApiResponse.success("Test SMS processed", response));
    }

    /**
     * Get notification settings
     * GET /api/notifications/settings
     */
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getNotificationSettings() {
        Map<String, Object> settings = new HashMap<>();
        settings.put("emailEnabled", false);  // From application.properties
        settings.put("smsEnabled", false);
        settings.put("whatsappEnabled", false);
        settings.put("expiryReminders", true);
        settings.put("emergencyAccessAlerts", true);
        settings.put("shareNotifications", true);
        settings.put("storageWarnings", true);

        return ResponseEntity.ok(ApiResponse.success(
                "Notification settings retrieved successfully", settings));
    }

    /**
     * Update notification settings
     * PUT /api/notifications/settings
     */
    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> updateNotificationSettings(
            @RequestBody Map<String, Boolean> settings) {

        // In a real implementation, save these settings to database
        // For now, just acknowledge the update

        return ResponseEntity.ok(ApiResponse.success(
                "Notification settings updated successfully", settings));
    }
}