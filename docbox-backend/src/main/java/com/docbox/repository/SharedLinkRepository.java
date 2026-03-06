package com.docbox.repository;

import com.docbox.entity.*;
import jakarta.transaction.Transactional;
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
public interface SharedLinkRepository extends JpaRepository<SharedLink, Long> {

    Optional<SharedLink> findByLinkToken(String linkToken);

    List<SharedLink> findByDocument(Document document);

    List<SharedLink> findByCreatedBy(User user);

    @Query("SELECT s FROM SharedLink s WHERE s.createdBy.id = :userId AND s.isActive = true")
    List<SharedLink> findActiveSharedLinksByUser(@Param("userId") Long userId);

    @Query("SELECT s FROM SharedLink s WHERE s.isActive = true AND s.expiresAt < CURRENT_TIMESTAMP")
    List<SharedLink> findExpiredLinks();

    @Modifying
    @Query("UPDATE SharedLink s SET s.isActive = false WHERE s.expiresAt < CURRENT_TIMESTAMP AND s.isActive = true")
    int expireOldLinks();

    @Modifying
    @Query("DELETE FROM SharedLink s WHERE s.document.id = :documentId")
    void deleteByDocumentId(@Param("documentId") Long documentId);

    @Transactional
    void deleteByDocument_Id(Long documentId);
}
