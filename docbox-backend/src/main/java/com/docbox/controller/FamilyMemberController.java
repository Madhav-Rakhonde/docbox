package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.FamilyMember;
import com.docbox.service.FamilyMemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/family-members")
public class FamilyMemberController {

    @Autowired
    private FamilyMemberService familyMemberService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllFamilyMembers() {
        List<FamilyMember> familyMembers = familyMemberService.getMyFamilyMembers();
        List<Map<String, Object>> response = familyMembers.stream()
                .map(this::buildFamilyMemberResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Family members retrieved successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFamilyMember(@PathVariable Long id) {
        FamilyMember familyMember = familyMemberService.getFamilyMember(id);
        Map<String, Object> response = buildFamilyMemberResponse(familyMember);
        return ResponseEntity.ok(ApiResponse.success("Family member retrieved successfully", response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createFamilyMember(@RequestBody Map<String, Object> request) {
        String name = (String) request.get("name");
        String relationship = (String) request.get("relationship");
        String dateOfBirthStr = (String) request.get("dateOfBirth");
        String accountType = (String) request.get("accountType");
        String role = (String) request.get("role");
        String email = (String) request.get("email");
        String username = (String) request.get("username");
        String password = (String) request.get("password");
        String phoneNumber = (String) request.get("phoneNumber");

        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Name is required"));
        }
        if (relationship == null || relationship.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Relationship is required"));
        }

        boolean isSubAccount = "sub_account".equals(accountType) || "SUB_ACCOUNT".equals(accountType) || "SUB_ACCOUNT".equals(role);

        if (isSubAccount) {
            if (email == null || email.trim().isEmpty()) email = username;
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Email/Username is required for sub-accounts"));
            }
            if (password == null || password.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Password is required for sub-accounts"));
            }
        }

        Map<String, Object> result;
        if (isSubAccount) {
            result = familyMemberService.createSubAccountMember(name, relationship, email, phoneNumber, dateOfBirthStr, email, password);
        } else {
            result = familyMemberService.createProfileOnlyMember(name, relationship, email, phoneNumber, dateOfBirthStr);
        }

        FamilyMember familyMember = (FamilyMember) result.get("member");
        Map<String, Object> response = buildFamilyMemberResponse(familyMember);
        return ResponseEntity.ok(ApiResponse.success("Family member created successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateFamilyMember(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        Map<String, Object> updates = new HashMap<>();

        // ✅ FIX: Null-safe extraction of all fields
        String name = (String) request.get("name");
        if (name != null && !name.trim().isEmpty()) {
            updates.put("name", name.trim());
        }

        String relationship = (String) request.get("relationship");
        if (relationship != null && !relationship.trim().isEmpty()) {
            updates.put("relationship", relationship.trim());
        }

        String dateOfBirthStr = (String) request.get("dateOfBirth");
        if (dateOfBirthStr != null && !dateOfBirthStr.isEmpty()) {
            try {
                LocalDate.parse(dateOfBirthStr);
                updates.put("dateOfBirth", dateOfBirthStr);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Invalid date format. Use YYYY-MM-DD"));
            }
        }

        // ✅ FIX: Pass all role fields
        String accountType = (String) request.get("accountType");
        if (accountType != null) {
            updates.put("accountType", accountType);
        }

        String role = (String) request.get("role");
        if (role != null) {
            updates.put("role", role);
        }

        Boolean isSubAccount = (Boolean) request.get("isSubAccount");
        if (isSubAccount != null) {
            updates.put("isSubAccount", isSubAccount);
        }

        // ✅ FIX: Null-safe email/username extraction
        String email = (String) request.get("email");
        String username = (String) request.get("username");
        if (email != null && !email.trim().isEmpty()) {
            updates.put("email", email.trim());
        } else if (username != null && !username.trim().isEmpty()) {
            updates.put("email", username.trim());
        }

        String phoneNumber = (String) request.get("phoneNumber");
        if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
            updates.put("phoneNumber", phoneNumber.trim());
        }

        String password = (String) request.get("password");
        if (password != null && !password.trim().isEmpty()) {
            updates.put("password", password);
        }

        FamilyMember familyMember = familyMemberService.updateFamilyMember(id, updates);
        Map<String, Object> response = buildFamilyMemberResponse(familyMember);
        return ResponseEntity.ok(ApiResponse.success("Family member updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFamilyMember(@PathVariable Long id) {
        familyMemberService.deleteFamilyMember(id);
        return ResponseEntity.ok(ApiResponse.success("Family member deleted successfully"));
    }

    private Map<String, Object> buildFamilyMemberResponse(FamilyMember fm) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", fm.getId());
        data.put("name", fm.getName());
        data.put("relationship", fm.getRelationship());
        data.put("dateOfBirth", fm.getDateOfBirth());
        data.put("profilePictureUrl", fm.getProfilePictureUrl());
        data.put("createdAt", fm.getCreatedAt());
        data.put("updatedAt", fm.getUpdatedAt());

        if (fm.getUser() != null) {
            data.put("userId", fm.getUser().getId());
            data.put("user_id", fm.getUser().getId());
            data.put("username", fm.getUser().getEmail());
            data.put("email", fm.getUser().getEmail());
            data.put("phoneNumber", fm.getUser().getPhoneNumber());
            data.put("role", "SUB_ACCOUNT");
            data.put("isSubAccount", true);
            data.put("accountType", "sub_account");

            Map<String, Object> userData = new HashMap<>();
            userData.put("id", fm.getUser().getId());
            userData.put("email", fm.getUser().getEmail());
            userData.put("fullName", fm.getUser().getFullName());
            userData.put("phoneNumber", fm.getUser().getPhoneNumber());
            userData.put("isActive", fm.getUser().getIsActive());
            userData.put("role", fm.getUser().getRole());
            data.put("user", userData);
        } else {
            data.put("userId", null);
            data.put("user_id", null);
            data.put("username", null);
            data.put("role", "PROFILE_ONLY");
            data.put("isSubAccount", false);
            data.put("accountType", "profile_only");
            data.put("user", null);
        }

        if (fm.getPrimaryAccount() != null) {
            data.put("primaryAccountId", fm.getPrimaryAccount().getId());
        }

        return data;
    }
}