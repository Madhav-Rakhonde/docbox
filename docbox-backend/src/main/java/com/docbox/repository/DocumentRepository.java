package com.docbox.repository;

import com.docbox.entity.Document;
import com.docbox.entity.DocumentCategory;
import com.docbox.entity.FamilyMember;
import com.docbox.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    // ========================================
    // BASIC QUERIES
    // ========================================

    List<Document> findByUser(User user);

    Page<Document> findByUser(User user, Pageable pageable);

    List<Document> findByUserAndCategory(User user, DocumentCategory category);

    Page<Document> findByUserAndCategory(User user, DocumentCategory category, Pageable pageable);

    List<Document> findByUserAndFamilyMember(User user, FamilyMember familyMember);

    Page<Document> findByUserAndFamilyMember(User user, FamilyMember familyMember, Pageable pageable);

    Optional<Document> findByStoredFilename(String storedFilename);

    // ========================================
    // ARCHIVED QUERIES
    // ========================================

    List<Document> findByUserAndIsArchivedFalse(User user);

    Page<Document> findByUserAndIsArchivedFalse(User user, Pageable pageable);

    // ✅ ADDED: Find archived documents by user
    List<Document> findByUserAndIsArchivedTrue(User user);

    Page<Document> findByUserAndIsArchivedTrue(User user, Pageable pageable);

    // ✅ ADDED: Find archived documents for primary account (including sub-accounts)
    @Query("SELECT d FROM Document d WHERE (d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "AND d.isArchived = true ORDER BY d.updatedAt DESC")
    List<Document> findArchivedDocumentsForPrimaryAccount(@Param("userId") Long userId);

    // ========================================
    // FAVORITE QUERIES
    // ========================================

    List<Document> findByUserAndIsFavoriteTrue(User user);

    Page<Document> findByUserAndIsFavoriteTrue(User user, Pageable pageable);

    // ✅ ADDED: Find favorite documents for primary account (including sub-accounts)
    @Query("SELECT d FROM Document d WHERE (d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "AND d.isFavorite = true ORDER BY d.updatedAt DESC")
    List<Document> findFavoriteDocumentsForPrimaryAccount(@Param("userId") Long userId);

    /**
     * Get storage used by category
     */
    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM Document d " +
            "JOIN d.category c " +
            "WHERE d.user.id = :userId AND c.name = :categoryName")
    Long getStorageByCategory(@Param("userId") Long userId, @Param("categoryName") String categoryName);



    // ✅ ADDED: Find by category and user
    List<Document> findByCategoryAndUser(DocumentCategory category, User user);

    Page<Document> findByCategoryAndUser(DocumentCategory category, User user, Pageable pageable);

    // ✅ ADDED: Find by category for primary account (including sub-accounts)
    @Query("SELECT d FROM Document d WHERE d.category = :category " +
            "AND (d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "ORDER BY d.createdAt DESC")
    List<Document> findByCategoryAndPrimaryAccount(@Param("category") DocumentCategory category,
                                                   @Param("userId") Long userId);

    // ========================================
    // EXPIRY QUERIES
    // ========================================

    @Query("SELECT d FROM Document d WHERE d.user.id IN " +
            "(SELECT u.id FROM User u WHERE u.id = :userId OR u.primaryAccount.id = :userId) " +
            "AND d.expiryDate IS NOT NULL AND d.expiryDate < :date AND d.isArchived = false")
    List<Document> findExpiredDocuments(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Query("SELECT d FROM Document d WHERE d.user.id IN " +
            "(SELECT u.id FROM User u WHERE u.id = :userId OR u.primaryAccount.id = :userId) " +
            "AND d.expiryDate IS NOT NULL AND d.expiryDate BETWEEN :startDate AND :endDate AND d.isArchived = false")
    List<Document> findDocumentsExpiringBetween(@Param("userId") Long userId,
                                                @Param("startDate") LocalDate startDate,
                                                @Param("endDate") LocalDate endDate);

    // Original search with pagination
    @Query("SELECT d FROM Document d WHERE d.user.id IN " +
            "(SELECT u.id FROM User u WHERE u.id = :userId OR u.primaryAccount.id = :userId) " +
            "AND (LOWER(d.originalFilename) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(d.documentNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(d.notes) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND d.isArchived = false")
    Page<Document> searchDocuments(@Param("userId") Long userId,
                                   @Param("searchTerm") String searchTerm,
                                   Pageable pageable);

    // ✅ ADDED: Search documents by user (no pagination)
    @Query("SELECT d FROM Document d WHERE d.user = :user " +
            "AND (LOWER(d.originalFilename) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(d.notes) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(d.documentNumber) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY d.createdAt DESC")
    List<Document> searchDocumentsByUser(@Param("user") User user, @Param("query") String query);

    // ✅ ADDED: Search documents for primary account (including sub-accounts)
    @Query("SELECT d FROM Document d WHERE (d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "AND (LOWER(d.originalFilename) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(d.notes) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(d.documentNumber) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY d.createdAt DESC")
    List<Document> searchDocumentsForPrimaryAccount(@Param("userId") Long userId, @Param("query") String query);


    @Query("SELECT SUM(d.fileSize) FROM Document d WHERE d.user.id = :userId OR d.user.primaryAccount.id = :userId")
    Long getTotalStorageUsed(@Param("userId") Long userId);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.user.id = :userId OR d.user.primaryAccount.id = :userId")
    long getTotalDocumentCount(@Param("userId") Long userId);

    @Query("SELECT d.category.name, COUNT(d) FROM Document d WHERE " +
            "(d.user.id = :userId OR d.user.primaryAccount.id = :userId) AND d.isArchived = false " +
            "GROUP BY d.category.name")
    List<Object[]> getDocumentCountByCategory(@Param("userId") Long userId);

    @Query("SELECT d.fileType, COUNT(d) FROM Document d WHERE " +
            "(d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "GROUP BY d.fileType")
    List<Object[]> getDocumentCountByFileType(@Param("userId") Long userId);

    @Query("SELECT d.category.name, SUM(d.fileSize) FROM Document d WHERE " +
            "(d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "GROUP BY d.category.name")
    List<Object[]> getStorageByCategory(@Param("userId") Long userId);

    @Query("SELECT d.fileType, SUM(d.fileSize) FROM Document d WHERE " +
            "(d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "GROUP BY d.fileType")
    List<Object[]> getStorageByFileType(@Param("userId") Long userId);


    List<Document> findByUserAndIsOfflineAvailableTrue(User user);

    @Query("SELECT d FROM Document d WHERE d.user.id = :userId AND d.isOfflineAvailable = true ORDER BY d.updatedAt DESC")
    List<Document> findOfflineDocuments(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT d FROM Document d WHERE d.user.id = :userId AND d.isOfflineAvailable = true ORDER BY d.createdAt DESC")
    List<Document> findOfflineDocumentsForPrimaryAccount(@Param("userId") Long userId);

    @Query("SELECT d FROM Document d WHERE d.user = :user AND d.isOfflineAvailable = true ORDER BY d.createdAt DESC")
    List<Document> findOfflineDocumentsByUser(@Param("user") User user);


    // All documents for a primary account (including sub-accounts)
    @Query("SELECT d FROM Document d WHERE d.user.id = :userId OR d.user.primaryAccount.id = :userId")
    List<Document> findAllDocumentsForPrimaryAccount(@Param("userId") Long userId);

    @Query("SELECT d FROM Document d WHERE d.user.id = :userId OR d.user.primaryAccount.id = :userId")
    Page<Document> findAllDocumentsForPrimaryAccount(@Param("userId") Long userId, Pageable pageable);

    Optional<Document> findByUserAndFileHash(User user, String fileHash);

    /**
     * ✅ Find all duplicates by hash across all users (for admin)
     */
    List<Document> findByFileHash(String fileHash);

    /**
     * ✅ Check if duplicate exists for user
     */
    @Query("SELECT COUNT(d) > 0 FROM Document d WHERE d.user.id = :userId AND d.fileHash = :fileHash")
    boolean existsByUserIdAndFileHash(@Param("userId") Long userId, @Param("fileHash") String fileHash);
}