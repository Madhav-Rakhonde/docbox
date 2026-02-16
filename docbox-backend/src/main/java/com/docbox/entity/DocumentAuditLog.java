package com.docbox.entity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import org.hibernate.annotations.Type;

import jakarta.persistence.Column;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Comprehensive audit log for all document operations
 * Tracks all actions performed on documents
 */
@Entity
@Table(name = "document_audit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotBlank(message = "Action is required")
    @Column(nullable = false, length = 50)
    private String action; // UPLOADED, VIEWED, DOWNLOADED, SHARED, DELETED, MODIFIED, MOVED, etc.

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private String details;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Factory methods for common actions

    public static DocumentAuditLog uploaded(Document document, User user, String ipAddress, String userAgent) {
        DocumentAuditLog log = new DocumentAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("UPLOADED");
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        return log;
    }

    public static DocumentAuditLog viewed(Document document, User user, String ipAddress, String userAgent) {
        DocumentAuditLog log = new DocumentAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("VIEWED");
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        return log;
    }

    public static DocumentAuditLog downloaded(Document document, User user, String ipAddress, String userAgent) {
        DocumentAuditLog log = new DocumentAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("DOWNLOADED");
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        return log;
    }

    public static DocumentAuditLog shared(Document document, User user, String ipAddress, String userAgent, String details) {
        DocumentAuditLog log = new DocumentAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("SHARED");
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setDetails(details);
        return log;
    }

    public static DocumentAuditLog deleted(Document document, User user, String ipAddress, String userAgent) {
        DocumentAuditLog log = new DocumentAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("DELETED");
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        return log;
    }

    public static DocumentAuditLog modified(Document document, User user, String ipAddress, String userAgent, String details) {
        DocumentAuditLog log = new DocumentAuditLog();
        log.setDocument(document);
        log.setUser(user);
        log.setAction("MODIFIED");
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setDetails(details);
        return log;
    }
}