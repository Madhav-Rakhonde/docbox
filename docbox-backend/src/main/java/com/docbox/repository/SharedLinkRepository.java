package com.docbox.repository;

import com.docbox.entity.*;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SharedLinkRepository extends JpaRepository<SharedLink, Long> {

    // ✅ FIXED: JOIN FETCH eagerly loads document + category + createdBy in one
    //    query. Previously this was a simple derived query that left document and
    //    category as uninitialized lazy proxies, causing:
    //    "could not initialize proxy [Document#79] - no Session"
    @Query("SELECT s FROM SharedLink s " +
            "JOIN FETCH s.document d " +
            "JOIN FETCH d.category " +
            "JOIN FETCH s.createdBy " +
            "WHERE s.linkToken = :token")
    Optional<SharedLink> findByLinkToken(@Param("token") String token);

    // ✅ FIXED: eager fetch so document.category is accessible after transaction
    @Query("SELECT s FROM SharedLink s " +
            "JOIN FETCH s.document d " +
            "JOIN FETCH d.category " +
            "WHERE s.document = :document")
    List<SharedLink> findByDocument(@Param("document") Document document);

    // ✅ FIXED: eager fetch for user's own links
    @Query("SELECT s FROM SharedLink s " +
            "JOIN FETCH s.document d " +
            "JOIN FETCH d.category " +
            "WHERE s.createdBy = :user")
    List<SharedLink> findByCreatedBy(@Param("user") User user);

    @Query("SELECT s FROM SharedLink s " +
            "JOIN FETCH s.document d " +
            "JOIN FETCH d.category " +
            "WHERE s.createdBy.id = :userId AND s.isActive = true")
    List<SharedLink> findActiveSharedLinksByUser(@Param("userId") Long userId);

    @Query("SELECT s FROM SharedLink s WHERE s.isActive = true AND s.expiresAt < CURRENT_TIMESTAMP")
    List<SharedLink> findExpiredLinks();

    @Modifying
    @Query("UPDATE SharedLink s SET s.isActive = false " +
            "WHERE s.expiresAt < CURRENT_TIMESTAMP AND s.isActive = true")
    int expireOldLinks();

    @Modifying
    @Query("DELETE FROM SharedLink s WHERE s.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);

    @Transactional
    void deleteByDocument_Id(Long documentId);
}