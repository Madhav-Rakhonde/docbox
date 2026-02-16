package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.Document;
import com.docbox.entity.SharedLink;
import com.docbox.service.ShareLinkService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Share Link Controller - NO QR CODE
 */
@RestController
@RequestMapping("/api/share")
public class ShareLinkController {

    @Value("${app.share.base-url:http://localhost:3000}")
    private String baseUrl;

    @Autowired
    private ShareLinkService shareLinkService;

    /**
     * Create share link for document
     * POST /api/share
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createShareLink(
            @RequestBody Map<String, Object> request) {

        try {
            Object docIdObj = request.get("documentId");
            if (docIdObj == null) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("documentId is required"));
            }

            Long documentId;
            try {
                documentId = Long.parseLong(docIdObj.toString());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("documentId must be a number"));
            }

            Integer expiryHours = request.get("expiryHours") != null ?
                    Integer.parseInt(request.get("expiryHours").toString()) : null;

            String password = request.get("password") != null ?
                    request.get("password").toString() : null;

            Integer maxViews = request.get("maxViews") != null ?
                    Integer.parseInt(request.get("maxViews").toString()) : null;

            Boolean allowDownload = request.get("allowDownload") != null ?
                    Boolean.parseBoolean(request.get("allowDownload").toString()) : true;

            SharedLink shareLink = shareLinkService.createShareLink(
                    documentId, expiryHours, password, maxViews, allowDownload);

            Map<String, Object> response = buildShareLinkResponse(shareLink);

            return ResponseEntity.ok(ApiResponse.success(
                    "Share link created successfully", response));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("An unexpected error occurred: " + e.getMessage()));
        }
    }

    /**
     * Access shared document (public endpoint - no auth required)
     * GET /api/share/{linkToken}
     */
    @GetMapping("/{linkToken}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> accessSharedDocument(
            @PathVariable String linkToken,
            @RequestParam(required = false) String password) {

        Document document = shareLinkService.accessSharedDocument(linkToken, password);
        SharedLink shareLink = shareLinkService.getShareLink(linkToken);

        Map<String, Object> response = new HashMap<>();
        response.put("documentId", document.getId());
        response.put("originalFilename", document.getOriginalFilename());
        response.put("fileSize", document.getFileSize());
        response.put("fileSizeKB", document.getFileSizeInKB());
        response.put("fileSizeMB", document.getFileSizeInMB());
        response.put("fileType", document.getFileType());
        response.put("category", document.getCategory().getName());
        response.put("uploadedAt", document.getCreatedAt());
        response.put("currentViews", shareLink.getCurrentViews());
        response.put("maxViews", shareLink.getMaxViews());
        response.put("expiresAt", shareLink.getExpiresAt());

        return ResponseEntity.ok(ApiResponse.success(
                "Document accessed successfully", response));
    }

    /**
     * Download shared document (public endpoint - no auth required)
     * GET /api/share/{linkToken}/download
     */
    @GetMapping("/{linkToken}/download")
    public ResponseEntity<Resource> downloadSharedDocument(
            @PathVariable String linkToken,
            @RequestParam(required = false) String password) {

        SharedLink shareLink = shareLinkService.getShareLink(linkToken);
        Document document = shareLink.getDocument();

        byte[] fileBytes = shareLinkService.downloadSharedDocument(linkToken, password);
        ByteArrayResource resource = new ByteArrayResource(fileBytes);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + document.getOriginalFilename() + "\"")
                .contentType(MediaType.parseMediaType(
                        document.getMimeType() != null ?
                                document.getMimeType() : "application/octet-stream"))
                .contentLength(fileBytes.length)
                .body(resource);
    }

    /**
     * View shared document inline (public endpoint)
     * GET /api/share/view/{linkToken}
     */
    @GetMapping("/view/{linkToken}")
    public ResponseEntity<Resource> viewSharedDocument(
            @PathVariable String linkToken,
            @RequestParam(required = false) String password) {

        byte[] fileBytes = shareLinkService.downloadSharedDocument(linkToken, password);
        Document document = shareLinkService.accessSharedDocument(linkToken, password);

        ByteArrayResource resource = new ByteArrayResource(fileBytes);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + document.getOriginalFilename() + "\"")
                .contentType(MediaType.parseMediaType(document.getMimeType()))
                .contentLength(fileBytes.length)
                .body(resource);
    }

    /**
     * Get share links for document
     * GET /api/share/document/{documentId}
     */
    @GetMapping("/document/{documentId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDocumentShareLinks(
            @PathVariable Long documentId) {

        List<SharedLink> shareLinks = shareLinkService.getDocumentShareLinks(documentId);

        List<Map<String, Object>> response = shareLinks.stream()
                .map(this::buildShareLinkResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(
                "Share links retrieved successfully", response));
    }

    /**
     * Get my share links
     * GET /api/share/my-links
     */
    @GetMapping("/my-links")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyShareLinks() {

        List<SharedLink> shareLinks = shareLinkService.getMyShareLinks();

        List<Map<String, Object>> response = shareLinks.stream()
                .map(this::buildShareLinkResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(
                "Your share links retrieved successfully", response));
    }

    /**
     * Update share link
     * PUT /api/share/{shareLinkId}
     */
    @PutMapping("/{shareLinkId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateShareLink(
            @PathVariable Long shareLinkId,
            @RequestBody Map<String, Object> request) {

        Integer expiryHours = request.containsKey("expiryHours") ?
                Integer.parseInt(request.get("expiryHours").toString()) : null;
        Integer maxViews = request.containsKey("maxViews") ?
                Integer.parseInt(request.get("maxViews").toString()) : null;
        Boolean allowDownload = request.containsKey("allowDownload") ?
                Boolean.parseBoolean(request.get("allowDownload").toString()) : null;

        SharedLink shareLink = shareLinkService.updateShareLink(
                shareLinkId, expiryHours, maxViews, allowDownload);

        Map<String, Object> response = buildShareLinkResponse(shareLink);

        return ResponseEntity.ok(ApiResponse.success(
                "Share link updated successfully", response));
    }

    /**
     * Revoke share link
     * DELETE /api/share/{shareLinkId}
     */
    @DeleteMapping("/{shareLinkId}")
    public ResponseEntity<ApiResponse<Void>> revokeShareLink(@PathVariable Long shareLinkId) {

        shareLinkService.revokeShareLink(shareLinkId);

        return ResponseEntity.ok(ApiResponse.success("Share link revoked successfully"));
    }

    // ❌ REMOVED: getQRCode endpoint

    /**
     * Build share link response (NO QR CODE URL)
     */
    private Map<String, Object> buildShareLinkResponse(SharedLink shareLink) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", shareLink.getId());
        data.put("linkToken", shareLink.getLinkToken());
        data.put("shareUrl", shareLink.getShareableUrl(baseUrl));
        // ❌ REMOVED: qrCodeUrl
        data.put("expiresAt", shareLink.getExpiresAt());
        data.put("isActive", shareLink.getIsActive());
        data.put("isPasswordProtected", shareLink.isPasswordProtected());
        data.put("allowDownload", shareLink.getAllowDownload());
        data.put("currentViews", shareLink.getCurrentViews());
        data.put("maxViews", shareLink.getMaxViews());
        data.put("createdAt", shareLink.getCreatedAt());

        if (shareLink.getDocument() != null) {
            Map<String, Object> doc = new HashMap<>();
            doc.put("id", shareLink.getDocument().getId());
            doc.put("filename", shareLink.getDocument().getOriginalFilename());
            doc.put("category", shareLink.getDocument().getCategory().getName());
            data.put("document", doc);
        }

        return data;
    }
}