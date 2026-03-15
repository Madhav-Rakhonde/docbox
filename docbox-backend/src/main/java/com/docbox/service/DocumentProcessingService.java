package com.docbox.service;

import com.docbox.entity.Document;
import com.docbox.entity.DocumentCategory;
import com.docbox.repository.DocumentCategoryRepository;
import com.docbox.repository.DocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * DocumentProcessingService
 *
 * ══════════════════════════════════════════════════════════════════════
 * PURPOSE
 * ══════════════════════════════════════════════════════════════════════
 *
 * This service runs the slow parts of document upload in a background
 * thread AFTER the HTTP response has already been sent to the user.
 *
 * The user gets a response in ~0.5–1s.
 * OCR, classification, expiry extraction, and Cloudinary upload
 * complete in the background 5–30s later.
 * The document record is then updated with category, expiry date,
 * and status = "READY".
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT DOES
 * ══════════════════════════════════════════════════════════════════════
 *
 * processDocumentAsync(documentId, extractedText, categoryId):
 *   1. OCR / text extraction (if not already done during quick validate)
 *   2. Classification — detect category from extracted text
 *   3. Structured data extraction — find expiry date
 *   4. Update document record: category, expiryDate, ocrText, status
 *   5. Send expiry notification if needed
 *
 * All steps run in the Spring async thread pool (task.execution.pool).
 * If any step fails, the document stays in PROCESSING status —
 * the user can manually set category/expiry from the UI.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HOW IT IS CALLED
 * ══════════════════════════════════════════════════════════════════════
 *
 * DocumentService.uploadDocument() calls:
 *   1. Quick file validation (mime + size + extension)  ~50ms
 *   2. Hash + duplicate check                           ~50ms
 *   3. Cloudinary upload (overlapped with above)
 *   4. Save document with status=PROCESSING
 *   5. Return document to user                          ← response sent here (~0.5–1s)
 *   6. documentProcessingService.processDocumentAsync() ← runs in background
 *
 * ══════════════════════════════════════════════════════════════════════
 * DOCUMENT STATUS LIFECYCLE
 * ══════════════════════════════════════════════════════════════════════
 *
 *   PROCESSING  → saved immediately, user can see it in their list
 *   READY       → OCR + classification + expiry done, all fields set
 *   FAILED      → processing failed, user should set category manually
 *
 * The Document entity needs a `processingStatus` String field.
 * Add to Document.java:
 *   @Column(name = "processing_status")
 *   private String processingStatus = "READY";
 *
 * And getters/setters:
 *   public String getProcessingStatus() { return processingStatus; }
 *   public void setProcessingStatus(String s) { this.processingStatus = s; }
 */
