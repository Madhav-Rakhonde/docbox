package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import com.docbox.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
class FamilyMemberResponse {
    private Long id;
    private String name;
    private String relationship;
    private LocalDate dateOfBirth;
    private String profilePictureUrl;
    private Boolean hasLoginAccess;
    private Long userId; // If has login access
    private LocalDateTime createdAt;
}
