package com.docbox.entity;

import com.docbox.enums.UserRole;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})  // FIX: Prevents proxy serialization errors when User is referenced as lazy from other entities
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @NotBlank(message = "Full name is required")
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Size(max = 15)
    @Column(name = "phone_number")
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.PRIMARY_ACCOUNT;

    // LAZY is safe here — primaryAccount is only needed in specific contexts.
    // @JsonIgnoreProperties prevents Jackson from triggering a proxy load during serialization.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_account_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash",
            "emailVerificationToken", "resetPasswordToken", "primaryAccount"})
    private User primaryAccount;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "notif_email", nullable = false)
    private Boolean notifEmail = true;

    @Column(name = "notif_expiry_alerts", nullable = false)
    private Boolean notifExpiryAlerts = true;

    @Column(name = "notif_share", nullable = false)
    private Boolean notifShare = true;

    @Column(name = "notif_weekly_reports", nullable = false)
    private Boolean notifWeeklyReports = false;

    // Helper methods
    public boolean isPrimaryAccount() {
        return this.role == UserRole.PRIMARY_ACCOUNT;
    }

    public boolean isSubAccount() {
        return this.role == UserRole.SUB_ACCOUNT;
    }

    public boolean isProfileOnly() {
        return this.role == UserRole.PROFILE_ONLY;
    }

    /**
     * Get the primary account ID (for both PRIMARY and SUB accounts)
     */
    public Long getPrimaryAccountId() {
        if (this.isPrimaryAccount()) {
            return this.id;
        } else if (this.isSubAccount() && this.primaryAccount != null) {
            return this.primaryAccount.getId();
        }
        return null;
    }
}