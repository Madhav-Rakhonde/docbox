package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.Document;
import com.docbox.entity.SharedLink;
import com.docbox.exception.InvalidShareLinkException;
import com.docbox.service.ShareLinkService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Share Link Controller
 *
 * All GET /api/share/** endpoints are public (no auth required).
 * See SecurityConfig — .requestMatchers("/api/share/**").permitAll()
 */
@RestController
@RequestMapping("/api/share")
public class ShareLinkController {

    @Value("${app.share.base-url:http://localhost:3000}")
    private String baseUrl;

    @Autowired
    private ShareLinkService shareLinkService;

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/share  — Create share link (auth required)
    // ─────────────────────────────────────────────────────────────────────────
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

            Integer expiryHours   = request.get("expiryHours")   != null ? Integer.parseInt(request.get("expiryHours").toString())   : null;
            String  password      = request.get("password")       != null ? request.get("password").toString()                        : null;
            Integer maxViews      = request.get("maxViews")       != null ? Integer.parseInt(request.get("maxViews").toString())       : null;
            Boolean allowDownload = request.get("allowDownload")  != null ? Boolean.parseBoolean(request.get("allowDownload").toString()) : true;

            SharedLink shareLink = shareLinkService.createShareLink(
                    documentId, expiryHours, password, maxViews, allowDownload);

