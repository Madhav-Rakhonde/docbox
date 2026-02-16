package com.docbox.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Download tracking for documents
 */
@Entity
@Table(name = "download_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DownloadLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "download_type", length = 50)
    private String downloadType; // SINGLE, BULK, CATEGORY, FULL_BACKUP

    @Column(name = "file_size")
    private Long fileSize;

    @CreationTimestamp
    @Column(name = "downloaded_at", updatable = false)
    private LocalDateTime downloadedAt;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    // Factory methods

    public static DownloadLog single(Document document, User user, String ipAddress) {
        DownloadLog log = new DownloadLog();
        log.setDocument(document);
        log.setUser(user);
        log.setDownloadType("SINGLE");
        log.setFileSize(document.getFileSize());
        log.setIpAddress(ipAddress);
        return log;
    }

    public static DownloadLog bulk(Document document, User user, Long totalSize, String ipAddress) {
        DownloadLog log = new DownloadLog();
        log.setDocument(document);
        log.setUser(user);
        log.setDownloadType("BULK");
        log.setFileSize(totalSize);
        log.setIpAddress(ipAddress);
        return log;
    }
}