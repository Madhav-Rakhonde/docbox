package com.docbox.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // LAZY is fine — @JsonIgnoreProperties prevents Jackson from touching the proxy.
    // If you ever serialize user directly, add a DTO instead.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash",
            "emailVerificationToken", "resetPasswordToken", "primaryAccount"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "family_member_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "primaryAccount", "user"})
    private FamilyMember familyMember;

    // EAGER: category is non-nullable and always needed in document responses.
    // Root cause of the original 400 error: LAZY proxy accessed after session closed.
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private DocumentCategory category;

    @NotBlank(message = "Original filename is required")
    @Column(name = "original_filename", nullable = false, length = 500)
    private String originalFilename;

    @NotBlank(message = "Stored filename is required")
    @Column(name = "stored_filename", unique = true, nullable = false, length = 500)
    private String storedFilename;

    @Column(length = 64, unique = false)
    private String fileHash;

    @NotBlank(message = "File path is required")
    @Column(name = "file_path", nullable = false, length = 1000)
    private String filePath;

    @NotNull(message = "File size is required")
    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @NotBlank(message = "File type is required")
    @Column(name = "file_type", nullable = false, length = 50)
    private String fileType;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "thumbnail_path", length = 1000)
    private String thumbnailPath;

    @Column(name = "page_count")
    private Integer pageCount = 1;

    @Column(name = "ocr_text", columnDefinition = "TEXT")
    private String ocrText;

    @Column(name = "ocr_confidence", precision = 5, scale = 2)
    private BigDecimal ocrConfidence;

    @Column(name = "auto_category_detected", length = 100)
    private String autoCategoryDetected;

    @Column(name = "is_validated")
    private Boolean isValidated = false;

    @Type(JsonBinaryType.class)
    @Column(name = "extracted_data", columnDefinition = "jsonb")
    private String extractedData;

    @Column(name = "document_number")
    private String documentNumber;

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "issuing_authority")
    private String issuingAuthority;

    @Column(name = "is_favorite")
    private Boolean isFavorite = false;

    @Column(name = "is_archived")
    private Boolean isArchived = false;

    @Column(name = "is_offline_available")
    private Boolean isOfflineAvailable = false;

    @Column(name = "offline_last_synced_at")
    private LocalDateTime offlineLastSyncedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "custom_tags", columnDefinition = "text[]")
    private String[] customTags;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "uploaded_by", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "passwordHash",
            "emailVerificationToken", "resetPasswordToken", "primaryAccount"})
    private User uploadedBy;

    // Helper methods
    public boolean isPdf() {
        return "PDF".equalsIgnoreCase(this.fileType);
    }

    public boolean isImage() {
        return fileType != null &&
                (fileType.equalsIgnoreCase("JPG") ||
                        fileType.equalsIgnoreCase("JPEG") ||
                        fileType.equalsIgnoreCase("PNG") ||
                        fileType.equalsIgnoreCase("WEBP") ||
                        fileType.equalsIgnoreCase("HEIC") ||
                        fileType.equalsIgnoreCase("BMP") ||
                        fileType.equalsIgnoreCase("TIFF"));
    }

    public boolean isExpired() {
        if (expiryDate == null) return false;
        return LocalDate.now().isAfter(expiryDate);
    }

    public boolean isExpiringSoon(int daysThreshold) {
        if (expiryDate == null) return false;
        LocalDate thresholdDate = LocalDate.now().plusDays(daysThreshold);
        return expiryDate.isBefore(thresholdDate) && !isExpired();
    }

    public long getFileSizeInKB() {
        return fileSize / 1024;
    }

    public long getFileSizeInMB() {
        return fileSize / (1024 * 1024);
    }

    public long getDaysUntilExpiry() {
        if (expiryDate == null) return Long.MAX_VALUE;
        return java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), expiryDate);
    }
}