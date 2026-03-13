package com.docbox.scheduler;

import com.docbox.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * ExpiryNotificationScheduler
 *
 * Thin trigger — contains NO business logic.
 * All logic lives in NotificationService.checkAndSendExpiryNotifications().
 *
 * The @Scheduled cron on that method drives the daily 09:00 AM run automatically.
 * This class exists to give you a clean manual-trigger hook if ever needed.
 *
 * REQUIRED — add to your main application class:
 *
 *   @SpringBootApplication
 *   @EnableScheduling
 *   public class DocBoxApplication { ... }
 *
 * REQUIRED — add to DocumentRepository:
 *
 *   @Query("SELECT d FROM Document d WHERE d.user.id = :userId " +
 *          "AND d.category.id = :categoryId AND d.isDeleted = false")
 *   List<Document> findByUserIdAndCategoryId(
 *       @Param("userId") Long userId,
 *       @Param("categoryId") Long categoryId);
 */
@Component
public class ExpiryNotificationScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ExpiryNotificationScheduler.class);

    @Autowired
    private NotificationService notificationService;

    /** Manual trigger — useful for admin endpoints or integration tests. */
    public void triggerManually() {
        logger.info("Manual trigger: running expiry notification check");
        notificationService.checkAndSendExpiryNotifications();
    }
}