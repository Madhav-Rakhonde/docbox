package com.docbox.repository;

import com.docbox.entity.CategoryPermission;
import com.docbox.entity.DocumentCategory;
import com.docbox.entity.User;
import com.docbox.enums.PermissionLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * CRITICAL REPOSITORY: Manages category-level default permissions
 * When documents are uploaded, they inherit permissions from category defaults
 */
@Repository
public interface CategoryPermissionRepository extends JpaRepository<CategoryPermission, Long> {

    // Find default permission for specific user and category
    Optional<CategoryPermission> findByCategoryAndPrimaryAccountAndUser(
            DocumentCategory category, User primaryAccount, User user);

    Optional<CategoryPermission> findByCategoryIdAndPrimaryAccountIdAndUserId(
            Long categoryId, Long primaryAccountId, Long userId);

    // Find all category permissions for a primary account
    List<CategoryPermission> findByPrimaryAccount(User primaryAccount);

    List<CategoryPermission> findByPrimaryAccountId(Long primaryAccountId);

    // Find all category permissions for a specific user
    List<CategoryPermission> findByUser(User user);

    List<CategoryPermission> findByUserId(Long userId);

    // Find all permissions for a specific category
    List<CategoryPermission> findByCategory(DocumentCategory category);

    List<CategoryPermission> findByCategoryId(Long categoryId);

    // Find permission by category and user (for updating existing)
    @Query("SELECT cp FROM CategoryPermission cp WHERE cp.category.id = :categoryId AND cp.user.id = :userId")
    CategoryPermission findByCategoryIdAndUserId(@Param("categoryId") Long categoryId, @Param("userId") Long userId);

    // Find permissions for a primary account and specific user
    @Query("SELECT cp FROM CategoryPermission cp WHERE cp.primaryAccount.id = :primaryAccountId " +
            "AND cp.user.id = :userId")
    List<CategoryPermission> findByPrimaryAccountIdAndUserId(@Param("primaryAccountId") Long primaryAccountId,
                                                             @Param("userId") Long userId);

    // Find default permission level for a category and user
    @Query("SELECT cp.defaultPermissionLevel FROM CategoryPermission cp " +
            "WHERE cp.category.id = :categoryId AND cp.primaryAccount.id = :primaryAccountId " +
            "AND cp.user.id = :userId")
    Optional<PermissionLevel> findDefaultPermissionLevel(@Param("categoryId") Long categoryId,
                                                         @Param("primaryAccountId") Long primaryAccountId,
                                                         @Param("userId") Long userId);

    // Check if category permission exists
    boolean existsByCategoryIdAndPrimaryAccountIdAndUserId(Long categoryId, Long primaryAccountId, Long userId);

    // Delete all category permissions for a user
    @Modifying
    @Query("DELETE FROM CategoryPermission cp WHERE cp.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);

    // Delete category permission for specific user and category
    @Modifying
    @Query("DELETE FROM CategoryPermission cp WHERE cp.category.id = :categoryId " +
            "AND cp.primaryAccount.id = :primaryAccountId AND cp.user.id = :userId")
    void deleteByCategoryIdAndPrimaryAccountIdAndUserId(@Param("categoryId") Long categoryId,
                                                        @Param("primaryAccountId") Long primaryAccountId,
                                                        @Param("userId") Long userId);

    // Find all categories where user has specific permission level or higher
    @Query("SELECT cp.category FROM CategoryPermission cp WHERE cp.user.id = :userId " +
            "AND cp.defaultPermissionLevel >= :minLevel")
    List<DocumentCategory> findCategoriesWithMinPermission(@Param("userId") Long userId,
                                                           @Param("minLevel") PermissionLevel minLevel);


}