            return ResponseEntity.ok(ApiResponse.success(
                    "Share link created successfully", buildShareLinkResponse(shareLink)));

        } catch (InvalidShareLinkException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An unexpected error occurred: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/share/{linkToken}  — Access shared document metadata (PUBLIC)
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/{linkToken}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> accessSharedDocument(
            @PathVariable String linkToken,
            @RequestParam(required = false) String password) {

        try {
            Document   document  = shareLinkService.accessSharedDocument(linkToken, password);
            SharedLink shareLink = shareLinkService.getShareLink(linkToken);

            Map<String, Object> response = new HashMap<>();
            response.put("documentId",       document.getId());
            response.put("originalFilename", document.getOriginalFilename());
            response.put("fileSize",         document.getFileSize());
            response.put("fileSizeKB",       document.getFileSizeInKB());
            response.put("fileSizeMB",       document.getFileSizeInMB());
            response.put("fileType",         document.getFileType());
            response.put("mimeType",         document.getMimeType());   // ✅ needed for inline view
            response.put("category",         document.getCategory().getName());
            response.put("uploadedAt",       document.getCreatedAt());
            response.put("currentViews",     shareLink.getCurrentViews());
            response.put("maxViews",         shareLink.getMaxViews());
            response.put("expiresAt",        shareLink.getExpiresAt());
            response.put("allowDownload",    shareLink.getAllowDownload());

            return ResponseEntity.ok(ApiResponse.success("Document accessed successfully", response));

        } catch (InvalidShareLinkException e) {
            // ✅ Return structured errors the frontend can handle by status code:
            //    "Password required" → 401
            //    "expired"           → 410
            //    "not found"         → 404
            //    anything else       → 403
            String msg = e.getMessage() != null ? e.getMessage() : "Invalid share link";

            if (msg.toLowerCase().contains("password required")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error(msg));
            } else if (msg.toLowerCase().contains("incorrect password")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error(msg));
            } else if (msg.toLowerCase().contains("expired")) {
                return ResponseEntity.status(HttpStatus.GONE)             // 410
                        .body(ApiResponse.error(msg));
            } else if (msg.toLowerCase().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)        // 404
                        .body(ApiResponse.error(msg));
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)        // 403
                        .body(ApiResponse.error(msg));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An unexpected error occurred. Please try again later."));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/share/{linkToken}/download  — Download file (PUBLIC)
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/{linkToken}/download")
    public ResponseEntity<?> downloadSharedDocument(
            @PathVariable String linkToken,
            @RequestParam(required = false) String password) {

        try {
            // ✅ getShareLink does NOT increment views — safe to call first
            SharedLink shareLink = shareLinkService.getShareLink(linkToken);
            Document   document  = shareLink.getDocument();

            byte[] fileBytes = shareLinkService.downloadSharedDocument(linkToken, password);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + document.getOriginalFilename() + "\"")
                    .contentType(MediaType.parseMediaType(
                            document.getMimeType() != null ? document.getMimeType() : "application/octet-stream"))
                    .contentLength(fileBytes.length)
                    .body(new ByteArrayResource(fileBytes));

        } catch (InvalidShareLinkException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Download failed: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/share/view/{linkToken}  — View file inline (PUBLIC)
    //
    // ✅ Uses shareLinkService.viewSharedDocument() — a dedicated method that:
    //    - Does NOT check allowDownload (viewing ≠ downloading)
    //    - Increments view count exactly once
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/view/{linkToken}")
    public ResponseEntity<?> viewSharedDocument(
            @PathVariable String linkToken,
            @RequestParam(required = false) String password) {

        try {
            // Get metadata first (no view increment) for filename + mimeType
            SharedLink shareLink = shareLinkService.getShareLink(linkToken);
            Document   document  = shareLink.getDocument();

            // ✅ viewSharedDocument: validates link + increments views + returns bytes
            //    Does NOT check allowDownload — view is always permitted on valid links
            byte[] fileBytes = shareLinkService.viewSharedDocument(linkToken, password);

            String mimeType = document.getMimeType() != null
                    ? document.getMimeType()
                    : "application/octet-stream";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + document.getOriginalFilename() + "\"")
                    .contentType(MediaType.parseMediaType(mimeType))
                    .contentLength(fileBytes.length)
                    .body(new ByteArrayResource(fileBytes));

        } catch (InvalidShareLinkException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Invalid share link";
            if (msg.toLowerCase().contains("password required") ||
                    msg.toLowerCase().contains("incorrect password")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error(msg));
            } else if (msg.toLowerCase().contains("expired")) {
                return ResponseEntity.status(HttpStatus.GONE)
                        .body(ApiResponse.error(msg));
            } else if (msg.toLowerCase().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error(msg));
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error(msg));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("View failed: " + e.getMessage()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/share/document/{documentId}  — Get share links for a doc
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/share/my-links
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/my-links")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyShareLinks() {

        List<SharedLink> shareLinks = shareLinkService.getMyShareLinks();

        List<Map<String, Object>> response = shareLinks.stream()
                .map(this::buildShareLinkResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(
                "Your share links retrieved successfully", response));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /api/share/{shareLinkId}
    // ─────────────────────────────────────────────────────────────────────────
    @PutMapping("/{shareLinkId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateShareLink(
            @PathVariable Long shareLinkId,
            @RequestBody Map<String, Object> request) {

        Integer expiryHours   = request.containsKey("expiryHours")   ? Integer.parseInt(request.get("expiryHours").toString())             : null;
        Integer maxViews      = request.containsKey("maxViews")       ? Integer.parseInt(request.get("maxViews").toString())                : null;
        Boolean allowDownload = request.containsKey("allowDownload")  ? Boolean.parseBoolean(request.get("allowDownload").toString())       : null;

        SharedLink shareLink = shareLinkService.updateShareLink(
                shareLinkId, expiryHours, maxViews, allowDownload);

        return ResponseEntity.ok(ApiResponse.success(
                "Share link updated successfully", buildShareLinkResponse(shareLink)));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/share/{shareLinkId}
    // ─────────────────────────────────────────────────────────────────────────
    @DeleteMapping("/{shareLinkId}")
    public ResponseEntity<ApiResponse<Void>> revokeShareLink(@PathVariable Long shareLinkId) {
        shareLinkService.revokeShareLink(shareLinkId);
        return ResponseEntity.ok(ApiResponse.success("Share link revoked successfully"));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper
    // ─────────────────────────────────────────────────────────────────────────
    private Map<String, Object> buildShareLinkResponse(SharedLink shareLink) {
        Map<String, Object> data = new HashMap<>();
        data.put("id",                shareLink.getId());
        data.put("linkToken",         shareLink.getLinkToken());
        data.put("shareUrl",          shareLink.getShareableUrl(baseUrl));
        data.put("expiresAt",         shareLink.getExpiresAt());
        data.put("isActive",          shareLink.getIsActive());
        data.put("isPasswordProtected", shareLink.isPasswordProtected());
        data.put("allowDownload",     shareLink.getAllowDownload());
        data.put("currentViews",      shareLink.getCurrentViews());
        data.put("maxViews",          shareLink.getMaxViews());
        data.put("createdAt",         shareLink.getCreatedAt());

        if (shareLink.getDocument() != null) {
            Map<String, Object> doc = new HashMap<>();
            doc.put("id",       shareLink.getDocument().getId());
            doc.put("filename", shareLink.getDocument().getOriginalFilename());
            doc.put("category", shareLink.getDocument().getCategory().getName());
            data.put("document", doc);
        }

        return data;
    }
}