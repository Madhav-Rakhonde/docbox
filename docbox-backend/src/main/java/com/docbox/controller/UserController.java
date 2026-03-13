package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.User;
import com.docbox.repository.UserRepository;
import com.docbox.service.AnalyticsService;
import com.docbox.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AnalyticsService analyticsService;

    /** GET /api/users/me */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentUser() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(ApiResponse.success("User profile retrieved successfully", buildUserInfo(user)));
    }

    /**
     * PUT /api/users/me
     * Body: { "fullName": "...", "phoneNumber": "..." }
     * Email is immutable — ignored if sent.
     */
    @PutMapping("/me")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateCurrentUser(
            @RequestBody Map<String, Object> body) {

        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String fullName = body.containsKey("fullName") ? (String) body.get("fullName") : null;
        String phoneNumber = body.containsKey("phoneNumber") ? (String) body.get("phoneNumber") : null;

        if (fullName != null && !fullName.trim().isEmpty()) {
            user.setFullName(fullName.trim());
        }
        if (phoneNumber != null) {
            // Allow clearing phone by sending empty string
            user.setPhoneNumber(phoneNumber.trim().isEmpty() ? null : phoneNumber.trim());
        }

        user = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", buildUserInfo(user)));
    }

    /** GET /api/users/stats */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserStats() {
        Long userId = SecurityUtils.getCurrentUserId();
        Map<String, Object> stats = new HashMap<>();
        stats.put("userId", userId);
        stats.put("role", SecurityUtils.getCurrentUser().getRole());
        stats.put("isPrimaryAccount", SecurityUtils.isCurrentUserPrimaryAccount());
        stats.put("isSubAccount", SecurityUtils.isCurrentUserSubAccount());

        Map<String, Object> dash = analyticsService.getDashboardStats();
        stats.put("totalDocuments",     dash.getOrDefault("totalDocuments",     0L));
        stats.put("storageUsedBytes",   dash.getOrDefault("storageUsedBytes",   0L));
        stats.put("storageLimitBytes",  dash.getOrDefault("storageLimit",       5L * 1024 * 1024 * 1024));
        stats.put("storagePercentage",  dash.getOrDefault("storagePercentage",  0.0));
        stats.put("totalFamilyMembers", dash.getOrDefault("totalFamilyMembers", 0L));

        return ResponseEntity.ok(ApiResponse.success("User statistics retrieved successfully", stats));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> buildUserInfo(User user) {
        Map<String, Object> info = new HashMap<>();
        info.put("id",               user.getId());
        info.put("email",            user.getEmail());
        info.put("fullName",         user.getFullName());
        info.put("phoneNumber",      user.getPhoneNumber());
        info.put("role",             user.getRole());
        info.put("primaryAccountId", user.getPrimaryAccountId());
        info.put("isActive",         user.getIsActive());
        info.put("emailVerified",    user.getEmailVerified());
        info.put("createdAt",        user.getCreatedAt());
        info.put("lastLoginAt",      user.getLastLoginAt());
        return info;
    }
}