package com.docbox.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Shareable links for documents
 * Allows temporary, password-protected sharing with non-users
 */
@Entity
@Table(name = "shared_links")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SharedLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user", "uploadedBy",
            "familyMember", "ocrText", "extractedData"})
    private Document document;

    @NotBlank(message = "Link token is required")
    @Column(name = "link_token", unique = true, nullable = false)
    private String linkToken;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash",
            "emailVerificationToken", "resetPasswordToken", "primaryAccount"})
    private User createdBy;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "max_views")
    private Integer maxViews;

    @Column(name = "current_views")
    private Integer currentViews = 0;

    @Column(name = "allow_download")
    private Boolean allowDownload = false;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "qr_code_path", length = 1000)
    private String qrCodePath;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    // Helper methods

    /** Check if link is currently valid */
    public boolean isCurrentlyValid() {
        if (!isActive) return false;
        if (LocalDateTime.now().isAfter(expiresAt)) return false;
        if (maxViews != null && currentViews >= maxViews) return false;
        return true;
    }

    /** Check if link has password protection */
    public boolean isPasswordProtected() {
        return passwordHash != null && !passwordHash.isEmpty();
    }

    /** Check if link has expired */
    public boolean hasExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /** Check if view limit reached */
    public boolean hasReachedViewLimit() {
        return maxViews != null && currentViews >= maxViews;
    }

    /** Increment view count */
    public void incrementViews() {
        this.currentViews++;
    }

    /** Revoke the link */
    public void revoke() {
        this.isActive = false;
        this.revokedAt = LocalDateTime.now();
    }

    /** Generate a new unique token */
    public static String generateToken() {
        return UUID.randomUUID().toString();
    }

    /** Get the full shareable URL */
    public String getShareableUrl(String baseUrl) {
        return baseUrl + "/share/" + this.linkToken;
    }
}