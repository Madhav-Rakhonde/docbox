package com.docbox.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Active user sessions for device tracking and remote logout
 */
@Entity
@Table(name = "user_sessions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank(message = "Refresh token is required")
    @Column(name = "refresh_token", unique = true, nullable = false, length = 500)
    private String refreshToken;

    @Column(name = "device_info", columnDefinition = "TEXT")
    private String deviceInfo;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    @Column(name = "is_active")
    private Boolean isActive = true;

    // Helper methods

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isCurrentlyValid() {
        return isActive && !isExpired();
    }

    public void updateLastUsed() {
        this.lastUsedAt = LocalDateTime.now();
    }

    public void invalidate() {
        this.isActive = false;
    }

    /**
     * Get a short device identifier for display
     */
    public String getDeviceIdentifier() {
        if (deviceInfo != null && !deviceInfo.isEmpty()) {
            return deviceInfo;
        }
        if (userAgent != null && !userAgent.isEmpty()) {
            // Extract browser/device from user agent
            if (userAgent.contains("Mobile")) {
                return "Mobile Device";
            } else if (userAgent.contains("Chrome")) {
                return "Chrome Browser";
            } else if (userAgent.contains("Firefox")) {
                return "Firefox Browser";
            } else if (userAgent.contains("Safari")) {
                return "Safari Browser";
            }
        }
        return "Unknown Device";
    }
}