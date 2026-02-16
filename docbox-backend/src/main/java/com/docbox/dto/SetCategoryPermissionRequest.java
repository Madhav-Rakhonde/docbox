package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
class SetCategoryPermissionRequest {

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Permission level is required")
    private PermissionLevel defaultPermissionLevel;
}