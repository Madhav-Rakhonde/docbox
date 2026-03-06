package com.docbox.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Government Scheme Entity (NEW)
 * Stores discovered government schemes from web scraping
 */
@Entity
@Table(name = "government_schemes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GovernmentScheme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String name;

    @Column(nullable = false, length = 100)
    private String category; // SCHOLARSHIP, SUBSIDY, PENSION, EMPLOYMENT, HOUSING, HEALTH, LOAN

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "benefits", columnDefinition = "TEXT")
    private String benefits;

    @Column(name = "eligibility_criteria", columnDefinition = "TEXT")
    private String eligibilityCriteria;

    // Eligibility Conditions
    @Column(name = "min_income")
    private Long minIncome;

    @Column(name = "max_income")
    private Long maxIncome;

    @Column(name = "required_castes")
    private String requiredCastes; // Comma-separated: SC,ST,OBC,General

    @Column(name = "required_gender")
    private String requiredGender; // MALE, FEMALE, OTHER, ALL

    @Column(name = "min_age")
    private Integer minAge;

    @Column(name = "max_age")
    private Integer maxAge;

    @Column(name = "required_education")
    private String requiredEducation; // Comma-separated: 10TH,12TH,GRADUATE

    @Column(name = "required_state")
    private String requiredState; // Maharashtra, Karnataka, etc.

    @Column(name = "required_documents")
    private String requiredDocuments; // Comma-separated: INCOME_CERT,CASTE_CERT

    // Special Categories
    @Column(name = "for_students")
    private Boolean forStudents;

    @Column(name = "for_women")
    private Boolean forWomen;

    @Column(name = "for_farmers")
    private Boolean forFarmers;

    @Column(name = "for_senior_citizens")
    private Boolean forSeniorCitizens;

    @Column(name = "for_disabled")
    private Boolean forDisabled;

    // Scheme Details
    @Column(name = "amount")
    private Long amount; // Benefit amount in INR

    @Column(name = "application_start_date")
    private LocalDate applicationStartDate;

    @Column(name = "application_end_date")
    private LocalDate applicationEndDate;

    @Column(name = "application_url", length = 1000)
    private String applicationUrl;

    @Column(name = "official_website", length = 1000)
    private String officialWebsite;

    @Column(name = "helpline_number", length = 50)
    private String helplineNumber;

    @Column(name = "issuing_authority", length = 500)
    private String issuingAuthority;

    @Column(name = "priority")
    private Integer priority; // Higher = shown first (1-10)

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "tags")
    private String tags; // Comma-separated for search

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
        if (priority == null) priority = 5;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}