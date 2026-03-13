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
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("User", "email", request.getEmail());
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(UserRole.PRIMARY_ACCOUNT);
        user.setIsActive(true);
        user.setEmailVerified(false);

        user = userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(user.getId());
        String refreshToken = tokenProvider.generateRefreshToken(user.getId());

        saveUserSession(user, refreshToken, null);

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
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userPrincipal.getId()));

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(userPrincipal.getId());

        saveUserSession(user, refreshToken, httpRequest);

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

        if (!tokenProvider.validateToken(refreshToken)) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }

        Long userId = tokenProvider.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        UserSession session = sessionRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new UnauthorizedException("Session not found"));

        if (!session.isCurrentlyValid()) {
            throw new UnauthorizedException("Session expired or invalid");
        }

        session.updateLastUsed();
        sessionRepository.save(session);

        String newAccessToken = tokenProvider.generateAccessToken(userId);

        return new AuthResponse(
                newAccessToken,
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
     * Logout user - invalidate session
     * Silently succeeds if session is not found (already logged out / token expired)
     */
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            return; // Nothing to invalidate — treat as already logged out
        }

        sessionRepository.findByRefreshToken(refreshToken)
                .ifPresent(session -> {
                    session.invalidate();
                    sessionRepository.save(session);
                });
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
     * Stores the refresh token exactly as issued so lookups always match.
     */
    private void saveUserSession(User user, String refreshToken, HttpServletRequest request) {
        // Invalidate existing active sessions for this user
        List<UserSession> activeSessions = sessionRepository.findByUserAndIsActiveTrue(user);
        for (UserSession oldSession : activeSessions) {
            oldSession.setIsActive(false);
            sessionRepository.save(oldSession);
        }

        // ✅ Store the token as-is — no UUID suffix so logout lookups match
        UserSession session = new UserSession();
        session.setUser(user);
        session.setRefreshToken(refreshToken);

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
        if (userAgent.contains("Mobile")) return "Mobile Device";
        if (userAgent.contains("Tablet")) return "Tablet";
        if (userAgent.contains("Windows")) return "Windows PC";
        if (userAgent.contains("Mac")) return "Mac";
        if (userAgent.contains("Linux")) return "Linux PC";
        return "Desktop";
    }
}