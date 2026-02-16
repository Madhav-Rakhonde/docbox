package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
@Data
class GrantPermissionRequest {

    @NotNull(message = "Document ID is required")
    private Long documentId;

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Permission level is required")
    private PermissionLevel permissionLevel;

    private LocalDateTime expiresAt; // Optional - for temporary permissions

    private String notes;
}
