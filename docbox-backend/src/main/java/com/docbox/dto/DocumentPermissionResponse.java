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
class DocumentPermissionResponse {
    private Long id;
    private Long documentId;
    private String documentName;
    private Long userId;
    private String userName;
    private PermissionLevel permissionLevel;
    private Long grantedById;
    private String grantedByName;
    private LocalDateTime grantedAt;
    private LocalDateTime expiresAt;
    private Boolean isActive;
    private Boolean isTemporary;
    private String notes;
}