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
class EmergencyAccessRequestResponse {
    private Long id;
    private Long documentId;
    private String documentName;
    private Long requestedById;
    private String requestedByName;
    private String requestReason;
    private String status; // PENDING, APPROVED, REJECTED
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;
    private String reviewedByName;
    private String reviewNotes;
}
