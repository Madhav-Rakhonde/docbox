package com.docbox.service;

import com.docbox.entity.Document;
import com.docbox.entity.EmergencyAccessRequest;
import com.docbox.entity.FamilyMember;
import com.docbox.entity.User;
import com.docbox.enums.PermissionLevel;
import com.docbox.exception.BadRequestException;
import com.docbox.exception.PermissionDeniedException;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.repository.DocumentRepository;
import com.docbox.repository.EmergencyAccessRequestRepository;
import com.docbox.repository.FamilyMemberRepository;
import com.docbox.repository.UserRepository;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Emergency Access Service
 * Handles emergency access requests from sub-accounts
 */
@Service
public class EmergencyAccessService {

    private static final Logger logger = LoggerFactory.getLogger(EmergencyAccessService.class);

    @Autowired
    private EmergencyAccessRequestRepository requestRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    /**
     * Create emergency access request
     */
    @Transactional
    public EmergencyAccessRequest createRequest(Long documentId, String reason) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        // Only SUB_ACCOUNT can request emergency access
        if (!currentUser.isSubAccount()) {
            throw new BadRequestException("Only sub-accounts can request emergency access");
        }

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", "id", documentId));

        // Get primary account
        User primaryAccount = currentUser.getPrimaryAccount();
        if (primaryAccount == null) {
            throw new BadRequestException("Primary account not found");
        }

        // Check if already has access
        if (permissionService.canAccessDocument(currentUserId, documentId, PermissionLevel.VIEW_ONLY)) {
            throw new BadRequestException("You already have access to this document");
        }

        // Check if already has pending request
        List<EmergencyAccessRequest> existingRequests = requestRepository
                .findByDocumentAndRequestedBy(document, currentUser);

        for (EmergencyAccessRequest existing : existingRequests) {
            if (existing.isPending()) {
                throw new BadRequestException("You already have a pending request for this document");
            }
        }

        // Create request
        EmergencyAccessRequest request = new EmergencyAccessRequest();
        request.setDocument(document);
        request.setRequestedBy(currentUser);
        request.setPrimaryAccount(primaryAccount);
        request.setRequestReason(reason);
        request.setStatus("PENDING");

        request = requestRepository.save(request);

        logger.info("Emergency access request created: user={}, document={}",
                currentUserId, documentId);

        // Send notification to primary account
        try {
            notificationService.sendEmergencyAccessRequest(request);
        } catch (Exception e) {
            logger.error("Failed to send emergency access notification", e);
        }

        return request;
    }

    /**
     * Review emergency access request
     */
    @Transactional
    public EmergencyAccessRequest reviewRequest(Long requestId, boolean approved,
                                                String reviewNotes, PermissionLevel grantedLevel,
                                                LocalDateTime expiresAt) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        // Only PRIMARY_ACCOUNT can review
        if (!currentUser.isPrimaryAccount()) {
            throw new PermissionDeniedException("Only primary account can review requests");
        }

        EmergencyAccessRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request", "id", requestId));

        // Verify ownership
        if (!request.getPrimaryAccount().getId().equals(currentUserId)) {
            throw new PermissionDeniedException("You can only review requests for your family");
        }

        // Check if already reviewed
        if (!request.isPending()) {
            throw new BadRequestException("This request has already been reviewed");
        }

        if (approved) {
            request.approve(currentUser, reviewNotes);

            // Grant permission
            PermissionLevel levelToGrant = grantedLevel != null ?
                    grantedLevel : PermissionLevel.VIEW_DOWNLOAD;

            // ✅ FIXED: Find FamilyMember by user
            FamilyMember familyMember = familyMemberRepository.findByUser(request.getRequestedBy())
                    .orElse(null);

            if (familyMember != null) {
                permissionService.grantPermission(
                        familyMember.getId(),
                        request.getDocument().getId(),
                        levelToGrant
                );
                logger.info("Emergency access APPROVED: request={}, level={}", requestId, levelToGrant);
            } else {
                // If no family member record exists, this is an error state
                logger.error("No family member found for user {}, cannot grant permission",
                        request.getRequestedBy().getId());
                throw new BadRequestException("Family member record not found for this user");
            }
        } else {
            request.reject(currentUser, reviewNotes);
            logger.info("Emergency access REJECTED: request={}", requestId);
        }

        request = requestRepository.save(request);

        // Send notification to requester
        try {
            notificationService.sendEmergencyAccessDecision(request, approved);
        } catch (Exception e) {
            logger.error("Failed to send emergency access decision notification", e);
        }

        return request;
    }

    /**
     * Get pending requests for current primary account
     */
    public List<EmergencyAccessRequest> getPendingRequests() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (!currentUser.isPrimaryAccount()) {
            throw new PermissionDeniedException("Only primary account can view requests");
        }

        return requestRepository.findPendingRequestsForPrimaryAccount(currentUserId);
    }

    /**
     * Get all requests for current primary account
     */
    public List<EmergencyAccessRequest> getAllRequests() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (!currentUser.isPrimaryAccount()) {
            throw new PermissionDeniedException("Only primary account can view requests");
        }

        return requestRepository.findByPrimaryAccount(currentUser);
    }

    /**
     * Get my requests (for sub-accounts)
     */
    public List<EmergencyAccessRequest> getMyRequests() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        return requestRepository.findByRequestedBy(currentUser);
    }

    /**
     * Get pending count for primary account
     */
    public long getPendingCount() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (!currentUser.isPrimaryAccount()) {
            return 0L;
        }

        return requestRepository.countPendingRequestsForPrimaryAccount(currentUserId);
    }
}