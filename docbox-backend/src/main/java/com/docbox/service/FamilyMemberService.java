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
 * Family Member Service - Fixed and Working
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

    /**
     * Get all family members for current user
     */
    public List<FamilyMember> getMyFamilyMembers() {
        Long currentUserId = SecurityUtils.getCurrentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUserId));

        if (currentUser.isPrimaryAccount()) {
            return familyMemberRepository.findByPrimaryAccountId(currentUserId);
        } else {
            // Sub-account sees only themselves
            return familyMemberRepository.findByUserId(currentUserId)
                    .map(List::of)
                    .orElse(List.of());
        }
    }

    /**
     * Get family member by ID
     */
    public FamilyMember getFamilyMember(Long id) {
        Long currentUserId = SecurityUtils.getCurrentUserId();

        FamilyMember member = familyMemberRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("FamilyMember", "id", id));

        // Check permission
        if (!member.getPrimaryAccount().getId().equals(currentUserId) &&
                (member.getUser() == null || !member.getUser().getId().equals(currentUserId))) {
            throw new PermissionDeniedException("You don't have permission to access this family member");
        }

        return member;
    }

    /**
     * Create profile-only family member (no login)
     */
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

        // FamilyMember doesn't have email and phoneNumber fields - these should be removed
        // or you need to add these fields to the FamilyMember entity

        if (dateOfBirth != null && !dateOfBirth.isEmpty()) {
            member.setDateOfBirth(LocalDate.parse(dateOfBirth));
        }

        // FamilyMember entity doesn't have a 'role' field
        // The role is determined by whether user is null or not
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

    /**
     * Create sub-account family member with login credentials
     */
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

        // Check if email already exists (User entity uses email, not username)
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already exists");
        }

        // Create user account for login
        User subAccountUser = new User();
        subAccountUser.setFullName(name); // User entity has 'fullName', not 'name'
        subAccountUser.setEmail(email);
        subAccountUser.setPasswordHash(passwordEncoder.encode(password)); // User entity has 'passwordHash', not 'password'
        subAccountUser.setPhoneNumber(phoneNumber);
        subAccountUser.setRole(UserRole.SUB_ACCOUNT);
        subAccountUser.setPrimaryAccount(primaryAccount); // Set the User object, not ID
        subAccountUser.setIsActive(true);
        subAccountUser.setEmailVerified(true);
        subAccountUser.setCreatedAt(LocalDateTime.now());
        subAccountUser.setUpdatedAt(LocalDateTime.now());

        subAccountUser = userRepository.save(subAccountUser);

        // Create family member record linked to user
        FamilyMember member = new FamilyMember();
        member.setPrimaryAccount(primaryAccount);
        member.setUser(subAccountUser);
        member.setName(name);
        member.setRelationship(relationship);

        if (dateOfBirth != null && !dateOfBirth.isEmpty()) {
            member.setDateOfBirth(LocalDate.parse(dateOfBirth));
        }

        // FamilyMember doesn't have 'role' or 'username' fields
        member.setCreatedAt(LocalDateTime.now());
        member.setUpdatedAt(LocalDateTime.now());

        member = familyMemberRepository.save(member);

        Map<String, Object> result = new HashMap<>();
        result.put("member", member);
        result.put("user", subAccountUser);
        result.put("type", "SUB_ACCOUNT");
        result.put("email", email); // Return email instead of username
        result.put("message", "Sub-account created. Can login with email: " + email);

        logger.info("Created sub-account family member: {} (email: {})", name, email);

        return result;
    }

    /**
     * Update family member details
     */
    @Transactional
    public FamilyMember updateFamilyMember(Long id, Map<String, Object> updates) {
        FamilyMember member = getFamilyMember(id);

        if (updates.containsKey("name")) {
            member.setName(updates.get("name").toString());
            if (member.getUser() != null) {
                User user = member.getUser();
                user.setFullName(updates.get("name").toString()); // User entity has 'fullName', not 'name'
                userRepository.save(user);
            }
        }

        if (updates.containsKey("relationship")) {
            member.setRelationship(updates.get("relationship").toString());
        }

        if (updates.containsKey("email")) {
            // FamilyMember doesn't have email field
            // Only update user's email if this is a sub-account
            if (member.getUser() != null) {
                User user = member.getUser();
                user.setEmail(updates.get("email").toString());
                userRepository.save(user);
            }
        }

        if (updates.containsKey("phoneNumber")) {
            // FamilyMember doesn't have phoneNumber field
            // Only update user's phoneNumber if this is a sub-account
            if (member.getUser() != null) {
                User user = member.getUser();
                user.setPhoneNumber(updates.get("phoneNumber").toString());
                userRepository.save(user);
            }
        }

        if (updates.containsKey("dateOfBirth") && updates.get("dateOfBirth") != null) {
            String dob = updates.get("dateOfBirth").toString();
            if (!dob.isEmpty()) {
                member.setDateOfBirth(LocalDate.parse(dob));
            }
        }

        if (updates.containsKey("password") && member.getUser() != null) {
            String newPassword = updates.get("password").toString();
            if (newPassword != null && !newPassword.isEmpty()) {
                User user = member.getUser();
                user.setPasswordHash(passwordEncoder.encode(newPassword)); // User entity has 'passwordHash', not 'password'
                userRepository.save(user);
            }
        }

        member.setUpdatedAt(LocalDateTime.now());

        return familyMemberRepository.save(member);
    }

    /**
     * Delete family member and associated user account
     */
    @Transactional
    public void deleteFamilyMember(Long id) {
        FamilyMember member = getFamilyMember(id);

        // Check if trying to delete primary account through family member
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