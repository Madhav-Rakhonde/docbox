package com.docbox.service;

import com.docbox.entity.Document;
import com.docbox.entity.User;
import com.docbox.repository.*;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Analytics Service
 * Provides dashboard statistics, insights, and analytics
 */
@Service
public class AnalyticsService {

    private static final Logger logger = LoggerFactory.getLogger(AnalyticsService.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private EmergencyAccessRequestRepository emergencyAccessRequestRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Get dashboard statistics
     */
    public Map<String, Object> getDashboardStats() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId).orElse(null);

        Map<String, Object> stats = new HashMap<>();

        // Document stats
        long totalDocuments = documentRepository.getTotalDocumentCount(userId);
        Long storageUsed = documentRepository.getTotalStorageUsed(userId);

        stats.put("totalDocuments", totalDocuments);
        stats.put("storageUsedBytes", storageUsed != null ? storageUsed : 0L);
        stats.put("storageUsedMB", storageUsed != null ? storageUsed / (1024 * 1024) : 0L);
        stats.put("storageLimit", 5368709120L); // 5GB default
        stats.put("storagePercentage", calculateStoragePercentage(storageUsed, 5368709120L));

        // Expiring documents
        List<Document> expiringSoon = documentRepository.findDocumentsExpiringBetween(
                userId, LocalDate.now(), LocalDate.now().plusDays(30));
        stats.put("documentsExpiringSoon", expiringSoon.size());

        // Expired documents
        List<Document> expired = documentRepository.findExpiredDocuments(
                userId, LocalDate.now());
        stats.put("expiredDocuments", expired.size());

        // Category breakdown
        List<Object[]> categoryBreakdown = documentRepository.getDocumentCountByCategory(userId);
        stats.put("documentsByCategory", buildCategoryBreakdown(categoryBreakdown));

        // Family stats (if primary account)
        if (user != null && user.isPrimaryAccount()) {
            long familyMembers = familyMemberRepository.countByPrimaryAccountId(userId);
            stats.put("totalFamilyMembers", familyMembers);

            long pendingRequests = emergencyAccessRequestRepository
                    .countPendingRequestsForPrimaryAccount(userId);
            stats.put("pendingEmergencyRequests", pendingRequests);
        }

        logger.debug("Dashboard stats generated for user {}", userId);

