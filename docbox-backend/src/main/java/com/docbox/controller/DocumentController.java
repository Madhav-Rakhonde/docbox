package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.Document;
import com.docbox.entity.User;
import com.docbox.repository.UserRepository;
import com.docbox.service.DocumentService;
import com.docbox.service.FileHashService;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Document Controller - No Thumbnail or QR Code Generation
 */
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private static final Logger logger = LoggerFactory.getLogger(DocumentController.class);

    @Autowired
    private DocumentService documentService;

    @Autowired
    private FileHashService fileHashService;

    @Autowired
    private UserRepository userRepository;

    /**
     * ✅ Check for duplicate before upload
     */
    @PostMapping("/check-duplicate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkDuplicate(
            @RequestParam("file") MultipartFile file) {

        try {
            Long userId = SecurityUtils.getCurrentUserId();
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String fileHash = fileHashService.calculateFileHash(file);
            Optional<Document> existing = documentService.findDuplicateByHash(user, fileHash);

            Map<String, Object> result = new HashMap<>();

            if (existing.isPresent()) {
                Document duplicate = existing.get();
                result.put("isDuplicate", true);
                result.put("existingDocument", Map.of(
                        "id", duplicate.getId(),
                        "filename", duplicate.getOriginalFilename(),
                        "uploadedDate", duplicate.getCreatedAt().toString(),
                        "category", duplicate.getCategory() != null ? duplicate.getCategory().getName() : "Unknown"
                ));
                result.put("message", "This file already exists in your documents");
            } else {
                result.put("isDuplicate", false);
                result.put("message", "No duplicate found");
            }

            return ResponseEntity.ok(new ApiResponse<>(true, "Duplicate check complete", result));

        } catch (Exception e) {
            logger.error("Duplicate check failed", e);
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Duplicate check failed: " + e.getMessage(), null));
        }
    }

    /**
     * ✅ Upload document with force parameter
     */
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "categoryId", required = false) Long categoryId,
            @RequestParam(value = "familyMemberId", required = false) Long familyMemberId,
            @RequestParam(value = "expiryDate", required = false) String expiryDateStr,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam(value = "force", required = false, defaultValue = "false") Boolean force) {

        try {
            LocalDate expiryDate = null;
            if (expiryDateStr != null && !expiryDateStr.isEmpty()) {
                try {
                    expiryDate = LocalDate.parse(expiryDateStr);
                } catch (Exception e) {
                    logger.warn("Invalid date format: {}", expiryDateStr);
                }
            }

            Document document = documentService.uploadDocument(
                    file, categoryId, familyMemberId, expiryDate, notes, null, force);

            Map<String, Object> result = new HashMap<>();
            result.put("document", buildDocumentResponse(document));
            result.put("detectedCategory", document.getCategory().getName());

            String message = force
                    ? "Duplicate uploaded successfully! Auto-detected as: " + document.getCategory().getName()
                    : "Document uploaded successfully! Auto-detected as: " + document.getCategory().getName();

            return ResponseEntity.ok(ApiResponse.success(message, result));

        } catch (Exception e) {
            logger.error("Upload failed", e);
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    /**
     * ✅ Find all duplicates for current user
     */
    @GetMapping("/duplicates")
    public ResponseEntity<ApiResponse<List<Document>>> findDuplicates() {
        try {
            Long userId = SecurityUtils.getCurrentUserId();
            List<Document> duplicates = documentService.findDuplicates(userId);
            return ResponseEntity.ok(new ApiResponse<>(true, "Duplicates found", duplicates));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDocument(@PathVariable Long id) {
        Document document = documentService.getDocument(id);
        Map<String, Object> documentData = buildDocumentResponse(document);
        return ResponseEntity.ok(ApiResponse.success("Document retrieved successfully", documentData));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyDocuments() {
        List<Document> documents = documentService.getMyDocuments();
        Map<String, Object> response = new HashMap<>();
        response.put("documents", documents.stream().map(this::buildDocumentResponse).toList());
        response.put("totalElements", documents.size());
        return ResponseEntity.ok(ApiResponse.success("Documents retrieved successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateDocument(
            @PathVariable Long id, @RequestBody Map<String, Object> updates) {
        Document document = documentService.updateDocument(id, updates);
        Map<String, Object> documentData = buildDocumentResponse(document);
        return ResponseEntity.ok(ApiResponse.success("Document updated successfully", documentData));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id) {
        documentService.deleteDocument(id);
        return ResponseEntity.ok(ApiResponse.success("Document deleted successfully"));
    }

    /**
     * ✅ Download document
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(@PathVariable Long id) {
        Document document = documentService.getDocument(id);
        byte[] fileBytes = documentService.loadDocumentFile(document);
        ByteArrayResource resource = new ByteArrayResource(fileBytes);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + document.getOriginalFilename() + "\"")
                .contentType(MediaType.parseMediaType(
                        document.getMimeType() != null ? document.getMimeType() : "application/octet-stream"))
                .contentLength(fileBytes.length)
                .body(resource);
    }

    // ❌ REMOVED: Thumbnail endpoint

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDocumentsByCategory(@PathVariable Long categoryId) {
        List<Document> documents = documentService.getDocumentsByCategory(categoryId);
        Map<String, Object> response = new HashMap<>();
        response.put("documents", documents.stream().map(this::buildDocumentResponse).toList());
        response.put("totalElements", documents.size());
        response.put("categoryId", categoryId);
        return ResponseEntity.ok(ApiResponse.success("Documents retrieved successfully", response));
    }

    @GetMapping("/favorites")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFavorites() {
        List<Document> documents = documentService.getFavoriteDocuments();
        Map<String, Object> response = new HashMap<>();
        response.put("documents", documents.stream().map(this::buildDocumentResponse).toList());
        response.put("totalElements", documents.size());
        return ResponseEntity.ok(ApiResponse.success("Favorites retrieved", response));
    }

    @GetMapping("/archived")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getArchived() {
        List<Document> documents = documentService.getArchivedDocuments();
        Map<String, Object> response = new HashMap<>();
        response.put("documents", documents.stream().map(this::buildDocumentResponse).toList());
        response.put("totalElements", documents.size());
        return ResponseEntity.ok(ApiResponse.success("Archived documents retrieved", response));
    }

    @GetMapping("/expiring")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getExpiringDocuments(
            @RequestParam(defaultValue = "30") int days) {
        List<Document> documents = documentService.getExpiringDocuments(days);
        Map<String, Object> response = new HashMap<>();
        response.put("documents", documents.stream().map(this::buildDocumentResponse).toList());
        response.put("totalElements", documents.size());
        response.put("days", days);
        return ResponseEntity.ok(ApiResponse.success("Expiring documents retrieved", response));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStorageStats() {
        Map<String, Object> stats = documentService.getStorageStats();
        return ResponseEntity.ok(ApiResponse.success("Storage statistics retrieved", stats));
    }

    @PutMapping("/{id}/category")
    public ResponseEntity<ApiResponse<Map<String, Object>>> changeCategory(
            @PathVariable Long id, @RequestBody Map<String, Long> request) {
        Long categoryId = request.get("categoryId");
        try {
            Document document = documentService.changeCategory(id, categoryId);
            Map<String, Object> result = new HashMap<>();
            result.put("id", document.getId());
            result.put("originalFilename", document.getOriginalFilename());
            if (document.getCategory() != null) {
                Map<String, Object> categoryInfo = new HashMap<>();
                categoryInfo.put("id", document.getCategory().getId());
                categoryInfo.put("name", document.getCategory().getName());
                categoryInfo.put("icon", document.getCategory().getIcon());
                result.put("category", categoryInfo);
            }
            return ResponseEntity.ok(new ApiResponse<>(true, "Category updated successfully", result));
        } catch (Exception e) {
            logger.error("Failed to change category", e);
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Document>>> searchDocuments(@RequestParam String query) {
        try {
            List<Document> documents = documentService.searchDocuments(query);
            return ResponseEntity.ok(new ApiResponse<>(true, "Search results", documents));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    /**
     * Build document response object (NO THUMBNAIL)
     */
    private Map<String, Object> buildDocumentResponse(Document document) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", document.getId());
        data.put("originalFilename", document.getOriginalFilename());
        data.put("fileSize", document.getFileSize());
        data.put("fileType", document.getFileType());
        data.put("mimeType", document.getMimeType());
        data.put("hasThumbnail", false); // ✅ Always false now

        if (document.getCategory() != null) {
            Map<String, Object> category = new HashMap<>();
            category.put("id", document.getCategory().getId());
            category.put("name", document.getCategory().getName());
            category.put("icon", document.getCategory().getIcon());
            data.put("category", category);
        }

        if (document.getFamilyMember() != null) {
            try {
                Map<String, Object> familyMember = new HashMap<>();
                familyMember.put("id", document.getFamilyMember().getId());
                familyMember.put("name", document.getFamilyMember().getName());
                familyMember.put("relationship", document.getFamilyMember().getRelationship());
                data.put("familyMember", familyMember);
            } catch (Exception e) {
            }
        }

        if (document.getExpiryDate() != null) {
            data.put("expiryDate", document.getExpiryDate());
            data.put("isExpired", document.getExpiryDate().isBefore(LocalDate.now()));
            data.put("isExpiringSoon", document.getExpiryDate().isBefore(LocalDate.now().plusDays(30)));
        }

        data.put("isFavorite", document.getIsFavorite());
        data.put("isArchived", document.getIsArchived());
        data.put("isOfflineAvailable", document.getIsOfflineAvailable());

        if (document.getNotes() != null) {
            data.put("notes", document.getNotes());
        }

        data.put("createdAt", document.getCreatedAt());
        data.put("updatedAt", document.getUpdatedAt());

        return data;
    }
}