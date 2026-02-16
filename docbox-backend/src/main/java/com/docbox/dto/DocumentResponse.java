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
class DocumentResponse {
    private Long id;
    private String originalFilename;
    private Long categoryId;
    private String categoryName;
    private Long familyMemberId;
    private String familyMemberName;
    private Long fileSize;
    private String fileType;
    private String thumbnailUrl;
    private Integer pageCount;

    // Permission info (for the requesting user)
    private PermissionLevel userPermission;
    private Boolean canView;
    private Boolean canDownload;
    private Boolean canShare;

    // Metadata
    private String documentNumber;
    private LocalDate issueDate;
    private LocalDate expiryDate;
    private Boolean isExpired;
    private Boolean isExpiringSoon;

    // Flags
    private Boolean isFavorite;
    private Boolean isArchived;
    private Boolean isOfflineAvailable;

    // OCR
    private Double ocrConfidence;
    private String autoCategoryDetected;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

