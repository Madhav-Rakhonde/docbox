package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
@Data
class AddFamilyMemberRequest {

    @NotBlank(message = "Name is required")
    @Size(max = 255)
    private String name;

    @Size(max = 100)
    private String relationship; // Father, Mother, Son, Daughter, etc.

    private String dateOfBirth; // Format: DD/MM/YYYY

    private String profilePictureUrl;

    private Boolean createLoginAccount = false; // If true, create SUB_ACCOUNT

    private String email; // Required if createLoginAccount = true

    private String password; // Required if createLoginAccount = true
}

