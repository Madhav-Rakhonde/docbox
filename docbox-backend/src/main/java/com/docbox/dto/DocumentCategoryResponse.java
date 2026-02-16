package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import com.docbox.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;



@Data
@NoArgsConstructor
@AllArgsConstructor
class DocumentCategoryResponse {
    private Long id;
    private String name;
    private String icon;
    private Integer displayOrder;
    private String description;
    private Long documentCount; // Number of documents in this category for the user
}
