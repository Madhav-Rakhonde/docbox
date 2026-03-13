package com.docbox.entity;

import com.docbox.enums.PermissionLevel;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Audit log for all permission changes
 * Tracks who changed what permission when and why
 */
@Entity
@Table(name = "permission_audit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class PermissionAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "user", "uploadedBy",
            "familyMember", "ocrText", "extractedData"})
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash",
            "emailVerificationToken", "resetPasswordToken", "primaryAccount"})
    private User user;

    @NotBlank(message = "Action is required")
    @Column(nullable = false, length = 50)
    private String action;

    @Enumerated(EnumType.STRING)
    @Column(name = "old_permission")
    private PermissionLevel oldPermission;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_permission")
    private PermissionLevel newPermission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "changed_by", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash",
            "emailVerificationToken", "resetPasswordToken", "primaryAccount"})
    private User changedBy;

    @Column(name = "change_reason", columnDefinition = "TEXT")
    private String changeReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Factory methods

    public static PermissionAuditLog granted(Document document, User user, PermissionLevel newPermission, User changedBy, String reason) {
        PermissionAuditLog log = new PermissionAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("GRANTED");
        log.setNewPermission(newPermission);
        log.setChangedBy(changedBy);
        log.setChangeReason(reason);
        return log;
    }

    public static PermissionAuditLog revoked(Document document, User user, PermissionLevel oldPermission, User changedBy, String reason) {
        PermissionAuditLog log = new PermissionAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("REVOKED");
        log.setOldPermission(oldPermission);
        log.setChangedBy(changedBy);
        log.setChangeReason(reason);
        return log;
    }

    public static PermissionAuditLog modified(Document document, User user, PermissionLevel oldPermission, PermissionLevel newPermission, User changedBy, String reason) {
        PermissionAuditLog log = new PermissionAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("MODIFIED");
        log.setOldPermission(oldPermission);
        log.setNewPermission(newPermission);
        log.setChangedBy(changedBy);
        log.setChangeReason(reason);
        return log;
    }

    public static PermissionAuditLog expired(Document document, User user, PermissionLevel oldPermission) {
        PermissionAuditLog log = new PermissionAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("EXPIRED");
        log.setOldPermission(oldPermission);
        log.setChangedBy(user);
        log.setChangeReason("Permission expired automatically");
        return log;
    }
}