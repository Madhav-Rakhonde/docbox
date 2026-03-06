package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.Document;
import com.docbox.entity.FamilyMember;
import com.docbox.entity.User;
import com.docbox.repository.DocumentRepository;
import com.docbox.repository.FamilyMemberRepository;
import com.docbox.repository.UserRepository;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Family Documents Controller
 * Allows primary account holders to view documents of their family members
 */
@RestController
@RequestMapping("/api/family")
public class FamilyDocumentsController {

    private static final Logger logger = LoggerFactory.getLogger(FamilyDocumentsController.class);

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    /**
     * Get all family members for the current user (primary account)
     */
    @GetMapping("/members")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getFamilyMembers() {
        try {
            Long userId = SecurityUtils.getCurrentUserId();
            User currentUser = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Only primary account can view family members
            if (!currentUser.isPrimaryAccount()) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only primary account holders can view family documents"));
            }

            // Get all family members
            List<FamilyMember> familyMembers = familyMemberRepository.findByPrimaryAccount(currentUser);

            // Build response with member details
            List<Map<String, Object>> response = familyMembers.stream()
                    .map(member -> {
                        Map<String, Object> memberData = new HashMap<>();
                        memberData.put("id", member.getId());
                        memberData.put("name", member.getName()); // ✅ Changed from fullName
                        memberData.put("relationship", member.getRelationship());
                        memberData.put("dateOfBirth", member.getDateOfBirth());
                        memberData.put("profilePictureUrl", member.getProfilePictureUrl());
                        memberData.put("createdAt", member.getCreatedAt());
                        memberData.put("hasLoginAccess", member.hasLoginAccess());

                        // ✅ Get email and phone from linked user account if exists
                        if (member.getUser() != null) {
                            User memberUser = member.getUser();
                            memberData.put("email", memberUser.getEmail());
                            memberData.put("phoneNumber", memberUser.getPhoneNumber());

                            // Count documents for this member
                            long docCount = documentRepository.countByUserId(memberUser.getId());
                            memberData.put("documentCount", docCount);
                        } else {
                            memberData.put("email", null);
                            memberData.put("phoneNumber", null);
                            memberData.put("documentCount", 0);
                        }

                        return memberData;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ApiResponse.success("Family members retrieved", response));

        } catch (Exception ex) {
            logger.error("Failed to get family members", ex);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve family members: " + ex.getMessage()));
        }
    }

    /**
     * Get all documents for a specific family member
     */
    @GetMapping("/members/{memberId}/documents")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMemberDocuments(
            @PathVariable Long memberId) {
        try {
            Long userId = SecurityUtils.getCurrentUserId();
            User currentUser = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Only primary account can view family member documents
            if (!currentUser.isPrimaryAccount()) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only primary account holders can view family documents"));
            }

            // Verify this family member belongs to the current user
            FamilyMember familyMember = familyMemberRepository.findById(memberId)
                    .orElseThrow(() -> new RuntimeException("Family member not found"));

            // ✅ Fixed: Use getPrimaryAccount() instead of getPrimaryAccountId()
            if (!familyMember.getPrimaryAccount().getId().equals(userId)) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Access denied: This family member does not belong to you"));
            }

            // ✅ Fixed: Get user from family member directly
            User memberUser = familyMember.getUser();
            if (memberUser == null) {
                // Family member doesn't have a user account (profile only)
                return ResponseEntity.ok(ApiResponse.success("No documents - member has no user account",
                        new ArrayList<>()));
            }

            // Get all documents for this family member
            List<Document> documents = documentRepository.findByUserId(memberUser.getId());

            // Build response with document details
            List<Map<String, Object>> response = documents.stream()
                    .map(doc -> {
                        Map<String, Object> docData = new HashMap<>();
                        docData.put("id", doc.getId());
                        docData.put("originalFilename", doc.getOriginalFilename());
                        docData.put("storedFilename", doc.getStoredFilename());
                        docData.put("fileSize", doc.getFileSize());
                        docData.put("mimeType", doc.getMimeType());
                        docData.put("uploadedAt", doc.getCreatedAt()); // ✅ Changed from uploadedAt to createdAt
                        docData.put("expiryDate", doc.getExpiryDate());
                        docData.put("isExpired", doc.isExpired());

                        // Category info
                        if (doc.getCategory() != null) {
                            Map<String, Object> categoryData = new HashMap<>();
                            categoryData.put("id", doc.getCategory().getId());
                            categoryData.put("name", doc.getCategory().getName());
                            categoryData.put("icon", doc.getCategory().getIcon());
                            docData.put("category", categoryData);
                        }

                        return docData;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(ApiResponse.success("Documents retrieved", response));

        } catch (Exception ex) {
            logger.error("Failed to get member documents", ex);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve documents: " + ex.getMessage()));
        }
    }

