package com.docbox.repository;

import com.docbox.entity.InAppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InAppNotificationRepository extends JpaRepository<InAppNotification, Long> {

    List<InAppNotification> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<InAppNotification> findByUserIdAndIsReadOrderByCreatedAtDesc(Long userId, Boolean isRead);

    Long countByUserIdAndIsRead(Long userId, Boolean isRead);

    @Modifying
    @Query("UPDATE InAppNotification n SET n.isRead = true WHERE n.user.id = :userId AND n.isRead = false")
    void markAllAsReadForUser(Long userId);

    @Modifying
    @Query("DELETE FROM InAppNotification n WHERE n.user.id = :userId")
    void deleteAllByUserId(Long userId);
}