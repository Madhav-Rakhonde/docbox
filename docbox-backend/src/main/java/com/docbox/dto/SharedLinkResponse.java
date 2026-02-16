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
class SharedLinkResponse {
    private Long id;
    private Long documentId;
    private String documentName;
    private String linkToken;
    private String shareUrl;
    private String qrCodeUrl;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private Boolean isPasswordProtected;
    private Integer maxViews;
    private Integer currentViews;
    private Boolean allowDownload;
    private Boolean isActive;
}
