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
public interface DocumentAuditLogRepository extends JpaRepository<DocumentAuditLog, Long> {

    List<DocumentAuditLog> findByDocument(Document document);

    List<DocumentAuditLog> findByUser(User user);

    Page<DocumentAuditLog> findByDocumentOrderByCreatedAtDesc(Document document, Pageable pageable);

    Page<DocumentAuditLog> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);

    @Query("SELECT d FROM DocumentAuditLog d WHERE d.document.id = :documentId AND d.action = :action")
    List<DocumentAuditLog> findByDocumentIdAndAction(@Param("documentId") Long documentId, @Param("action") String action);

    @Query("SELECT COUNT(d) FROM DocumentAuditLog d WHERE d.document.id = :documentId AND d.action = 'DOWNLOADED'")
    long countDownloadsByDocumentId(@Param("documentId") Long documentId);

    // ✅ ADD THESE TWO METHODS:

    /**
     * Delete all audit logs for a specific document
     */
    @Modifying
    @Query("DELETE FROM DocumentAuditLog d WHERE d.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);

    /**
     * Find all audit logs by document ID
     */
    @Query("SELECT d FROM DocumentAuditLog d WHERE d.document.id = :documentId")
    List<DocumentAuditLog> findByDocumentId(@Param("documentId") Long documentId);
}