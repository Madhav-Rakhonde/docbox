package com.docbox.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Access log for shared links
 * Tracks who accessed shared links and when
 */
@Entity
@Table(name = "share_link_access_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShareLinkAccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shared_link_id", nullable = false)
    private SharedLink sharedLink;

    @CreationTimestamp
    @Column(name = "accessed_at", updatable = false)
    private LocalDateTime accessedAt;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(length = 50)
    private String action; // VIEWED, DOWNLOADED

    // Factory methods

    public static ShareLinkAccessLog viewed(SharedLink link, String ipAddress, String userAgent) {
        ShareLinkAccessLog log = new ShareLinkAccessLog();
        log.setSharedLink(link);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setAction("VIEWED");
        return log;
    }

    public static ShareLinkAccessLog downloaded(SharedLink link, String ipAddress, String userAgent) {
        ShareLinkAccessLog log = new ShareLinkAccessLog();
        log.setSharedLink(link);
        log.setIpAddress(ipAddress);
        log.setUserAgent(userAgent);
        log.setAction("DOWNLOADED");
        return log;
    }
}