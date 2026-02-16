package com.docbox.dto;

import jakarta.validation.constraints.NotNull;

import com.docbox.enums.PermissionLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
@Data
class RevokePermissionRequest {

    @NotNull(message = "Document ID is required")
    private Long documentId;

    @NotNull(message = "User ID is required")
    private Long userId;

    private String reason;
}
