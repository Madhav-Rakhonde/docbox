package com.docbox.service;

import com.docbox.entity.Document;
import com.docbox.entity.EmergencyAccessRequest;
import com.docbox.entity.InAppNotification;
import com.docbox.entity.User;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.repository.DocumentRepository;
import com.docbox.repository.InAppNotificationRepository;
import com.docbox.repository.UserRepository;
import com.docbox.util.SecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper; // ✅ ADDED for scheme metadata
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Notification Service
 * Handles BOTH email/SMS AND in-app notifications
 * ✅ UPDATED: Now includes government scheme discovery notifications
 */
@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy");

    @Value("${app.notification.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${app.notification.sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${app.notification.whatsapp.enabled:false}")
    private boolean whatsappEnabled;

    @Value("${app.notification.from-email:noreply@docbox.com}")
    private String fromEmail;

    @Value("${app.notification.app-name:DocBox}")
    private String appName;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InAppNotificationRepository inAppNotificationRepository;

    // ✅ ADDED: For JSON serialization of scheme metadata
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ============================================
    // IN-APP NOTIFICATION METHODS
    // ============================================

    /**
     * Get all in-app notifications for current user
     */
    public List<InAppNotification> getMyNotifications() {
        Long userId = SecurityUtils.getCurrentUserId();
        return inAppNotificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notifications count
     */
    public Long getUnreadCount() {
        Long userId = SecurityUtils.getCurrentUserId();
        return inAppNotificationRepository.countByUserIdAndIsRead(userId, false);
    }

    /**
     * Mark notification as read
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        InAppNotification notification = inAppNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        notification.setIsRead(true);
        inAppNotificationRepository.save(notification);

        logger.info("Marked notification {} as read", notificationId);
    }

    /**
     * Mark all notifications as read
     */
    @Transactional
    public void markAllAsRead() {
        Long userId = SecurityUtils.getCurrentUserId();
        inAppNotificationRepository.markAllAsReadForUser(userId);

        logger.info("Marked all notifications as read for user {}", userId);
    }

    /**
     * Delete notification
     */
    @Transactional
    public void deleteNotification(Long notificationId) {
        InAppNotification notification = inAppNotificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        inAppNotificationRepository.delete(notification);

        logger.info("Deleted notification {}", notificationId);
    }

    /**
     * Clear all notifications
     */
    @Transactional
    public void clearAllNotifications() {
        Long userId = SecurityUtils.getCurrentUserId();
        inAppNotificationRepository.deleteAllByUserId(userId);

        logger.info("Cleared all notifications for user {}", userId);
    }

    /**
     * Create in-app notification for user
     */
    @Transactional
    public InAppNotification createInAppNotification(Long userId, String type,
                                                     String title, String message, String link) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        InAppNotification notification = new InAppNotification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setLink(link);
        notification.setIsRead(false);

        notification = inAppNotificationRepository.save(notification);

        logger.info("Created in-app notification for user {}: {}", userId, title);

        return notification;
    }

    /**
     * Create notification for document upload
     */
    public void notifyDocumentUploaded(Long userId, String filename) {
        createInAppNotification(
                userId,
                "DOCUMENT_UPLOADED",
                "Document Uploaded",
                "Successfully uploaded '" + filename + "'",
                "/documents"
        );
    }

    /**
     * Create notification for document shared
     */
    public void notifyDocumentShared(Long recipientUserId, String sharerName, String filename) {
        createInAppNotification(
                recipientUserId,
                "DOCUMENT_SHARED",
                "Document Shared",
                sharerName + " shared '" + filename + "' with you",
                "/documents"
        );
    }

    /**
     * Create notification for document expiring
     */
    public void notifyDocumentExpiring(Long userId, String documentType, int daysLeft) {
        createInAppNotification(
                userId,
                "DOCUMENT_EXPIRING",
                "Document Expiring Soon",
                "Your " + documentType + " will expire in " + daysLeft + " days",
                "/documents"
        );
    }

    /**
     * Create notification for family member added
     */
    public void notifyFamilyMemberAdded(Long userId, String memberName) {
        createInAppNotification(
                userId,
                "FAMILY_MEMBER_ADDED",
                "New Family Member",
                memberName + " joined your family group",
                "/family"
        );
    }

    /**
     * Create notification for permission granted
     */
    public void notifyPermissionGranted(Long recipientUserId, String documentName) {
        createInAppNotification(
                recipientUserId,
                "PERMISSION_GRANTED",
                "Permission Granted",
                "You can now access '" + documentName + "'",
                "/my-documents"
        );
    }

    // ============================================
    // ✅ NEW: GOVERNMENT SCHEME DISCOVERY NOTIFICATIONS
    // ============================================

    /**
     * Create scheme discovery notifications
     * Called by FreeSchemeDiscoveryService after discovering eligible schemes
     */
    @Transactional
    public void createSchemeNotifications(User user, List<FreeSchemeDiscoveryService.DiscoveredScheme> schemes) {
        try {
            logger.info("📲 Creating {} scheme notifications for user {}", schemes.size(), user.getId());

            for (FreeSchemeDiscoveryService.DiscoveredScheme scheme : schemes) {
                // Build notification message
                StringBuilder message = new StringBuilder();
                message.append("You may be eligible for ").append(scheme.getName()).append(". ");

                if (scheme.getAmount() != null && scheme.getAmount() > 0) {
                    message.append("Amount: ₹").append(String.format("%,d", scheme.getAmount())).append(". ");
                }

                if (scheme.getDescription() != null && !scheme.getDescription().isEmpty()) {
                    String desc = scheme.getDescription();
                    if (desc.length() > 150) {
                        desc = desc.substring(0, 147) + "...";
                    }
                    message.append(desc);
                }

                // Create notification using existing method
                InAppNotification notification = createInAppNotification(
                        user.getId(),
                        "SCHEME_DISCOVERY",
                        "New Scheme: " + scheme.getName(),
                        message.toString(),
                        "/schemes"
                );

                // Add scheme metadata (JSON)
                try {
                    Map<String, Object> metadata = new HashMap<>();
                    metadata.put("schemeId", scheme.getName().hashCode());
                    metadata.put("schemeName", scheme.getName());
                    metadata.put("category", scheme.getCategory());
                    metadata.put("amount", scheme.getAmount());
                    metadata.put("applicationUrl", scheme.getApplicationUrl());
                    metadata.put("issuingAuthority", scheme.getIssuingAuthority());

                    String metadataJson = objectMapper.writeValueAsString(metadata);
                    notification.setMetadata(metadataJson);
                    inAppNotificationRepository.save(notification);

                } catch (Exception ex) {
                    logger.warn("Failed to serialize scheme metadata for notification {}: {}",
                            notification.getId(), ex.getMessage());
                }
            }

            logger.info("✅ Successfully created {} scheme notifications for user {}",
                    schemes.size(), user.getId());

        } catch (Exception ex) {
            logger.error("❌ Failed to create scheme notifications for user {}: {}",
                    user.getId(), ex.getMessage(), ex);
        }
    }

    // ============================================
    // EMAIL/SMS NOTIFICATION METHODS (UNCHANGED)
    // ============================================

    /**
     * Send welcome email on signup
     */
    public void sendWelcomeEmail(User user) {
        if (!emailEnabled) {
            logger.debug("Email notifications disabled");
            return;
        }

        String subject = "Welcome to " + appName + "!";
        String body = buildWelcomeEmailBody(user);

        sendEmail(user.getEmail(), subject, body);

        logger.info("Welcome email sent to: {}", user.getEmail());
    }

    /**
     * Send document expiry reminder
     * UPDATED: Now also creates in-app notification
     */
    public void sendExpiryReminder(User user, Document document, int daysUntilExpiry) {
        // Email notification
        if (emailEnabled) {
            String subject = "Document Expiring Soon - " + document.getCategory().getName();
            String body = buildExpiryReminderBody(user, document, daysUntilExpiry);
            sendEmail(user.getEmail(), subject, body);
        }

        // SMS if urgent (< 7 days)
        if (smsEnabled && daysUntilExpiry <= 7) {
            String smsText = String.format("DocBox Alert: Your %s expires in %d days. Renew soon!",
                    document.getCategory().getName(), daysUntilExpiry);
            sendSMS(user.getPhoneNumber(), smsText);
        }

        // In-app notification
        notifyDocumentExpiring(
                user.getId(),
                document.getCategory().getName(),
                daysUntilExpiry
        );

        logger.info("Expiry reminder sent for document {} to user {}",
                document.getId(), user.getId());
    }

    /**
     * Send emergency access request notification (to primary account)
     */
    public void sendEmergencyAccessRequest(EmergencyAccessRequest request) {
        if (!emailEnabled) {
            return;
        }

        User primaryAccount = request.getPrimaryAccount();
        User requester = request.getRequestedBy();
        Document document = request.getDocument();

        String subject = "Emergency Access Request from " + requester.getFullName();
        String body = buildEmergencyRequestBody(request);

        sendEmail(primaryAccount.getEmail(), subject, body);

        // Also send SMS for urgent requests
        if (smsEnabled && primaryAccount.getPhoneNumber() != null) {
            String smsText = String.format("DocBox: %s requested emergency access to %s. Review in app.",
                    requester.getFullName(), document.getCategory().getName());
            sendSMS(primaryAccount.getPhoneNumber(), smsText);
        }

        logger.info("Emergency access request notification sent to: {}",
                primaryAccount.getEmail());
    }

    /**
     * Send emergency access decision notification (to requester)
     */
    public void sendEmergencyAccessDecision(EmergencyAccessRequest request, boolean approved) {
        if (!emailEnabled) {
            return;
        }

        User requester = request.getRequestedBy();
        Document document = request.getDocument();

        String subject = "Emergency Access Request " + (approved ? "Approved" : "Rejected");
        String body = buildEmergencyDecisionBody(request, approved);

        sendEmail(requester.getEmail(), subject, body);

        logger.info("Emergency access decision ({}) sent to: {}",
                approved ? "approved" : "rejected", requester.getEmail());
    }

    /**
     * Send document shared notification
     * UPDATED: Now also creates in-app notification
     */
    public void sendShareLinkNotification(User sharedBy, String recipientEmail,
                                          String shareUrl, Document document) {
        // Email notification
        if (emailEnabled) {
            String subject = sharedBy.getFullName() + " shared a document with you";
            String body = buildShareLinkBody(sharedBy, shareUrl, document);
            sendEmail(recipientEmail, subject, body);
        }

        // In-app notification if recipient is a user
        try {
            User recipient = userRepository.findByEmail(recipientEmail)
                    .orElse(null);

            if (recipient != null) {
                notifyDocumentShared(
                        recipient.getId(),
                        sharedBy.getFullName(),
                        document.getOriginalFilename()
                );
            }
        } catch (Exception e) {
            logger.warn("Could not create in-app notification for external email: {}", recipientEmail);
        }

        logger.info("Share link notification sent to: {}", recipientEmail);
    }

    /**
     * Send bulk expiry notifications (daily/weekly job)
     * UPDATED: Now also creates in-app notifications
     */
    public int sendBulkExpiryReminders(int daysThreshold) {
        List<User> users = userRepository.findAll();
        int notificationsSent = 0;

        LocalDate endDate = LocalDate.now().plusDays(daysThreshold);

        for (User user : users) {
            if (user.isPrimaryAccount()) {
                // Get expiring documents for this user
                List<Document> expiringDocs = documentRepository.findDocumentsExpiringBetween(
                        user.getId(), LocalDate.now(), endDate);

                if (!expiringDocs.isEmpty()) {
                    // Email notification
                    sendBatchExpiryReminder(user, expiringDocs, daysThreshold);

                    // In-app notifications
                    for (Document doc : expiringDocs) {
                        int daysLeft = (int) java.time.temporal.ChronoUnit.DAYS.between(
                                LocalDate.now(), doc.getExpiryDate());
                        notifyDocumentExpiring(
                                user.getId(),
                                doc.getCategory().getName(),
                                daysLeft
                        );
                    }

                    notificationsSent++;
                }
            }
        }

        logger.info("Sent {} bulk expiry reminder notifications", notificationsSent);
        return notificationsSent;
    }

    /**
     * Send batch expiry reminder (multiple documents)
     */
    private void sendBatchExpiryReminder(User user, List<Document> documents, int daysThreshold) {
        String subject = documents.size() + " Document(s) Expiring Soon";
        String body = buildBatchExpiryBody(user, documents, daysThreshold);

        sendEmail(user.getEmail(), subject, body);
    }

    /**
     * Send storage quota warning
     */
    public void sendStorageQuotaWarning(User user, long usedBytes, long limitBytes) {
        if (!emailEnabled) {
            return;
        }

        double usedMB = usedBytes / (1024.0 * 1024.0);
        double limitMB = limitBytes / (1024.0 * 1024.0);
        int percentage = (int) ((usedBytes * 100.0) / limitBytes);

        String subject = "Storage Quota Warning - " + percentage + "% Used";
        String body = String.format(
                "Hello %s,\n\n" +
                        "Your DocBox storage is %d%% full.\n\n" +
                        "Used: %.1f MB / %.1f MB\n\n" +
                        "Please delete old documents or upgrade your storage.\n\n" +
                        "Best regards,\n%s Team",
                user.getFullName(), percentage, usedMB, limitMB, appName
        );

        sendEmail(user.getEmail(), subject, body);

        logger.info("Storage quota warning sent to: {}", user.getEmail());
    }

    // ============================================
    // EMAIL TEMPLATE BUILDERS (UNCHANGED)
    // ============================================

    private String buildWelcomeEmailBody(User user) {
        return String.format(
                "Hello %s,\n\n" +
                        "Welcome to %s!\n\n" +
                        "Your account has been created successfully. You can now:\n" +
                        "- Upload and organize your documents\n" +
                        "- Add family members\n" +
                        "- Set permissions and share documents securely\n" +
                        "- Get notified about expiring documents\n\n" +
                        "Get started by uploading your first document!\n\n" +
                        "Best regards,\n%s Team",
                user.getFullName(), appName, appName
        );
    }

    private String buildExpiryReminderBody(User user, Document document, int daysUntilExpiry) {
        String expiryDate = document.getExpiryDate() != null ?
                document.getExpiryDate().format(DATE_FORMATTER) : "Unknown";

        return String.format(
                "Hello %s,\n\n" +
                        "⚠️ Document Expiry Reminder\n\n" +
                        "Your document is expiring soon:\n\n" +
                        "Document: %s\n" +
                        "Category: %s\n" +
                        "Expires: %s (%d days from now)\n\n" +
                        "Please renew this document to avoid any issues.\n\n" +
                        "Best regards,\n%s Team",
                user.getFullName(),
                document.getOriginalFilename(),
                document.getCategory().getName(),
                expiryDate,
                daysUntilExpiry,
                appName
        );
    }

    private String buildEmergencyRequestBody(EmergencyAccessRequest request) {
        return String.format(
                "Hello %s,\n\n" +
                        "🚨 Emergency Access Request\n\n" +
                        "Requested by: %s\n" +
                        "Document: %s (%s)\n" +
                        "Reason: %s\n\n" +
                        "Please review this request in the app and approve or reject it.\n\n" +
                        "Best regards,\n%s Team",
                request.getPrimaryAccount().getFullName(),
                request.getRequestedBy().getFullName(),
                request.getDocument().getOriginalFilename(),
                request.getDocument().getCategory().getName(),
                request.getRequestReason(),
                appName
        );
    }

    private String buildEmergencyDecisionBody(EmergencyAccessRequest request, boolean approved) {
        if (approved) {
            return String.format(
                    "Hello %s,\n\n" +
                            "✅ Emergency Access Request Approved\n\n" +
                            "Your request for emergency access has been approved!\n\n" +
                            "Document: %s\n" +
                            "Review notes: %s\n\n" +
                            "You can now access this document in the app.\n\n" +
                            "Best regards,\n%s Team",
                    request.getRequestedBy().getFullName(),
                    request.getDocument().getOriginalFilename(),
                    request.getReviewNotes() != null ? request.getReviewNotes() : "N/A",
                    appName
            );
        } else {
            return String.format(
                    "Hello %s,\n\n" +
                            "❌ Emergency Access Request Rejected\n\n" +
                            "Your request for emergency access has been rejected.\n\n" +
                            "Document: %s\n" +
                            "Review notes: %s\n\n" +
                            "Please contact your primary account holder for more information.\n\n" +
                            "Best regards,\n%s Team",
                    request.getRequestedBy().getFullName(),
                    request.getDocument().getOriginalFilename(),
                    request.getReviewNotes() != null ? request.getReviewNotes() : "N/A",
                    appName
            );
        }
    }

    private String buildShareLinkBody(User sharedBy, String shareUrl, Document document) {
        return String.format(
                "Hello,\n\n" +
                        "%s has shared a document with you.\n\n" +
                        "Document: %s\n" +
                        "Category: %s\n\n" +
                        "Access link: %s\n\n" +
                        "Best regards,\n%s Team",
                sharedBy.getFullName(),
                document.getOriginalFilename(),
                document.getCategory().getName(),
                shareUrl,
                appName
        );
    }

    private String buildBatchExpiryBody(User user, List<Document> documents, int daysThreshold) {
        StringBuilder body = new StringBuilder();
        body.append(String.format("Hello %s,\n\n", user.getFullName()));
        body.append(String.format("⚠️ You have %d document(s) expiring in the next %d days:\n\n",
                documents.size(), daysThreshold));

        for (Document doc : documents) {
            String expiryDate = doc.getExpiryDate() != null ?
                    doc.getExpiryDate().format(DATE_FORMATTER) : "Unknown";
            body.append(String.format("- %s (%s) - Expires: %s\n",
                    doc.getOriginalFilename(),
                    doc.getCategory().getName(),
                    expiryDate
            ));
        }

        body.append("\nPlease renew these documents soon.\n\n");
        body.append(String.format("Best regards,\n%s Team", appName));

        return body.toString();
    }

    // ============================================
    // STUB IMPLEMENTATIONS (UNCHANGED)
    // ============================================

    /**
     * Send email (STUB - integrate with SendGrid, AWS SES, etc.)
     */
    private void sendEmail(String to, String subject, String body) {
        // TODO: Integrate with email provider
        logger.info("EMAIL SENT [STUB]: to={}, subject={}", to, subject);
        logger.debug("EMAIL BODY: {}", body);
    }

    /**
     * Send SMS (STUB - integrate with Twilio, AWS SNS, etc.)
     */
    private void sendSMS(String phoneNumber, String message) {
        if (phoneNumber == null || phoneNumber.isEmpty()) {
            return;
        }
        logger.info("SMS SENT [STUB]: to={}, message={}", phoneNumber, message);
    }

    /**
     * Send WhatsApp message (STUB - integrate with Twilio WhatsApp API)
     */
    private void sendWhatsApp(String phoneNumber, String message) {
        if (!whatsappEnabled || phoneNumber == null) {
            return;
        }
        logger.info("WHATSAPP SENT [STUB]: to={}, message={}", phoneNumber, message);
    }

    /**
     * Get notification statistics
     */
    public Map<String, Object> getNotificationStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("emailEnabled", emailEnabled);
        stats.put("smsEnabled", smsEnabled);
        stats.put("whatsappEnabled", whatsappEnabled);
        stats.put("fromEmail", fromEmail);
        stats.put("emailsSentToday", 0);
        stats.put("smsSentToday", 0);

        // In-app notification stats
        try {
            Long userId = SecurityUtils.getCurrentUserId();
            Long unreadCount = inAppNotificationRepository.countByUserIdAndIsRead(userId, false);
            stats.put("unreadInAppNotifications", unreadCount);
        } catch (Exception e) {
            stats.put("unreadInAppNotifications", 0);
        }

        return stats;
    }

    // ============================================
    // NOTIFICATION SETTINGS (per-user persistence)
    // ============================================

    /**
     * Get notification settings for the current user directly from the User entity.
     * Defaults are defined on the User columns (true/true/true/false).
     */
    public Map<String, Object> getUserNotificationSettings() {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("emailNotifications", Boolean.TRUE.equals(user.getNotifEmail()));
        result.put("expiryAlerts",       Boolean.TRUE.equals(user.getNotifExpiryAlerts()));
        result.put("shareNotifications", Boolean.TRUE.equals(user.getNotifShare()));
        result.put("weeklyReports",      Boolean.TRUE.equals(user.getNotifWeeklyReports()));
        return result;
    }

    /**
     * Persist notification settings for the current user directly on the User row.
     * Partial updates supported — only keys present in the map are changed.
     */
    @Transactional
    public Map<String, Object> updateUserNotificationSettings(Map<String, Boolean> updates) {
        Long userId = SecurityUtils.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (updates.containsKey("emailNotifications"))
            user.setNotifEmail(updates.get("emailNotifications"));
        if (updates.containsKey("expiryAlerts"))
            user.setNotifExpiryAlerts(updates.get("expiryAlerts"));
        if (updates.containsKey("shareNotifications"))
            user.setNotifShare(updates.get("shareNotifications"));
        if (updates.containsKey("weeklyReports"))
            user.setNotifWeeklyReports(updates.get("weeklyReports"));

        userRepository.save(user);
        logger.info("Updated notification settings for user {}: {}", userId, updates);

        return getUserNotificationSettings();
    }
}