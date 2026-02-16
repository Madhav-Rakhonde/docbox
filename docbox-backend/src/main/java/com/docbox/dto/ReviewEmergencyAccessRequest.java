package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
class ReviewEmergencyAccessRequest {

    @NotNull(message = "Request ID is required")
    private Long requestId;

    @NotNull(message = "Approval status is required")
    private Boolean approved;

    private String reviewNotes;

    private PermissionLevel grantedPermissionLevel; // If approved

    private LocalDateTime permissionExpiresAt; // Optional - temporary access
}
