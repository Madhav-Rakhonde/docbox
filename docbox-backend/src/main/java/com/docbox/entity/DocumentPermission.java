package com.docbox.entity;

import com.docbox.enums.PermissionLevel;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * CRITICAL TABLE: Controls document-level access permissions
 * This is the heart of DocBox's permission system
 */
@Entity
@Table(name = "document_permissions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"document_id", "user_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Who has this permission

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Permission level is required")
    @Column(name = "permission_level", nullable = false)
    private PermissionLevel permissionLevel;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "granted_by", nullable = false)
    private User grantedBy; // Who granted this permission

    @CreationTimestamp
    @Column(name = "granted_at", updatable = false)
    private LocalDateTime grantedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt; // NULL for permanent, or specific datetime for temporary

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // Helper methods

    /**
     * Check if this permission is currently valid (active and not expired)
     */
    public boolean isCurrentlyValid() {
        if (!isActive) {
            return false;
        }
        if (expiresAt == null) {
            return true; // Permanent permission
        }
        return LocalDateTime.now().isBefore(expiresAt);
    }

    /**
     * Check if user can view the document
     */
    public boolean canView() {
        return isCurrentlyValid() && permissionLevel.canView();
    }

    /**
     * Check if user can download the document
     */
    public boolean canDownload() {
        return isCurrentlyValid() && permissionLevel.canDownload();
    }

    /**
     * Check if user can share the document
     */
    public boolean canShare() {
        return isCurrentlyValid() && permissionLevel.canShare();
    }

    /**
     * Check if permission has expired
     */
    public boolean hasExpired() {
        if (expiresAt == null) {
            return false;
        }
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * Check if permission is temporary (has expiry date)
     */
    public boolean isTemporary() {
        return expiresAt != null;
    }

    /**
     * Mark permission as expired
     */
    public void expire() {
        this.isActive = false;
    }
}