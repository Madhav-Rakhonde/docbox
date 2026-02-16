package com.docbox.entity;

import com.docbox.enums.PermissionLevel;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Category Permission Entity - FIXED
 * Stores default permissions for entire document categories
 */
@Entity
@Table(name = "category_permissions")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})  // ✅ FIX: Ignore Hibernate proxy
public class CategoryPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})  // ✅ FIX
    private DocumentCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_account_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "emailVerificationToken", "resetPasswordToken"})  // ✅ FIX
    private User primaryAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash", "emailVerificationToken", "resetPasswordToken"})  // ✅ FIX
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_permission_level", nullable = false)
    private PermissionLevel defaultPermissionLevel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash"})  // ✅ FIX
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public DocumentCategory getCategory() {
        return category;
    }

    public void setCategory(DocumentCategory category) {
        this.category = category;
    }

    public User getPrimaryAccount() {
        return primaryAccount;
    }

    public void setPrimaryAccount(User primaryAccount) {
        this.primaryAccount = primaryAccount;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public PermissionLevel getDefaultPermissionLevel() {
        return defaultPermissionLevel;
    }

    public void setDefaultPermissionLevel(PermissionLevel defaultPermissionLevel) {
        this.defaultPermissionLevel = defaultPermissionLevel;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(User createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}