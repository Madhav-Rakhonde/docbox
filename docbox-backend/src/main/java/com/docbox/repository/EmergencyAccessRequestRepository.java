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
public interface EmergencyAccessRequestRepository extends JpaRepository<EmergencyAccessRequest, Long> {

    List<EmergencyAccessRequest> findByRequestedBy(User user);

    List<EmergencyAccessRequest> findByPrimaryAccount(User primaryAccount);

    List<EmergencyAccessRequest> findByStatus(String status);

    @Query("SELECT e FROM EmergencyAccessRequest e WHERE e.primaryAccount.id = :primaryAccountId AND e.status = 'PENDING'")
    List<EmergencyAccessRequest> findPendingRequestsForPrimaryAccount(@Param("primaryAccountId") Long primaryAccountId);

    @Query("SELECT COUNT(e) FROM EmergencyAccessRequest e WHERE e.primaryAccount.id = :primaryAccountId AND e.status = 'PENDING'")
    long countPendingRequestsForPrimaryAccount(@Param("primaryAccountId") Long primaryAccountId);

    List<EmergencyAccessRequest> findByDocumentAndRequestedBy(Document document, User user);
}