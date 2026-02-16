package com.docbox.dto;

import lombok.Data;
import lombok.AllArgsConstructor;

@Data
@AllArgsConstructor
public class DuplicateDTO {
    private Long existingDocumentId;
    private String existingFilename;
    private String uploadedDate;
    private String message;
}