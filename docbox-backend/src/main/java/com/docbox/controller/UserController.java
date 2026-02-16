package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.User;
import com.docbox.repository.UserRepository;
import com.docbox.util.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * User Controller
 * Handles user profile operations
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    /**
     * Get current user profile
     * GET /api/users/me
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentUser() {
        Long userId = SecurityUtils.getCurrentUserId();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("email", user.getEmail());
        userInfo.put("fullName", user.getFullName());
        userInfo.put("phoneNumber", user.getPhoneNumber());
        userInfo.put("role", user.getRole());
        userInfo.put("primaryAccountId", user.getPrimaryAccountId());
        userInfo.put("isActive", user.getIsActive());
        userInfo.put("emailVerified", user.getEmailVerified());
        userInfo.put("createdAt", user.getCreatedAt());
        userInfo.put("lastLoginAt", user.getLastLoginAt());

        return ResponseEntity.ok(ApiResponse.success(
                "User profile retrieved successfully",
                userInfo
        ));
    }


    /**
     * Get user statistics
     * GET /api/users/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserStats() {
        Long userId = SecurityUtils.getCurrentUserId();

        Map<String, Object> stats = new HashMap<>();
        stats.put("userId", userId);
        stats.put("role", SecurityUtils.getCurrentUser().getRole());
        stats.put("isPrimaryAccount", SecurityUtils.isCurrentUserPrimaryAccount());
        stats.put("isSubAccount", SecurityUtils.isCurrentUserSubAccount());

        // These will be implemented when we create DocumentService
        stats.put("totalDocuments", 0);
        stats.put("storageUsedBytes", 0L);
        stats.put("storageLimitBytes", 5L * 1024 * 1024 * 1024); // 5GB
        stats.put("storagePercentage", 0.0);
        stats.put("totalFamilyMembers", 0);

        return ResponseEntity.ok(ApiResponse.success(
                "User statistics retrieved successfully",
                stats
        ));
    }
}