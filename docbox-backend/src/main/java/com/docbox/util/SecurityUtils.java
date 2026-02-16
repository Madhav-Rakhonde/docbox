package com.docbox.util;

import com.docbox.exception.UnauthorizedException;
import com.docbox.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Security Utility Methods
 * Helper methods for accessing security context
 */
public class SecurityUtils {

    /**
     * Get current authenticated user principal
     */
    public static UserPrincipal getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("No authenticated user found");
        }

        Object principal = authentication.getPrincipal();

        if (!(principal instanceof UserPrincipal)) {
            throw new UnauthorizedException("Invalid user principal");
        }

        return (UserPrincipal) principal;
    }

    /**
     * Get current user ID
     */
    public static Long getCurrentUserId() {
        return getCurrentUser().getId();
    }

    /**
     * Get current user email
     */
    public static String getCurrentUserEmail() {
        return getCurrentUser().getEmail();
    }

    /**
     * Check if current user is primary account
     */
    public static boolean isCurrentUserPrimaryAccount() {
        return getCurrentUser().isPrimaryAccount();
    }

    /**
     * Check if current user is sub account
     */
    public static boolean isCurrentUserSubAccount() {
        return getCurrentUser().isSubAccount();
    }

    /**
     * Get primary account ID for current user
     * Returns the user's own ID if they are primary account
     * Returns primary account's ID if they are sub account
     */
    public static Long getCurrentPrimaryAccountId() {
        UserPrincipal user = getCurrentUser();
        return user.getPrimaryAccountId() != null ?
                user.getPrimaryAccountId() : user.getId();
    }

    /**
     * Check if user is authenticated
     */
    public static boolean isAuthenticated() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null &&
                authentication.isAuthenticated() &&
                !"anonymousUser".equals(authentication.getPrincipal());
    }
}