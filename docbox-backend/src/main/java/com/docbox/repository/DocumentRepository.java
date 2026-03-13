package com.docbox.repository;

import com.docbox.entity.Document;
import com.docbox.entity.DocumentCategory;
import com.docbox.entity.FamilyMember;
import com.docbox.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
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
    // BASIC QUERIES — @EntityGraph eagerly loads category/familyMember/user
    // so controllers never hit LazyInitializationException
    // ========================================

    @EntityGraph(attributePaths = {"category", "familyMember"})
    List<Document> findByUser(User user);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    Page<Document> findByUser(User user, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    List<Document> findByUserAndCategory(User user, DocumentCategory category);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    Page<Document> findByUserAndCategory(User user, DocumentCategory category, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    List<Document> findByUserAndFamilyMember(User user, FamilyMember familyMember);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    Page<Document> findByUserAndFamilyMember(User user, FamilyMember familyMember, Pageable pageable);

    Optional<Document> findByStoredFilename(String storedFilename);

    @Query("SELECT d FROM Document d JOIN FETCH d.category LEFT JOIN FETCH d.familyMember LEFT JOIN FETCH d.user WHERE d.id = :id")
    Optional<Document> findByIdWithCategory(@Param("id") Long id);

    // ========================================
    // ARCHIVED QUERIES
    // ========================================

    @EntityGraph(attributePaths = {"category", "familyMember"})
    List<Document> findByUserAndIsArchivedFalse(User user);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    Page<Document> findByUserAndIsArchivedFalse(User user, Pageable pageable);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    List<Document> findByUserAndIsArchivedTrue(User user);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    Page<Document> findByUserAndIsArchivedTrue(User user, Pageable pageable);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE (d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "AND d.isArchived = true ORDER BY d.updatedAt DESC")
    List<Document> findArchivedDocumentsForPrimaryAccount(@Param("userId") Long userId);

    // ========================================
    // FAVORITE QUERIES
    // ========================================

    @EntityGraph(attributePaths = {"category", "familyMember"})
    List<Document> findByUserAndIsFavoriteTrue(User user);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    Page<Document> findByUserAndIsFavoriteTrue(User user, Pageable pageable);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE (d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "AND d.isFavorite = true ORDER BY d.updatedAt DESC")
    List<Document> findFavoriteDocumentsForPrimaryAccount(@Param("userId") Long userId);

    // ========================================
    // CATEGORY QUERIES
    // ========================================

    @EntityGraph(attributePaths = {"category", "familyMember"})
    List<Document> findByCategoryAndUser(DocumentCategory category, User user);

    @EntityGraph(attributePaths = {"category", "familyMember"})
    Page<Document> findByCategoryAndUser(DocumentCategory category, User user, Pageable pageable);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE d.category = :category " +
            "AND (d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "ORDER BY d.createdAt DESC")
    List<Document> findByCategoryAndPrimaryAccount(@Param("category") DocumentCategory category,
                                                   @Param("userId") Long userId);

    long countByCategory(DocumentCategory category);

    // ========================================
    // EXPIRY QUERIES
    // ========================================

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE d.user.id IN " +
            "(SELECT u.id FROM User u WHERE u.id = :userId OR u.primaryAccount.id = :userId) " +
            "AND d.expiryDate IS NOT NULL AND d.expiryDate < :date AND d.isArchived = false")
    List<Document> findExpiredDocuments(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE d.user.id IN " +
            "(SELECT u.id FROM User u WHERE u.id = :userId OR u.primaryAccount.id = :userId) " +
            "AND d.expiryDate IS NOT NULL AND d.expiryDate BETWEEN :startDate AND :endDate AND d.isArchived = false")
    List<Document> findDocumentsExpiringBetween(@Param("userId") Long userId,
                                                @Param("startDate") LocalDate startDate,
                                                @Param("endDate") LocalDate endDate);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE d.user.id IN " +
            "(SELECT u.id FROM User u WHERE u.id = :userId OR u.primaryAccount.id = :userId) " +
            "AND d.expiryDate IS NOT NULL AND d.expiryDate BETWEEN :startDate AND :endDate " +
            "AND d.isArchived = false ORDER BY d.expiryDate ASC")
    List<Document> findExpiringDocuments(@Param("userId") Long userId,
                                         @Param("startDate") LocalDate startDate,
                                         @Param("endDate") LocalDate endDate);

    // ========================================
    // SEARCH QUERIES
    // ========================================

    @Query("SELECT d FROM Document d WHERE d.user.id IN " +
            "(SELECT u.id FROM User u WHERE u.id = :userId OR u.primaryAccount.id = :userId) " +
            "AND (LOWER(d.originalFilename) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(d.documentNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(d.notes) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND d.isArchived = false")
    Page<Document> searchDocuments(@Param("userId") Long userId,
                                   @Param("searchTerm") String searchTerm,
                                   Pageable pageable);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE d.user.id IN " +
            "(SELECT u.id FROM User u WHERE u.id = :userId OR u.primaryAccount.id = :userId) " +
            "AND (LOWER(d.originalFilename) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(d.documentNumber) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
            "OR LOWER(d.notes) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
            "AND d.isArchived = false ORDER BY d.createdAt DESC")
    List<Document> searchDocuments(@Param("userId") Long userId,
                                   @Param("searchTerm") String searchTerm);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE d.user = :user " +
            "AND (LOWER(d.originalFilename) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(d.notes) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(d.documentNumber) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY d.createdAt DESC")
    List<Document> searchDocumentsByUser(@Param("user") User user, @Param("query") String query);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE (d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "AND (LOWER(d.originalFilename) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(d.notes) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "OR LOWER(d.documentNumber) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY d.createdAt DESC")
    List<Document> searchDocumentsForPrimaryAccount(@Param("userId") Long userId, @Param("query") String query);

    // ========================================
    // STORAGE / STATS QUERIES
    // ========================================

    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM Document d " +
            "JOIN d.category c " +
            "WHERE d.user.id = :userId AND c.name = :categoryName")
    Long getStorageByCategory(@Param("userId") Long userId, @Param("categoryName") String categoryName);

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

    // ========================================
    // OFFLINE QUERIES
    // ========================================

    @EntityGraph(attributePaths = {"category", "familyMember"})
    List<Document> findByUserAndIsOfflineAvailableTrue(User user);

    @Query("SELECT d FROM Document d WHERE d.user.id = :userId AND d.isOfflineAvailable = true ORDER BY d.updatedAt DESC")
    List<Document> findOfflineDocuments(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category " +
            "WHERE d.user.id = :userId AND d.isOfflineAvailable = true ORDER BY d.createdAt DESC")
    List<Document> findOfflineDocumentsForPrimaryAccount(@Param("userId") Long userId);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category " +
            "WHERE d.user = :user AND d.isOfflineAvailable = true ORDER BY d.createdAt DESC")
    List<Document> findOfflineDocumentsByUser(@Param("user") User user);

    // ========================================
    // PRIMARY ACCOUNT QUERIES — LEFT JOIN FETCH prevents LazyInitializationException
    // ========================================

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE d.user.id = :userId OR d.user.primaryAccount.id = :userId")
    List<Document> findAllDocumentsForPrimaryAccount(@Param("userId") Long userId);

    @Query("SELECT d FROM Document d WHERE d.user.id = :userId OR d.user.primaryAccount.id = :userId")
    Page<Document> findAllDocumentsForPrimaryAccount(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE (d.user.id = :userId OR d.user.primaryAccount.id = :userId) " +
            "AND d.category.id = :categoryId ORDER BY d.createdAt DESC")
    List<Document> findByCategoryForPrimaryAccount(@Param("userId") Long userId,
                                                   @Param("categoryId") Long categoryId);

    // ========================================
    // DUPLICATE / HASH QUERIES
    // ========================================

    Optional<Document> findByUserAndFileHash(User user, String fileHash);

    List<Document> findByFileHash(String fileHash);

    @Query("SELECT COUNT(d) > 0 FROM Document d WHERE d.user.id = :userId AND d.fileHash = :fileHash")
    boolean existsByUserIdAndFileHash(@Param("userId") Long userId, @Param("fileHash") String fileHash);

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category LEFT JOIN FETCH d.familyMember " +
            "WHERE d.user.id IN " +
            "(SELECT u.id FROM User u WHERE u.id = :userId OR u.primaryAccount.id = :userId) " +
            "AND d.fileHash IS NOT NULL " +
            "AND d.fileHash IN (" +
            "  SELECT d2.fileHash FROM Document d2 " +
            "  WHERE d2.user.id IN " +
            "    (SELECT u2.id FROM User u2 WHERE u2.id = :userId OR u2.primaryAccount.id = :userId) " +
            "  AND d2.fileHash IS NOT NULL " +
            "  GROUP BY d2.fileHash HAVING COUNT(d2) > 1" +
            ") ORDER BY d.fileHash, d.createdAt ASC")
    List<Document> findDuplicateDocuments(@Param("userId") Long userId);

    long countByUserId(Long userId);

    List<Document> findByUserId(Long userId);

    // ADD to DocumentRepository.java — required by NotificationService.isDocumentRenewed()

    @Query("SELECT d FROM Document d LEFT JOIN FETCH d.category " +
            "WHERE d.user.id = :userId " +
            "AND d.category.id = :categoryId " +
            "AND d.isArchived = false")
    List<Document> findByUserIdAndCategoryId(@Param("userId") Long userId,
                                             @Param("categoryId") Long categoryId);

}