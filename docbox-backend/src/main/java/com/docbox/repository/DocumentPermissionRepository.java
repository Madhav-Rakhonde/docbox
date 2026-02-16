package com.docbox.repository;

import com.docbox.entity.Document;
import com.docbox.entity.DocumentPermission;
import com.docbox.entity.User;
import com.docbox.enums.PermissionLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * CRITICAL REPOSITORY: Manages document-level permissions
 * This is the core of DocBox's access control system
 */
@Repository
public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, Long> {

    // Find permission for specific user and document
    Optional<DocumentPermission> findByDocumentAndUser(Document document, User user);

    Optional<DocumentPermission> findByDocumentIdAndUserId(Long documentId, Long userId);

    // Find all permissions for a document
    List<DocumentPermission> findByDocument(Document document);

    List<DocumentPermission> findByDocumentId(Long documentId);

    // Find all permissions for a user
    List<DocumentPermission> findByUser(User user);

    List<DocumentPermission> findByUserId(Long userId);

    // Find active permissions only
    @Query("SELECT p FROM DocumentPermission p WHERE p.document.id = :documentId AND p.user.id = :userId " +
            "AND p.isActive = true AND (p.expiresAt IS NULL OR p.expiresAt > :now)")
    Optional<DocumentPermission> findActivePermission(@Param("documentId") Long documentId,
                                                      @Param("userId") Long userId,
                                                      @Param("now") LocalDateTime now);

    // Check if user has any permission
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM DocumentPermission p " +
            "WHERE p.document.id = :documentId AND p.user.id = :userId AND p.isActive = true " +
            "AND (p.expiresAt IS NULL OR p.expiresAt > CURRENT_TIMESTAMP)")
    boolean hasActivePermission(@Param("documentId") Long documentId, @Param("userId") Long userId);

    // Check if user has specific permission level or higher
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM DocumentPermission p " +
            "WHERE p.document.id = :documentId AND p.user.id = :userId AND p.isActive = true " +
            "AND (p.expiresAt IS NULL OR p.expiresAt > CURRENT_TIMESTAMP) " +
            "AND p.permissionLevel >= :requiredLevel")
    boolean hasPermissionLevel(@Param("documentId") Long documentId,
                               @Param("userId") Long userId,
                               @Param("requiredLevel") PermissionLevel requiredLevel);

    // Find all documents a user has access to
    @Query("SELECT p.document FROM DocumentPermission p WHERE p.user.id = :userId AND p.isActive = true " +
            "AND (p.expiresAt IS NULL OR p.expiresAt > CURRENT_TIMESTAMP) " +
            "AND p.permissionLevel <> 'NO_ACCESS'")
    List<Document> findAccessibleDocuments(@Param("userId") Long userId);

    // Find expired permissions
    @Query("SELECT p FROM DocumentPermission p WHERE p.expiresAt IS NOT NULL " +
            "AND p.expiresAt < CURRENT_TIMESTAMP AND p.isActive = true")
    List<DocumentPermission> findExpiredPermissions();

    // Expire permissions automatically
    @Modifying
    @Query("UPDATE DocumentPermission p SET p.isActive = false WHERE p.expiresAt IS NOT NULL " +
            "AND p.expiresAt < CURRENT_TIMESTAMP AND p.isActive = true")
    int expireOldPermissions();

    // Delete all permissions for a document
    @Modifying
    @Query("DELETE FROM DocumentPermission p WHERE p.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);

    // Delete permission for specific user and document
    @Modifying
    @Query("DELETE FROM DocumentPermission p WHERE p.document.id = :documentId AND p.user.id = :userId")
    void deleteByDocumentIdAndUserId(@Param("documentId") Long documentId, @Param("userId") Long userId);

    // Count permissions for a user
    @Query("SELECT COUNT(p) FROM DocumentPermission p WHERE p.user.id = :userId AND p.isActive = true " +
            "AND (p.expiresAt IS NULL OR p.expiresAt > CURRENT_TIMESTAMP)")
    long countActivePermissionsByUserId(@Param("userId") Long userId);

    // Find permissions granted by a specific user
    List<DocumentPermission> findByGrantedBy(User grantedBy);

    // Find temporary permissions (with expiry)
    @Query("SELECT p FROM DocumentPermission p WHERE p.expiresAt IS NOT NULL AND p.isActive = true")
    List<DocumentPermission> findTemporaryPermissions();

    // Find permissions expiring soon
    @Query("SELECT p FROM DocumentPermission p WHERE p.expiresAt IS NOT NULL " +
            "AND p.expiresAt BETWEEN CURRENT_TIMESTAMP AND :futureDate AND p.isActive = true")
    List<DocumentPermission> findPermissionsExpiringSoon(@Param("futureDate") LocalDateTime futureDate);
}