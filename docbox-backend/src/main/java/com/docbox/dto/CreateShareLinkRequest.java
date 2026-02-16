package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
@Data
class CreateShareLinkRequest {

    @NotNull(message = "Document ID is required")
    private Long documentId;

    @NotNull(message = "Expiry hours is required")
    private Integer expiryHours; // 24, 48, 72, or custom

    private String password; // Optional password protection

    private Integer maxViews; // Optional view limit

    private Boolean allowDownload = false;
}
