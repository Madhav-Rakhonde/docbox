package com.docbox.service;

import com.docbox.entity.Document;
import com.docbox.entity.SharedLink;
import com.docbox.entity.User;
import com.docbox.enums.PermissionLevel;
import com.docbox.exception.BadRequestException;
import com.docbox.exception.InvalidShareLinkException;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.repository.DocumentRepository;
import com.docbox.repository.UserRepository;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Share Link Service - NO QR CODE
 */
@Service
public class ShareLinkService {

    private static final Logger logger = LoggerFactory.getLogger(ShareLinkService.class);

    @Value("${app.share.base-url:http://localhost:3000}")
    private String baseUrl;

    @Value("${app.share.default-expiry-hours:72}")
    private int defaultExpiryHours;

    @Value("${app.share.max-views:100}")
    private int maxViews;

    @Autowired
    private com.docbox.repository.SharedLinkRepository sharedLinkRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /**
     * ✅ Create share link (NO QR CODE)
     */
    @Transactional
    public SharedLink createShareLink(Long documentId, Integer expiryHours,
                                      String password, Integer maxViewsLimit,
                                      Boolean allowDownload) {

        Long currentUserId = SecurityUtils.getCurrentUserId();

        permissionService.requirePermission(documentId,
                PermissionLevel.VIEW_DOWNLOAD_SHARE, "share");

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        User createdBy = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        String linkToken = generateShareToken();

        LocalDateTime expiresAt = LocalDateTime.now().plusHours(
                expiryHours != null ? expiryHours : defaultExpiryHours);

        SharedLink shareLink = new SharedLink();
        shareLink.setDocument(document);
        shareLink.setCreatedBy(createdBy);
        shareLink.setLinkToken(linkToken);
        shareLink.setExpiresAt(expiresAt);
        shareLink.setIsActive(true);
        shareLink.setAllowDownload(allowDownload != null ? allowDownload : true);
        shareLink.setMaxViews(maxViewsLimit != null ? maxViewsLimit : maxViews);
        shareLink.setCurrentViews(0);

        if (password != null && !password.isEmpty()) {
            shareLink.setPasswordHash(passwordEncoder.encode(password));
        }

        shareLink = sharedLinkRepository.save(shareLink);

        // ❌ REMOVED: QR code generation

        logger.info("Share link created: token={}, document={}, expiresAt={}",
                linkToken, documentId, expiresAt);

        return shareLink;
    }

    @Transactional
    public Document accessSharedDocument(String linkToken, String password) {

        SharedLink shareLink = sharedLinkRepository.findByLinkToken(linkToken)
                .orElseThrow(() -> new InvalidShareLinkException("Share link not found or expired"));

        if (!shareLink.getIsActive()) {
            throw new InvalidShareLinkException("Share link has been deactivated");
        }

        if (shareLink.hasExpired()) {
            throw new InvalidShareLinkException("Share link has expired");
        }

        if (shareLink.hasReachedViewLimit()) {
            throw new InvalidShareLinkException("Share link has reached maximum views");
        }

        if (shareLink.isPasswordProtected()) {
            if (password == null || password.isEmpty()) {
                throw new InvalidShareLinkException("Password required");
            }

            if (!passwordEncoder.matches(password, shareLink.getPasswordHash())) {
                throw new InvalidShareLinkException("Incorrect password");
            }
        }

        shareLink.incrementViews();
        sharedLinkRepository.save(shareLink);

        logger.info("Shared document accessed: token={}, views={}/{}",
                linkToken, shareLink.getCurrentViews(), shareLink.getMaxViews());

        return shareLink.getDocument();
    }

    public byte[] downloadSharedDocument(String linkToken, String password) {

        SharedLink shareLink = sharedLinkRepository.findByLinkToken(linkToken)
                .orElseThrow(() -> new InvalidShareLinkException("Share link not found"));

        Document document = accessSharedDocument(linkToken, password);

        if (!shareLink.getAllowDownload()) {
            throw new InvalidShareLinkException("Download not allowed for this share link");
        }

        byte[] fileBytes = fileStorageService.loadFileAsBytes(document.getStoredFilename());

        logger.info("Shared document downloaded: token={}", linkToken);

        return fileBytes;
    }

    public SharedLink getShareLink(String linkToken) {
        return sharedLinkRepository.findByLinkToken(linkToken)
                .orElseThrow(() -> new InvalidShareLinkException("Share link not found"));
    }

    public List<SharedLink> getDocumentShareLinks(Long documentId) {
        permissionService.requirePermission(documentId,
                PermissionLevel.VIEW_DOWNLOAD_SHARE, "view share links");

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        return sharedLinkRepository.findByDocument(document);
    }

    public List<SharedLink> getMyShareLinks() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        return sharedLinkRepository.findByCreatedBy(currentUser);
    }

    @Transactional
    public void revokeShareLink(Long shareLinkId) {
        SharedLink shareLink = sharedLinkRepository.findById(shareLinkId)
                .orElseThrow(() -> new ResourceNotFoundException("ShareLink", "id", shareLinkId));

        Long currentUserId = SecurityUtils.getCurrentUserId();

        if (!shareLink.getCreatedBy().getId().equals(currentUserId) &&
                !shareLink.getDocument().getUser().getId().equals(currentUserId)) {
            throw new BadRequestException("You can only revoke your own share links");
        }

        shareLink.revoke();
        sharedLinkRepository.save(shareLink);

        logger.info("Share link revoked: id={}", shareLinkId);
    }

    @Transactional
    public SharedLink updateShareLink(Long shareLinkId, Integer expiryHours,
                                      Integer maxViewsLimit, Boolean allowDownload) {

        SharedLink shareLink = sharedLinkRepository.findById(shareLinkId)
                .orElseThrow(() -> new ResourceNotFoundException("ShareLink", "id", shareLinkId));

        Long currentUserId = SecurityUtils.getCurrentUserId();
        if (!shareLink.getCreatedBy().getId().equals(currentUserId)) {
            throw new BadRequestException("You can only update your own share links");
        }

        if (expiryHours != null) {
            shareLink.setExpiresAt(LocalDateTime.now().plusHours(expiryHours));
        }

        if (maxViewsLimit != null) {
            shareLink.setMaxViews(maxViewsLimit);
        }

        if (allowDownload != null) {
            shareLink.setAllowDownload(allowDownload);
        }

        shareLink = sharedLinkRepository.save(shareLink);

        logger.info("Share link updated: id={}", shareLinkId);

        return shareLink;
    }

    @Transactional
    public int cleanupExpiredLinks() {
        int deleted = sharedLinkRepository.expireOldLinks();
        logger.info("Cleaned up {} expired share links", deleted);
        return deleted;
    }

    private String generateShareToken() {
        String token;
        do {
            token = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        } while (sharedLinkRepository.findByLinkToken(token).isPresent());

        return token;
    }

}