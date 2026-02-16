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
class DashboardStatsResponse {
    private Long totalDocuments;
    private Long totalFamilyMembers;
    private Long storageUsed; // in bytes
    private Long storageLimit; // in bytes
    private Double storagePercentage;

    private Long documentsExpiringSoon; // Next 30 days
    private Long expiredDocuments;

    private List<CategoryStats> documentsByCategory;
    private List<RecentActivity> recentActivities;
}
