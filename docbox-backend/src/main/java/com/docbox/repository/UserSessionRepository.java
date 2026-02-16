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
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    Optional<UserSession> findByRefreshToken(String refreshToken);

    List<UserSession> findByUser(User user);

    @Query("SELECT s FROM UserSession s WHERE s.user.id = :userId AND s.isActive = true")
    List<UserSession> findActiveSessionsByUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(s) FROM UserSession s WHERE s.user.id = :userId AND s.isActive = true")
    long countActiveSessionsByUser(@Param("userId") Long userId);

    @Query("SELECT s FROM UserSession s WHERE s.expiresAt < CURRENT_TIMESTAMP AND s.isActive = true")
    List<UserSession> findExpiredSessions();

    @Modifying
    @Query("UPDATE UserSession s SET s.isActive = false WHERE s.expiresAt < CURRENT_TIMESTAMP AND s.isActive = true")
    int expireOldSessions();

    @Modifying
    @Query("UPDATE UserSession s SET s.isActive = false WHERE s.user.id = :userId")
    int invalidateAllSessionsForUser(@Param("userId") Long userId);

    List<UserSession> findByUserAndIsActiveTrue(User user);
}
