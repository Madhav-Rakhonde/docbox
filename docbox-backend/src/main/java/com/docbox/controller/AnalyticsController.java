package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Analytics Controller
 * Provides dashboard statistics and analytics
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;

    // GET /api/analytics/dashboard-stats
    @GetMapping("/dashboard-stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Dashboard statistics retrieved successfully",
                        analyticsService.getDashboardStats()
                )
        );
    }

    // GET /api/analytics/document-stats
    @GetMapping("/document-stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDocumentStats() {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Document statistics retrieved successfully",
                        analyticsService.getDocumentStats()
                )
        );
    }

    // GET /api/analytics/expiry-insights
    @GetMapping("/expiry-insights")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExpiryInsights() {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Expiry insights retrieved successfully",
                        analyticsService.getExpiryInsights()
                )
        );
    }

    // GET /api/analytics/storage-insights
    @GetMapping("/storage-insights")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStorageInsights() {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Storage insights retrieved successfully",
                        analyticsService.getStorageInsights()
                )
        );
    }

    // GET /api/analytics/activity?days=7
    @GetMapping("/activity")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getActivityTimeline(
            @RequestParam(defaultValue = "7") int days) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Activity timeline retrieved successfully",
                        analyticsService.getActivityTimeline(days)
                )
        );
    }
}