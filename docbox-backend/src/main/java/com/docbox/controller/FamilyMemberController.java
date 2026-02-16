package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.FamilyMember;
import com.docbox.service.FamilyMemberService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/family-members")
public class FamilyMemberController {

    @Autowired
    private FamilyMemberService familyMemberService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FamilyMember>>> getAllFamilyMembers() {
        List<FamilyMember> members = familyMemberService.getMyFamilyMembers();
        return ResponseEntity.ok(ApiResponse.success(
                "Family members retrieved successfully", members));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FamilyMember>> getFamilyMember(@PathVariable Long id) {
        FamilyMember member = familyMemberService.getFamilyMember(id);
        return ResponseEntity.ok(ApiResponse.success(
                "Family member retrieved successfully", member));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> addFamilyMember(
            @RequestBody Map<String, Object> request) {

        String name = request.get("name").toString();
        String relationship = request.get("relationship").toString();
        String role = request.get("role") != null ? request.get("role").toString() : "PROFILE_ONLY";

        String dateOfBirth = request.containsKey("dateOfBirth") && request.get("dateOfBirth") != null
                ? request.get("dateOfBirth").toString() : null;
        String email = request.containsKey("email") && request.get("email") != null
                ? request.get("email").toString() : null;
        String phoneNumber = request.containsKey("phoneNumber") && request.get("phoneNumber") != null
                ? request.get("phoneNumber").toString() : null;

        Map<String, Object> result;

        if ("SUB_ACCOUNT".equals(role)) {
            String username = request.get("username").toString();
            String password = request.get("password").toString();

            result = familyMemberService.createSubAccountMember(
                    name, relationship, email, phoneNumber, dateOfBirth, username, password);
        } else {
            result = familyMemberService.createProfileOnlyMember(
                    name, relationship, email, phoneNumber, dateOfBirth);
        }

        return ResponseEntity.ok(ApiResponse.success(
                "Family member added successfully", result));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FamilyMember>> updateFamilyMember(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {

        FamilyMember updated = familyMemberService.updateFamilyMember(id, request);

        return ResponseEntity.ok(ApiResponse.success(
                "Family member updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFamilyMember(@PathVariable Long id) {
        familyMemberService.deleteFamilyMember(id);
        return ResponseEntity.ok(ApiResponse.success("Family member deleted successfully"));
    }
}