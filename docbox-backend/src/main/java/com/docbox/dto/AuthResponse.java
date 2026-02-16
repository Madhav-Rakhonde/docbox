package com.docbox.dto;

import com.docbox.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Authentication Response DTO
 * Returned after successful login/signup
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private Long expiresIn; // in milliseconds

    // User info
    private Long userId;
    private String email;
    private String fullName;
    private UserRole role;
    private Long primaryAccountId; // For sub-accounts

    public AuthResponse(String accessToken, String refreshToken, Long expiresIn,
                        Long userId, String email, String fullName, UserRole role, Long primaryAccountId) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
        this.userId = userId;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.primaryAccountId = primaryAccountId;
    }
}