    /**
     * Get documents summary for a family member
     */
    @GetMapping("/members/{memberId}/documents/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMemberDocumentsSummary(
            @PathVariable Long memberId) {
        try {
            Long userId = SecurityUtils.getCurrentUserId();
            User currentUser = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!currentUser.isPrimaryAccount()) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only primary account holders can view family documents"));
            }

            // Verify family member belongs to current user
            FamilyMember familyMember = familyMemberRepository.findById(memberId)
                    .orElseThrow(() -> new RuntimeException("Family member not found"));

            // ✅ Fixed: Use getPrimaryAccount()
            if (!familyMember.getPrimaryAccount().getId().equals(userId)) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Access denied"));
            }

            // ✅ Fixed: Get user from family member directly
            User memberUser = familyMember.getUser();
            if (memberUser == null) {
                // Return empty summary for profile-only members
                Map<String, Object> summary = new HashMap<>();
                summary.put("totalDocuments", 0);
                summary.put("expiringDocuments", 0);
                summary.put("expiredDocuments", 0);
                summary.put("categoryBreakdown", new HashMap<>());
                return ResponseEntity.ok(ApiResponse.success("Summary retrieved", summary));
            }

            // Get document statistics
            List<Document> documents = documentRepository.findByUserId(memberUser.getId());

            long totalDocs = documents.size();
            long expiringDocs = documents.stream()
                    .filter(doc -> doc.getExpiryDate() != null)
                    .filter(doc -> {
                        long daysUntilExpiry = java.time.temporal.ChronoUnit.DAYS.between(
                                java.time.LocalDate.now(),
                                doc.getExpiryDate()
                        );
                        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                    })
                    .count();

            long expiredDocs = documents.stream()
                    .filter(Document::isExpired)
                    .count();

            // Category breakdown
            Map<String, Long> categoryBreakdown = documents.stream()
                    .filter(doc -> doc.getCategory() != null)
                    .collect(Collectors.groupingBy(
                            doc -> doc.getCategory().getName(),
                            Collectors.counting()
                    ));

            Map<String, Object> summary = new HashMap<>();
            summary.put("totalDocuments", totalDocs);
            summary.put("expiringDocuments", expiringDocs);
            summary.put("expiredDocuments", expiredDocs);
            summary.put("categoryBreakdown", categoryBreakdown);

            return ResponseEntity.ok(ApiResponse.success("Summary retrieved", summary));

        } catch (Exception ex) {
            logger.error("Failed to get documents summary", ex);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve summary: " + ex.getMessage()));
        }
    }

    /**
     * Get all family documents (all members combined)
     */
    @GetMapping("/documents/all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAllFamilyDocuments() {
        try {
            Long userId = SecurityUtils.getCurrentUserId();
            User currentUser = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!currentUser.isPrimaryAccount()) {
                return ResponseEntity.status(403)
                        .body(ApiResponse.error("Only primary account holders can view family documents"));
            }

            // Get all family members
            List<FamilyMember> familyMembers = familyMemberRepository.findByPrimaryAccount(currentUser);

            // Collect documents from all family members
            List<Map<String, Object>> allDocuments = new ArrayList<>();

            for (FamilyMember member : familyMembers) {
                User memberUser = member.getUser(); // ✅ Fixed: Get user directly
                if (memberUser != null) {
                    List<Document> documents = documentRepository.findByUserId(memberUser.getId());

                    for (Document doc : documents) {
                        Map<String, Object> docData = new HashMap<>();
                        docData.put("id", doc.getId());
                        docData.put("originalFilename", doc.getOriginalFilename());
                        docData.put("uploadedAt", doc.getCreatedAt()); // ✅ Changed from uploadedAt
                        docData.put("expiryDate", doc.getExpiryDate());
                        docData.put("isExpired", doc.isExpired());

                        // Member info
                        Map<String, Object> memberData = new HashMap<>();
                        memberData.put("id", member.getId());
                        memberData.put("name", member.getName()); // ✅ Changed from fullName
                        memberData.put("relationship", member.getRelationship());
                        docData.put("member", memberData);

                        // Category info
                        if (doc.getCategory() != null) {
                            Map<String, Object> categoryData = new HashMap<>();
                            categoryData.put("name", doc.getCategory().getName());
                            docData.put("category", categoryData);
                        }

                        allDocuments.add(docData);
                    }
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("totalDocuments", allDocuments.size());
            response.put("documents", allDocuments);

            return ResponseEntity.ok(ApiResponse.success("All family documents retrieved", response));

        } catch (Exception ex) {
            logger.error("Failed to get all family documents", ex);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to retrieve documents: " + ex.getMessage()));
        }
    }
}