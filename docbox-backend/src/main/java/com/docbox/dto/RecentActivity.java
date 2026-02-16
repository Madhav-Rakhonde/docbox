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
class RecentActivity {
    private String action;
    private String documentName;
    private LocalDateTime timestamp;
}