package com.docbox.service;

import com.docbox.entity.FamilyMember;
import com.docbox.entity.User;
import com.docbox.enums.UserRole;
import com.docbox.exception.BadRequestException;
import com.docbox.exception.PermissionDeniedException;
import com.docbox.exception.ResourceNotFoundException;
import com.docbox.repository.FamilyMemberRepository;
import com.docbox.repository.UserRepository;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * FamilyMemberService v1.1
 * FIX: Read methods are now @Transactional(readOnly = true) so the Hibernate
 * session stays open when the controller accesses lazy associations
 * (FamilyMember.user, FamilyMember.primaryAccount).
 * Previously getMyFamilyMembers() and getFamilyMember() had no @Transactional,
 * so the session closed before FamilyMemberController.buildFamilyMemberResponse()
 * could call fm.getUser().getEmail() → LazyInitializationException.
 */
@Service
public class FamilyMemberService {

    private static final Logger logger = LoggerFactory.getLogger(FamilyMemberService.class);

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // ════════════════════════════════════════════════════════════════════════════
    // READ — @Transactional(readOnly = true)  ← THE KEY FIX
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * ✅ FIX: @Transactional(readOnly = true) keeps the Hibernate session open
     * so the controller can safely call fm.getUser().getEmail() etc.
     */
    @Transactional(readOnly = true)
    public List<FamilyMember> getMyFamilyMembers() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (currentUser.isPrimaryAccount()) {
            return familyMemberRepository.findByPrimaryAccountId(currentUserId);
        } else {
            return familyMemberRepository.findByUserId(currentUserId)
                    .map(List::of)
                    .orElse(List.of());
        }
    }

    /**
     * ✅ FIX: @Transactional(readOnly = true) keeps session open.
     */
    @Transactional(readOnly = true)
    public FamilyMember getFamilyMember(Long id) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        FamilyMember member = familyMemberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyMember", "id", id));

        if (!member.getPrimaryAccount().getId().equals(currentUserId) &&
                (member.getUser() == null || !member.getUser().getId().equals(currentUserId))) {
            throw new PermissionDeniedException("You don't have permission to access this family member");
        }

        return member;
    }

    /**
     * ✅ FIX: @Transactional(readOnly = true) for deprecated method too.
     */
    @Transactional(readOnly = true)
    public List<FamilyMember> getFamilyMembers(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        if (user.isPrimaryAccount()) {
            return familyMemberRepository.findByPrimaryAccountId(userId);
        } else {
            return familyMemberRepository.findByUserId(userId)
                    .map(List::of)
                    .orElse(List.of());
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // WRITE
    // ════════════════════════════════════════════════════════════════════════════

    @Transactional
    public Map<String, Object> createProfileOnlyMember(String name, String relationship,
                                                       String email, String phoneNumber,
                                                       String dateOfBirth) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User primaryAccount = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (!primaryAccount.isPrimaryAccount()) {
            throw new PermissionDeniedException("Only primary account can add family members");
        }

        FamilyMember member = new FamilyMember();
        member.setPrimaryAccount(primaryAccount);
        member.setName(name);
        member.setRelationship(relationship);

        if (dateOfBirth != null && !dateOfBirth.isEmpty()) {
            member.setDateOfBirth(LocalDate.parse(dateOfBirth));
        }

        member.setCreatedAt(LocalDateTime.now());
        member.setUpdatedAt(LocalDateTime.now());

        member = familyMemberRepository.save(member);

        Map<String, Object> result = new HashMap<>();
        result.put("member", member);
        result.put("type", "PROFILE_ONLY");
        result.put("message", "Profile-only member created. No login credentials needed.");

        logger.info("Created profile-only family member: {}", name);
        return result;
    }

    @Transactional
    public Map<String, Object> createSubAccountMember(String name, String relationship,
                                                      String email, String phoneNumber,
                                                      String dateOfBirth, String username,
                                                      String password) {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User primaryAccount = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (!primaryAccount.isPrimaryAccount()) {
            throw new PermissionDeniedException("Only primary account can create sub-accounts");
        }

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already exists");
        }

        User subAccountUser = new User();
        subAccountUser.setFullName(name);
        subAccountUser.setEmail(email);
        subAccountUser.setPasswordHash(passwordEncoder.encode(password));
        subAccountUser.setPhoneNumber(phoneNumber);
        subAccountUser.setRole(UserRole.SUB_ACCOUNT);
        subAccountUser.setPrimaryAccount(primaryAccount);
        subAccountUser.setIsActive(true);
        subAccountUser.setEmailVerified(true);
        subAccountUser.setCreatedAt(LocalDateTime.now());
        subAccountUser.setUpdatedAt(LocalDateTime.now());

        subAccountUser = userRepository.save(subAccountUser);

        FamilyMember member = new FamilyMember();
        member.setPrimaryAccount(primaryAccount);
        member.setUser(subAccountUser);
        member.setName(name);
        member.setRelationship(relationship);

        if (dateOfBirth != null && !dateOfBirth.isEmpty()) {
            member.setDateOfBirth(LocalDate.parse(dateOfBirth));
        }

        member.setCreatedAt(LocalDateTime.now());
        member.setUpdatedAt(LocalDateTime.now());

        member = familyMemberRepository.save(member);

        Map<String, Object> result = new HashMap<>();
        result.put("member", member);
        result.put("user", subAccountUser);
        result.put("type", "SUB_ACCOUNT");
        result.put("email", email);
        result.put("message", "Sub-account created. Can login with email: " + email);

        logger.info("Created sub-account family member: {} (email: {})", name, email);
        return result;
    }

    @Transactional
    public FamilyMember updateFamilyMember(Long id, Map<String, Object> updates) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        FamilyMember member = familyMemberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyMember", "id", id));

        // Permission check inline (can't call getFamilyMember — different @Transactional context)
        if (!member.getPrimaryAccount().getId().equals(currentUserId) &&
                (member.getUser() == null || !member.getUser().getId().equals(currentUserId))) {
            throw new PermissionDeniedException("You don't have permission to update this family member");
        }

        User primaryAccount = member.getPrimaryAccount();

        // Check if converting PROFILE_ONLY → SUB_ACCOUNT
        String accountType = (String) updates.get("accountType");
        String role        = (String) updates.get("role");
        Boolean isSubAccount = (Boolean) updates.get("isSubAccount");

        boolean wantsSubAccount = "sub_account".equals(accountType)
                || "SUB_ACCOUNT".equals(accountType)
                || "SUB_ACCOUNT".equals(role)
                || Boolean.TRUE.equals(isSubAccount);

        if (wantsSubAccount && member.getUser() == null) {
            String email    = (String) updates.get("email");
            String username = (String) updates.get("username");
            String password = (String) updates.get("password");

            if (email == null || email.trim().isEmpty()) email = username;
            if (email == null || email.trim().isEmpty()) {
                throw new BadRequestException("Email is required to create sub-account");
            }
            if (password == null || password.trim().isEmpty()) {
                throw new BadRequestException("Password is required to create sub-account");
            }
            if (userRepository.existsByEmail(email)) {
                throw new BadRequestException("Email already exists");
            }

            User newUser = new User();
            newUser.setFullName(member.getName());
            newUser.setEmail(email);
            newUser.setPasswordHash(passwordEncoder.encode(password));
            newUser.setPhoneNumber((String) updates.get("phoneNumber"));
            newUser.setRole(UserRole.SUB_ACCOUNT);
            newUser.setPrimaryAccount(primaryAccount);
            newUser.setIsActive(true);
            newUser.setEmailVerified(true);
            newUser.setCreatedAt(LocalDateTime.now());
            newUser.setUpdatedAt(LocalDateTime.now());

            newUser = userRepository.save(newUser);
            member.setUser(newUser);

            logger.info("Created User {} for FamilyMember {} (PROFILE_ONLY → SUB_ACCOUNT)",
                    newUser.getId(), member.getId());
        }

        if (updates.containsKey("name")) {
            member.setName(updates.get("name").toString());
            if (member.getUser() != null) {
                member.getUser().setFullName(updates.get("name").toString());
                userRepository.save(member.getUser());
            }
        }

        if (updates.containsKey("relationship")) {
            member.setRelationship(updates.get("relationship").toString());
        }

        if (updates.containsKey("email") && member.getUser() != null) {
            String newEmail = updates.get("email").toString();
            if (!newEmail.equals(member.getUser().getEmail())) {
                if (userRepository.existsByEmail(newEmail)) {
                    throw new BadRequestException("Email already exists");
                }
                member.getUser().setEmail(newEmail);
                userRepository.save(member.getUser());
            }
        }

        if (updates.containsKey("phoneNumber") && member.getUser() != null) {
            member.getUser().setPhoneNumber(updates.get("phoneNumber").toString());
            userRepository.save(member.getUser());
        }

        if (updates.containsKey("dateOfBirth") && updates.get("dateOfBirth") != null) {
            String dob = updates.get("dateOfBirth").toString();
            if (!dob.isEmpty()) {
                member.setDateOfBirth(LocalDate.parse(dob));
            }
        }

        if (updates.containsKey("password") && member.getUser() != null) {
            String newPassword = updates.get("password").toString();
            if (!newPassword.isEmpty()) {
                member.getUser().setPasswordHash(passwordEncoder.encode(newPassword));
                userRepository.save(member.getUser());
            }
        }

        member.setUpdatedAt(LocalDateTime.now());
        return familyMemberRepository.save(member);
    }

    @Transactional
    public void deleteFamilyMember(Long id) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        FamilyMember member = familyMemberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyMember", "id", id));

        if (!member.getPrimaryAccount().getId().equals(currentUserId)) {
            throw new PermissionDeniedException("Only the primary account can delete family members");
        }

        if (member.getUser() != null && member.getUser().getRole() == UserRole.PRIMARY_ACCOUNT) {
            throw new BadRequestException("Cannot delete primary account");
        }

        if (member.getUser() != null) {
            userRepository.delete(member.getUser());
            logger.info("Deleted user account for family member: {}", id);
        }

        familyMemberRepository.delete(member);
        logger.info("Deleted family member: {}", id);
    }
}