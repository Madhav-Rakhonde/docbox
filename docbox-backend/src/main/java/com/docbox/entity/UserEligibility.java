package com.docbox.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * User Eligibility Entity
 * Tracks which schemes a user is eligible for and has been notified about
 */
@Entity
@Table(name = "user_eligibilities")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class UserEligibility {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash",
            "emailVerificationToken", "resetPasswordToken", "primaryAccount"})
    private User user;

    // EAGER: scheme details (name, category) are always needed in eligibility responses.
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "scheme_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private GovernmentScheme scheme;

    @Column(name = "is_eligible", nullable = false)
    private Boolean isEligible;

    @Column(name = "eligibility_score")
    private Integer eligibilityScore;

    @Column(name = "matched_criteria", columnDefinition = "TEXT")
    private String matchedCriteria;

    @Column(name = "missing_documents")
    private String missingDocuments;

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    @Column(name = "applied_at")
    private LocalDateTime appliedAt;

    @Column(name = "status")
    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "NOTIFIED";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}