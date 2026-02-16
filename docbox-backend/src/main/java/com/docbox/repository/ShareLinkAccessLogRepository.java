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
interface ShareLinkAccessLogRepository extends JpaRepository<ShareLinkAccessLog, Long> {

    List<ShareLinkAccessLog> findBySharedLink(SharedLink sharedLink);

    List<ShareLinkAccessLog> findBySharedLinkOrderByAccessedAtDesc(SharedLink sharedLink);

    @Query("SELECT COUNT(s) FROM ShareLinkAccessLog s WHERE s.sharedLink.id = :linkId AND s.action = 'VIEWED'")
    long countViewsByLinkId(@Param("linkId") Long linkId);

    @Query("SELECT COUNT(s) FROM ShareLinkAccessLog s WHERE s.sharedLink.id = :linkId AND s.action = 'DOWNLOADED'")
    long countDownloadsByLinkId(@Param("linkId") Long linkId);
}
