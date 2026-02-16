package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.DocumentCategory;
import com.docbox.service.DocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*")
public class CategoryController {

    @Autowired
    private DocumentService documentService;

    /**
     * ✅ Get all categories
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<DocumentCategory>>> getAllCategories() {
        List<DocumentCategory> categories = documentService.getAllCategories();
        return ResponseEntity.ok(new ApiResponse<>(true, "Categories retrieved", categories));
    }

    /**
     * ✅ Create custom category
     */
    @PostMapping
    public ResponseEntity<ApiResponse<DocumentCategory>> createCategory(
            @RequestBody Map<String, String> request) {

        String name = request.get("name");
        String icon = request.get("icon");
        String description = request.get("description");

        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Category name is required", null));
        }

        try {
            DocumentCategory category = documentService.createCategory(name, icon, description);
            return ResponseEntity.ok(new ApiResponse<>(true, "Category created successfully", category));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    /**
     * ✅ Update category
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentCategory>> updateCategory(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        String name = request.get("name");
        String icon = request.get("icon");
        String description = request.get("description");

        try {
            DocumentCategory category = documentService.updateCategory(id, name, icon, description);
            return ResponseEntity.ok(new ApiResponse<>(true, "Category updated", category));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }

    /**
     * ✅ Delete category
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteCategory(@PathVariable Long id) {
        try {
            documentService.deleteCategory(id);
            return ResponseEntity.ok(new ApiResponse<>(true, "Category deleted", "Success"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, e.getMessage(), null));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Failed to delete category", null));
        }
    }

    /**
     * ✅ Change document category
     */
    @PutMapping("/{categoryId}/documents/{documentId}")
    public ResponseEntity<ApiResponse<String>> changeDocumentCategory(
            @PathVariable Long categoryId,
            @PathVariable Long documentId) {

        try {
            documentService.changeCategory(documentId, categoryId);
            return ResponseEntity.ok(new ApiResponse<>(true, "Category changed successfully", "Success"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, e.getMessage(), null));
        }
    }
}