@Service
public class DocumentProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentProcessingService.class);

    private static final List<DateTimeFormatter> DATE_FORMATS = Arrays.asList(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("d-M-yyyy"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("ddMMyyyy")
    );

    @Autowired private DocumentRepository            documentRepository;
    @Autowired private DocumentCategoryRepository    categoryRepository;
    @Autowired private PDFProcessingService          pdfProcessingService;
    @Autowired private DocumentClassificationService classificationService;
    @Autowired private NotificationService           notificationService;

    // ══════════════════════════════════════════════════════════════════════
    // ASYNC ENTRY POINT
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Process a document in the background after it has been saved.
     *
     * Called by DocumentService immediately after documentRepository.save()
     * and before returning the HTTP response. Because this method is @Async,
     * it returns immediately and runs in the thread pool.
     *
     * @param documentId    ID of the saved document
     * @param pdfBytes      raw PDF bytes (passed in so we don't re-fetch from Cloudinary)
     * @param filenameHint  original filename — used for filename-only classification fallback
     */
    @Async
    public void processDocumentAsync(Long documentId, byte[] pdfBytes, String filenameHint) {
        logger.info("Background processing started for document {}", documentId);
        long start = System.currentTimeMillis();

        try {
            // ── Step 1: Full PDF validation + text extraction ─────────────
            // This is the slow step (OCR). Runs in background, not on the HTTP thread.
            PDFProcessingService.PdfValidationResult pdfResult =
                    pdfProcessingService.validateAndExtract(pdfBytes);

            String extractedText = pdfResult.getExtractedText();
            int wordCount = pdfResult.getWordCount();

            logger.info("Document {} background OCR complete: {} words | {}ms",
                    documentId, wordCount, System.currentTimeMillis() - start);

            // ── Step 2: Classify — detect category from extracted text ────
            String detectedCategory = null;
            if (extractedText != null && !extractedText.isBlank()) {
                DocumentClassificationService.ClassificationResult cr =
                        classificationService.classify(extractedText, filenameHint);
                detectedCategory = cr.category;
                logger.info("Document {} classified as: {} (conf={:.2f}, ambiguous={})",
                        documentId, detectedCategory, cr.confidence, cr.isAmbiguous);
            } else if (filenameHint != null && !filenameHint.isBlank()) {
                detectedCategory = classificationService.detectCategory("", filenameHint);
                logger.info("Document {} filename-only category: {}", documentId, detectedCategory);
            }

            if (detectedCategory == null) {
                detectedCategory = "Others";
            }

            // ── Step 3: Find category entity ──────────────────────────────
            final String finalCategory = detectedCategory;
            DocumentCategory category = categoryRepository.findByName(finalCategory)
                    .orElseGet(() -> categoryRepository.findByName("Others").orElse(null));

            if (category == null) {
                logger.error("Document {}: category '{}' and 'Others' not found in DB",
                        documentId, finalCategory);
                markFailed(documentId);
                return;
            }

            // ── Step 4: Extract expiry date ───────────────────────────────
            LocalDate expiryDate = null;
            if (extractedText != null && !extractedText.isBlank()) {
                try {
                    Map<String, String> structured =
                            classificationService.extractStructuredData(extractedText, category.getName());
                    String expiryStr = structured.get("expiryDate");
                    if (expiryStr != null && !expiryStr.isBlank()) {
                        expiryDate = parseDate(expiryStr);
                        if (expiryDate != null && isPlausibleExpiry(expiryDate)) {
                            logger.info("Document {} expiry auto-detected: {}", documentId, expiryDate);
                        } else {
                            expiryDate = null;
                        }
                    }
                } catch (Exception ex) {
                    logger.warn("Document {} expiry extraction failed: {}", documentId, ex.getMessage());
                }
            }

            // ── Step 5: Update document record ────────────────────────────
            updateDocument(documentId, category, expiryDate, extractedText);

            // ── Step 6: Expiry notification (fire-and-forget) ────────────
            sendExpiryNotificationIfNeeded(documentId, expiryDate);

            logger.info("Background processing COMPLETE for document {} | {}ms total",
                    documentId, System.currentTimeMillis() - start);

        } catch (Exception ex) {
            logger.error("Background processing FAILED for document {}: {}",
                    documentId, ex.getMessage(), ex);
            markFailed(documentId);
        }
    }

    /**
     * Lightweight async processing when extractedText is already available
     * (e.g. the caller already ran a quick validation and got partial text).
     * Skips full OCR, runs only classification + expiry + DB update.
     *
     * @param documentId    ID of the saved document
     * @param extractedText text already extracted (may be partial/English-only)
     * @param filenameHint  original filename
     */
    @Async
    public void processDocumentAsyncWithText(Long documentId, String extractedText,
                                             String filenameHint) {
        logger.info("Background processing (text-only) started for document {}", documentId);
        long start = System.currentTimeMillis();
        try {
            // Classification
            String detectedCategory = "Others";
            if (extractedText != null && !extractedText.isBlank()) {
                DocumentClassificationService.ClassificationResult cr =
                        classificationService.classify(extractedText, filenameHint);
                detectedCategory = cr.category;
                logger.info("Document {} classified: {}", documentId, detectedCategory);
            }

            DocumentCategory category = categoryRepository.findByName(detectedCategory)
                    .orElseGet(() -> categoryRepository.findByName("Others").orElse(null));

            if (category == null) { markFailed(documentId); return; }

            // Expiry extraction
            LocalDate expiryDate = null;
            if (extractedText != null && !extractedText.isBlank()) {
                Map<String, String> structured =
                        classificationService.extractStructuredData(extractedText, category.getName());
                String expiryStr = structured.get("expiryDate");
                if (expiryStr != null && !expiryStr.isBlank()) {
                    LocalDate parsed = parseDate(expiryStr);
                    if (parsed != null && isPlausibleExpiry(parsed)) expiryDate = parsed;
                }
            }

            updateDocument(documentId, category, expiryDate, extractedText);
            sendExpiryNotificationIfNeeded(documentId, expiryDate);

            logger.info("Background processing COMPLETE (text-only) for document {} | {}ms",
                    documentId, System.currentTimeMillis() - start);

        } catch (Exception ex) {
            logger.error("Background processing failed for document {}: {}", documentId, ex.getMessage());
            markFailed(documentId);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════════════

    @Transactional
    protected void updateDocument(Long documentId, DocumentCategory category,
                                  LocalDate expiryDate, String extractedText) {
        documentRepository.findById(documentId).ifPresent(doc -> {
            doc.setCategory(category);
            if (expiryDate != null) doc.setExpiryDate(expiryDate);
            // Store OCR text if your Document entity has an ocrText field
            // doc.setOcrText(extractedText);
            doc.setProcessingStatus("READY");
            documentRepository.save(doc);
            logger.info("Document {} updated: category={}, expiry={}, status=READY",
                    documentId, category.getName(), expiryDate);
        });
    }

    @Transactional
    protected void markFailed(Long documentId) {
        documentRepository.findById(documentId).ifPresent(doc -> {
            doc.setProcessingStatus("FAILED");
            documentRepository.save(doc);
            logger.warn("Document {} marked as FAILED", documentId);
        });
    }

    private void sendExpiryNotificationIfNeeded(Long documentId, LocalDate expiryDate) {
        if (expiryDate == null) return;
        try {
            documentRepository.findById(documentId).ifPresent(doc -> {
                long daysUntil = doc.getDaysUntilExpiry();
                if (daysUntil >= 0 && daysUntil <= 90) {
                    notificationService.notifyDocumentExpiring(
                            doc.getUser().getId(),
                            doc.getCategory().getName(),
                            (int) daysUntil
                    );
                }
            });
        } catch (Exception ex) {
            logger.warn("Expiry notification failed for document {}: {}", documentId, ex.getMessage());
        }
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try { return LocalDate.parse(raw.trim(), fmt); }
            catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    private boolean isPlausibleExpiry(LocalDate d) {
        if (d == null) return false;
        LocalDate min = LocalDate.of(1947, 1, 1);
        LocalDate max = LocalDate.now().plusYears(50);
        return !d.isBefore(min) && !d.isAfter(max);
    }
}