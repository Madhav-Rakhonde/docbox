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
class DocumentListResponse {
    private List<DocumentResponse> documents;
    private Integer currentPage;
    private Integer totalPages;
    private Long totalElements;
    private Boolean hasNext;
    private Boolean hasPrevious;
}