        return stats;
    }

    /**
     * Get document statistics
     */
    public Map<String, Object> getDocumentStats() {
        Long userId = SecurityUtils.getCurrentUserId();

        Map<String, Object> stats = new HashMap<>();

        // Count by file type
        List<Object[]> byFileType = documentRepository.getDocumentCountByFileType(userId);
        stats.put("byFileType", buildFileTypeBreakdown(byFileType));

        // Average file size
        Long totalStorage = documentRepository.getTotalStorageUsed(userId);
        long totalDocs = documentRepository.getTotalDocumentCount(userId);
        long avgFileSize = totalDocs > 0 ? (totalStorage != null ? totalStorage / totalDocs : 0) : 0;
        stats.put("averageFileSizeBytes", avgFileSize);
        stats.put("averageFileSizeMB", avgFileSize / (1024 * 1024));

        // Most common categories
        List<Object[]> categoryStats = documentRepository.getDocumentCountByCategory(userId);
        stats.put("topCategories", categoryStats.stream()
                .limit(5)
                .map(arr -> Map.of(
                        "category", arr[0],
                        "count", arr[1]
                ))
                .collect(Collectors.toList()));

        return stats;
    }

    /**
     * Get activity timeline
     */
    public List<Map<String, Object>> getActivityTimeline(int days) {
        // Return empty list for now - would need DocumentAuditLog queries
        return new ArrayList<>();
    }

    /**
     * Get expiry insights
     */
    public Map<String, Object> getExpiryInsights() {
        Long userId = SecurityUtils.getCurrentUserId();

        Map<String, Object> insights = new HashMap<>();

        // Expiring in next 7 days
        List<Document> next7Days = documentRepository.findDocumentsExpiringBetween(
                userId, LocalDate.now(), LocalDate.now().plusDays(7));
        insights.put("expiringIn7Days", next7Days.size());
        insights.put("urgentDocuments", buildDocumentList(next7Days));

        // Expiring in 8-30 days
        List<Document> next30Days = documentRepository.findDocumentsExpiringBetween(
                userId, LocalDate.now().plusDays(8), LocalDate.now().plusDays(30));
        insights.put("expiringIn30Days", next30Days.size());

        // Already expired
        List<Document> expired = documentRepository.findExpiredDocuments(
                userId, LocalDate.now());
        insights.put("expired", expired.size());
        insights.put("expiredDocuments", buildDocumentList(expired));

        // By category
        Map<String, Long> expiringByCategory = next7Days.stream()
                .collect(Collectors.groupingBy(
                        doc -> doc.getCategory().getName(),
                        Collectors.counting()
                ));
        insights.put("expiringByCategory", expiringByCategory);

        return insights;
    }

    /**
     * Get sharing statistics
     */
    public Map<String, Object> getSharingStats() {
        Long userId = SecurityUtils.getCurrentUserId();

        Map<String, Object> stats = new HashMap<>();

        // These would need SharedLinkRepository queries
        // For now, return default values
        stats.put("totalShareLinks", 0);
        stats.put("activeShareLinks", 0);
        stats.put("totalViews", 0);
        stats.put("mostViewedLinks", new ArrayList<>());

        return stats;
    }

    /**
     * Get storage insights
     */
    public Map<String, Object> getStorageInsights() {
        Long userId = SecurityUtils.getCurrentUserId();

        Map<String, Object> insights = new HashMap<>();

        Long totalStorage = documentRepository.getTotalStorageUsed(userId);
        long storageBytes = totalStorage != null ? totalStorage : 0L;

        insights.put("totalStorageBytes", storageBytes);
        insights.put("totalStorageMB", storageBytes / (1024 * 1024));
        insights.put("totalStorageGB", storageBytes / (1024.0 * 1024.0 * 1024.0));

        // Storage by category
        List<Object[]> storageByCategory = documentRepository.getStorageByCategory(userId);
        insights.put("storageByCategory", storageByCategory.stream()
                .map(arr -> Map.of(
                        "category", arr[0],
                        "bytes", arr[1],
                        "mb", ((Long) arr[1]) / (1024 * 1024)
                ))
                .collect(Collectors.toList()));

        // Storage by file type
        List<Object[]> storageByType = documentRepository.getStorageByFileType(userId);
        insights.put("storageByFileType", storageByType.stream()
                .map(arr -> Map.of(
                        "fileType", arr[0],
                        "bytes", arr[1],
                        "mb", ((Long) arr[1]) / (1024 * 1024)
                ))
                .collect(Collectors.toList()));

        return insights;
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    private double calculateStoragePercentage(Long used, long limit) {
        if (used == null || limit == 0) return 0.0;
        return (used * 100.0) / limit;
    }

    private List<Map<String, Object>> buildCategoryBreakdown(List<Object[]> data) {
        return data.stream()
                .map(arr -> {
                    Map<String, Object> category = new HashMap<>();
                    category.put("name", arr[0]);
                    category.put("count", arr[1]);
                    return category;
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildFileTypeBreakdown(List<Object[]> data) {
        return data.stream()
                .map(arr -> {
                    Map<String, Object> fileType = new HashMap<>();
                    fileType.put("type", arr[0]);
                    fileType.put("count", arr[1]);
                    return fileType;
                })
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildDocumentList(List<Document> documents) {
        return documents.stream()
                .map(doc -> {
                    Map<String, Object> data = new HashMap<>();
                    data.put("id", doc.getId());
                    data.put("filename", doc.getOriginalFilename());
                    data.put("category", doc.getCategory().getName());
                    data.put("expiryDate", doc.getExpiryDate());
                    data.put("daysUntilExpiry", doc.getDaysUntilExpiry());
                    return data;
                })
                .collect(Collectors.toList());
    }
}