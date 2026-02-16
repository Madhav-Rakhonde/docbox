package com.docbox.repository;

import com.docbox.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionAuditLogRepository extends JpaRepository<PermissionAuditLog, Long> {

    List<PermissionAuditLog> findByDocument(Document document);

    List<PermissionAuditLog> findByUser(User user);

    Page<PermissionAuditLog> findByDocumentOrderByCreatedAtDesc(Document document, Pageable pageable);

    Page<PermissionAuditLog> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    @Query("SELECT p FROM PermissionAuditLog p WHERE p.changedBy.id = :userId ORDER BY p.createdAt DESC")
    Page<PermissionAuditLog> findPermissionChangesBy(@Param("userId") Long userId, Pageable pageable);
}
