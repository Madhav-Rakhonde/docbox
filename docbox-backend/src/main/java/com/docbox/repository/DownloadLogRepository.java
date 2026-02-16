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
interface DownloadLogRepository extends JpaRepository<DownloadLog, Long> {

    List<DownloadLog> findByDocument(Document document);

    List<DownloadLog> findByUser(User user);

    @Query("SELECT COUNT(d) FROM DownloadLog d WHERE d.document.id = :documentId")
    long countDownloadsByDocumentId(@Param("documentId") Long documentId);

    @Query("SELECT d FROM DownloadLog d WHERE d.user.id = :userId ORDER BY d.downloadedAt DESC")
    Page<DownloadLog> findRecentDownloadsByUser(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT SUM(d.fileSize) FROM DownloadLog d WHERE d.user.id = :userId " +
            "AND d.downloadedAt BETWEEN :startDate AND :endDate")
    Long getTotalDownloadSizeByUserAndDateRange(@Param("userId") Long userId,
                                                @Param("startDate") LocalDateTime startDate,
                                                @Param("endDate") LocalDateTime endDate);
}