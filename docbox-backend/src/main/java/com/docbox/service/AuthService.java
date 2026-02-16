package com.docbox.service;

import com.docbox.dto.LoginRequest;
import com.docbox.dto.RefreshTokenRequest;
import com.docbox.dto.SignupRequest;
import com.docbox.dto.AuthResponse;
import com.docbox.entity.User;
import com.docbox.entity.UserSession;
import com.docbox.enums.UserRole;
import com.docbox.exception.BadRequestException;
import com.docbox.exception.DuplicateResourceException;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.exception.UnauthorizedException;
import com.docbox.repository.UserRepository;
import com.docbox.repository.UserSessionRepository;
import com.docbox.security.JwtTokenProvider;
import com.docbox.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Authentication Service
 * Handles user authentication, registration, and token management
 */
@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserSessionRepository sessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    /**
     * Register a new PRIMARY_ACCOUNT user
     */
    @Transactional
    public AuthResponse signup(SignupRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        // Create new user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(UserRole.PRIMARY_ACCOUNT); // New signups are always PRIMARY_ACCOUNT
        user.setIsActive(true);
        user.setEmailVerified(false); // Email verification can be added later

        user = userRepository.save(user);

        // Generate tokens
        String accessToken = tokenProvider.generateAccessToken(user.getId());
        String refreshToken = tokenProvider.generateRefreshToken(user.getId());

        // Save session
        saveUserSession(user, refreshToken, null);

        // Build response
        return new AuthResponse(
                accessToken,
                refreshToken,
                tokenProvider.getAccessTokenExpirationMs(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getPrimaryAccountId()
        );
    }

    /**
     * Login user
     */
    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Get user details
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // Generate tokens
        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(userPrincipal.getId());

        // Save session
        saveUserSession(user, refreshToken, httpRequest);

        // Build response
        return new AuthResponse(
                accessToken,
                refreshToken,
                tokenProvider.getAccessTokenExpirationMs(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getPrimaryAccountId()
        );
    }

    /**
     * Refresh access token
     */
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        // Validate refresh token
        if (!tokenProvider.validateToken(refreshToken)) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        // Get user from refresh token
        Long userId = tokenProvider.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Verify session exists and is active
        UserSession session = sessionRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new UnauthorizedException("Session not found"));

        if (!session.isCurrentlyValid()) {
            throw new UnauthorizedException("Session expired or invalid");
        }

        // Update session last used
        session.updateLastUsed();
        sessionRepository.save(session);

        // Generate new access token (refresh token remains the same)
        String newAccessToken = tokenProvider.generateAccessToken(userId);

        return new AuthResponse(
                newAccessToken,
                refreshToken, // Same refresh token
                tokenProvider.getAccessTokenExpirationMs(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getPrimaryAccountId()
        );
    }

    /**
     * Logout user - invalidate session
     */
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            throw new BadRequestException("Refresh token is required for logout");
        }

        UserSession session = sessionRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        session.invalidate();
        sessionRepository.save(session);
    }

    /**
     * Logout from all devices - invalidate all sessions for user
     */
    @Transactional
    public void logoutAllDevices(Long userId) {
        sessionRepository.invalidateAllSessionsForUser(userId);
    }

    /**
     * Save user session
     */
    /**
     * Save user session with unique token
     */
    private void saveUserSession(User user, String refreshToken, HttpServletRequest request) {
        // Invalidate old active sessions for this user to prevent duplicates
        List<UserSession> activeSessions = sessionRepository.findByUserAndIsActiveTrue(user);
        for (UserSession oldSession : activeSessions) {
            oldSession.setIsActive(false);
            sessionRepository.save(oldSession);
        }

        // Add UUID to refresh token to ensure uniqueness
        String uniqueRefreshToken = refreshToken + "-" + UUID.randomUUID().toString();

        UserSession session = new UserSession();
        session.setUser(user);
        session.setRefreshToken(uniqueRefreshToken);

        if (request != null) {
            session.setIpAddress(getClientIpAddress(request));
            session.setUserAgent(request.getHeader("User-Agent"));
            session.setDeviceInfo(extractDeviceInfo(request.getHeader("User-Agent")));
        }

        LocalDateTime expiryDate = tokenProvider.getExpirationDateFromToken(refreshToken)
                .toInstant()
                .atZone(java.time.ZoneId.systemDefault())
                .toLocalDateTime();
        session.setExpiresAt(expiryDate);
        session.setIsActive(true);

        sessionRepository.save(session);
    }






    /**
     * Get client IP address from request
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Extract device info from user agent
     */
    private String extractDeviceInfo(String userAgent) {
        if (userAgent == null || userAgent.isEmpty()) {
            return "Unknown Device";
        }

        if (userAgent.contains("Mobile")) {
            return "Mobile Device";
        } else if (userAgent.contains("Tablet")) {
            return "Tablet";
        } else if (userAgent.contains("Windows")) {
            return "Windows PC";
        } else if (userAgent.contains("Mac")) {
            return "Mac";
        } else if (userAgent.contains("Linux")) {
            return "Linux PC";
        }

        return "Desktop";
    }
}