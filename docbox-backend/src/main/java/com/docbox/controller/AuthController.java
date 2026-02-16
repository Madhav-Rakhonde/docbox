package com.docbox.controller;

import com.docbox.dto.LoginRequest;
import com.docbox.dto.RefreshTokenRequest;
import com.docbox.dto.SignupRequest;
import com.docbox.dto.ApiResponse;
import com.docbox.dto.AuthResponse;
import com.docbox.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication Controller
 * Handles user registration, login, token refresh, and logout
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    @Autowired
    private AuthService authService;

    /**
     * Register a new user (PRIMARY_ACCOUNT)
     * POST /api/auth/signup
     */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<AuthResponse>> signup(
            @Valid @RequestBody SignupRequest request) {

        AuthResponse authResponse = authService.signup(request);

        return ResponseEntity.ok(ApiResponse.success(
                "User registered successfully! Welcome to DocBox.",
                authResponse
        ));
    }

    /**
     * Login user
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {

        AuthResponse authResponse = authService.login(request, httpRequest);

        return ResponseEntity.ok(ApiResponse.success(
                "Login successful! Welcome back.",
                authResponse
        ));
    }

    /**
     * Refresh access token
     * POST /api/auth/refresh
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(
            @Valid @RequestBody RefreshTokenRequest request) {

        AuthResponse authResponse = authService.refreshToken(request);

        return ResponseEntity.ok(ApiResponse.success(
                "Token refreshed successfully",
                authResponse
        ));
    }

    /**
     * Logout user (invalidate current session)
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @Valid @RequestBody RefreshTokenRequest request) {

        authService.logout(request.getRefreshToken());

        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }

    /**
     * Logout from all devices
     * POST /api/auth/logout-all
     * Requires authentication
     */
    @PostMapping("/logout-all")
    public ResponseEntity<ApiResponse<Void>> logoutAllDevices(
            @RequestAttribute("userId") Long userId) {

        authService.logoutAllDevices(userId);

        return ResponseEntity.ok(ApiResponse.success(
                "Logged out from all devices successfully"
        ));
    }
}