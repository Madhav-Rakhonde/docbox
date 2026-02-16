package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
class UpdateDocumentRequest {

    private Long categoryId;

    private Long familyMemberId;

    private String notes;

    private String[] customTags;

    private Boolean isFavorite;

    private Boolean isArchived;

    private Boolean isOfflineAvailable;
}
