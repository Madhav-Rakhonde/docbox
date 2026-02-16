package com.docbox.dto;

import com.docbox.enums.PermissionLevel;
import com.docbox.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;



@Data
@NoArgsConstructor
@AllArgsConstructor
class CategoryStats {
    private String categoryName;
    private Long count;
}
