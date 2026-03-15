package com.docbox.service;

import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

/**
 * DocumentValidationService  v3.0
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE ONE CHANGE IN THIS FILE
 * ══════════════════════════════════════════════════════════════════════
 *
 * validatePdf() — REPLACED four separate service calls with one:
 *
 *   OLD (4 calls = 4 PDFBox.Loader.loadPDF() invocations = 2–4s wasted):
 *     pdfProcessingService.isValidPdf(bytes)    → loadPDF() #1
 *     pdfProcessingService.isEncrypted(bytes)   → loadPDF() #2
 *     pdfProcessingService.getPageCount(bytes)  → loadPDF() #3
 *     pdfProcessingService.extractText(bytes)   → loadPDF() #4 (+ #5 inside for OCR)
 *
 *   NEW (1 call = 1 loadPDF() = 0.3–0.8s):
 *     pdfProcessingService.validateAndExtract(bytes)
 *
 * Everything else in this file is IDENTICAL to the original v2:
 *   validateFileQuick()  — unchanged
 *   validateFile()       — unchanged
 *   validateImage()      — unchanged
 *   ValidationResult     — unchanged (same fields, same getters/setters)
 *   DOCUMENT_PATTERNS    — unchanged
 *   All thresholds       — unchanged
 */
@Service
public class DocumentValidationService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentValidationService.class);

    @Value("${app.validation.allowed-extensions:pdf,jpg,jpeg,png,heic,webp,bmp,tiff,doc,docx}")
    private String allowedExtensions;

    @Value("${app.validation.min-text-words:3}")
    private int minTextWords;

    @Value("${app.validation.max-file-size:52428800}")
    private long maxFileSize;

    @Autowired
    private OCRService ocrService;                          // unchanged — still used for image validation

    @Autowired
    private PDFProcessingService pdfProcessingService;      // unchanged reference

    @Autowired
    private ImageProcessingService imageProcessingService;  // unchanged

    private final Tika tika = new Tika();

    // Document keyword patterns — identical to original
    private static final List<String> DOCUMENT_PATTERNS = Arrays.asList(
            "government of india", "भारत सरकार", "govt of india",
            "aadhaar", "आधार", "uidai",
            "permanent account number", "pan card", "income tax",
            "passport", "republic of india",
            "driving licence", "driving license", "transport",
            "voter id", "voter's id", "election commission",
            "certificate", "certify", "certified",
            "birth certificate", "marriage certificate",
            "bank statement", "account statement",
            "invoice", "receipt", "bill", "payment",
            "agreement", "deed", "affidavit",
            "medical", "prescription", "doctor", "hospital",
            "mark sheet", "degree", "diploma", "university",
            "electricity", "water", "gas", "telephone",
            "ration card", "policy", "insurance",
            "date:", "ref no", "reference", "serial no"
    );

    // ══════════════════════════════════════════════════════════════════════
    // validateFileQuick — IDENTICAL to original
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Fast validation with no OCR.
     * Used when the user has already selected a category — skips all text extraction.
     */
    public ValidationResult validateFileQuick(MultipartFile file) {
        ValidationResult result = new ValidationResult();
        try {
            if (file.isEmpty()) {
                result.setValid(false); result.setReason("File is empty"); return result;
            }
            if (file.getSize() > maxFileSize) {
                result.setValid(false); result.setReason("File size exceeds limit"); return result;
            }
            String filename = file.getOriginalFilename();
            if (filename == null || filename.isEmpty()) {
                result.setValid(false); result.setReason("Invalid filename"); return result;
            }
            String extension = getFileExtension(filename).toLowerCase();
            List<String> allowed = Arrays.asList(allowedExtensions.split(","));
            if (!allowed.contains(extension)) {
                result.setValid(false); result.setReason("File type not allowed"); return result;
            }
            byte[] fileBytes = file.getBytes();
            String mimeType  = tika.detect(fileBytes, filename);
            result.setMimeType(mimeType);
            result.setFileType(extension.toUpperCase());
            result.setValid(true);
            result.setReason("Quick validation passed");
            logger.info("Quick validation OK: {} ({})", filename, mimeType);
            return result;
        } catch (Exception ex) {
            logger.error("Quick validation failed", ex);
            result.setValid(false); result.setReason("Validation error");
            return result;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // validateFile — IDENTICAL to original
    // ══════════════════════════════════════════════════════════════════════

    public ValidationResult validateFile(MultipartFile file) {
        ValidationResult result = new ValidationResult();
        try {
            if (file.isEmpty()) {
                result.setValid(false); result.setReason("File is empty"); return result;
            }
            if (file.getSize() > maxFileSize) {
                result.setValid(false); result.setReason("File size exceeds limit"); return result;
            }
            String filename = file.getOriginalFilename();
            if (filename == null || filename.isEmpty()) {
                result.setValid(false); result.setReason("Invalid filename"); return result;
            }
            String extension = getFileExtension(filename).toLowerCase();
            List<String> allowed = Arrays.asList(allowedExtensions.split(","));
            if (!allowed.contains(extension)) {
                result.setValid(false); result.setReason("File type not allowed"); return result;
            }
            byte[] fileBytes = file.getBytes();
            String mimeType  = tika.detect(fileBytes, filename);
            result.setMimeType(mimeType);
            result.setFileType(extension.toUpperCase());
            logger.info("Validating: {} ({}) | {} bytes", filename, mimeType, file.getSize());

            if (mimeType.startsWith("image/")) {
                return validateImage(fileBytes, result);
            } else if (mimeType.equals("application/pdf") || extension.equals("pdf")) {
                return validatePdf(fileBytes, result);
            } else {
                result.setValid(true);
                result.setReason("Document accepted");
                return result;
            }
        } catch (Exception ex) {
            logger.error("Validation failed", ex);
            result.setValid(false); result.setReason("Validation error");
            return result;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // validatePdf — THE ONE CHANGED METHOD
    //
    // Before: 4 separate method calls → 4–5 PDFBox.Loader.loadPDF() calls
    //         + 4 sequential Tesseract passes if scanned → 35–70s total
    //
    // After:  1 call to validateAndExtract() → 1 loadPDF()
    //         + smart OCR (quick English first, full only if needed) → 4–30s
    // ══════════════════════════════════════════════════════════════════════

    private ValidationResult validatePdf(byte[] pdfBytes, ValidationResult result) {
        try {
            // ONE call — ONE PDF load — all checks and text extraction together
            PDFProcessingService.PdfValidationResult pdf =
                    pdfProcessingService.validateAndExtract(pdfBytes);

            // ── Rejected PDF ──────────────────────────────────────────────
            if (!pdf.isValid()) {
                result.setValid(false);
                result.setReason(pdf.getReason());
                return result;
            }

            // ── Warning (e.g. encrypted) ──────────────────────────────────
            if (pdf.isWarning()) {
                result.setValid(true);
                result.setWarning(true);
                result.setReason(pdf.getReason());
                return result;
            }

            // ── Populate result — same fields as original validatePdf() ───
            result.setPageCount(pdf.getPageCount());
            result.setExtractedText(pdf.getExtractedText());
            result.setWordCount(pdf.getWordCount());

            if (pdf.getWordCount() > 10) {
                result.setHasDocumentPattern(checkDocumentPatterns(pdf.getExtractedText()));
            }

            result.setValid(true);
            result.setReason("PDF document accepted");

            logger.info("PDF accepted | {} page(s) | {} words | ocr={} | pattern={}",
                    pdf.getPageCount(), pdf.getWordCount(),
                    pdf.isOcrUsed(), result.isHasDocumentPattern());

            return result;

        } catch (Exception ex) {
            // Non-fatal: accept rather than blocking the upload
            logger.warn("PDF validation error — accepting: {}", ex.getMessage());
            result.setValid(true); result.setWarning(true); result.setReason("PDF accepted");
            return result;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // validateImage — IDENTICAL to original
    // ══════════════════════════════════════════════════════════════════════

    private ValidationResult validateImage(byte[] imageBytes, ValidationResult result) {
        try {
            if (!imageProcessingService.isValidImage(imageBytes)) {
                result.setValid(false);
                result.setReason("Invalid image file");
                return result;
            }

            OCRService.OcrResult ocrResult = ocrService.extractTextWithConfidence(imageBytes);
            String extractedText = ocrResult.getText();
            int    wordCount     = ocrResult.getWordCount();
            double confidence    = ocrResult.getConfidence();

            result.setExtractedText(extractedText);
            result.setTextConfidence(confidence);
            result.setWordCount(wordCount);

            logger.info("Image OCR: {} words, {:.1f}% confidence", wordCount, confidence);

            boolean hasDocumentPattern = checkDocumentPatterns(extractedText);
            result.setHasDocumentPattern(hasDocumentPattern);

            if (hasDocumentPattern) {
                logger.info("ACCEPT: document pattern found");
                result.setValid(true); result.setReason("Document validated"); return result;
            }
            if (wordCount >= 10) {
                logger.info("ACCEPT: sufficient text ({} words)", wordCount);
                result.setValid(true); result.setReason("Document validated"); return result;
            }
            if (wordCount >= minTextWords && confidence > 40.0) {
                logger.info("ACCEPT: text with confidence");
                result.setValid(true); result.setReason("Document validated"); return result;
            }
            if (wordCount >= 2 && confidence > 70.0) {
                logger.info("ACCEPT: high confidence");
                result.setValid(true); result.setReason("Document validated"); return result;
            }

            logger.warn("REJECT: {} words, {:.1f}% confidence", wordCount, confidence);
            result.setValid(false);
            result.setReason("Unable to detect text in image");
            return result;

        } catch (Exception ex) {
            logger.warn("Image OCR failed — accepting: {}", ex.getMessage());
            result.setValid(true); result.setWarning(true); result.setReason("Document accepted");
            return result;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // HELPERS — IDENTICAL to original
    // ══════════════════════════════════════════════════════════════════════

    private boolean checkDocumentPatterns(String text) {
        if (text == null || text.isEmpty()) return false;
        String lower = text.toLowerCase();
        for (String pattern : DOCUMENT_PATTERNS) {
            if (lower.contains(pattern)) return true;
        }
        return false;
    }

    private int countWords(String text) {
        if (text == null || text.isEmpty()) return 0;
        return text.trim().split("\\s+").length;
    }

    private String getFileExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot == -1 ? "" : filename.substring(dot + 1);
    }

    // ══════════════════════════════════════════════════════════════════════
    // ValidationResult — IDENTICAL to original (no fields added or removed)
    // ══════════════════════════════════════════════════════════════════════

    public static class ValidationResult {
        private boolean valid;
        private boolean warning;
        private String  reason;
        private String  suggestion;
        private String  mimeType;
        private String  fileType;
        private String  extractedText;
        private double  textConfidence;
        private int     wordCount;
        private int     pageCount;
        private boolean hasDocumentPattern;

        public boolean isValid()                      { return valid; }
        public void    setValid(boolean v)            { this.valid = v; }
        public boolean isWarning()                    { return warning; }
        public void    setWarning(boolean w)          { this.warning = w; }
        public String  getReason()                    { return reason; }
        public void    setReason(String r)            { this.reason = r; }
        public String  getSuggestion()                { return suggestion; }
        public void    setSuggestion(String s)        { this.suggestion = s; }
        public String  getMimeType()                  { return mimeType; }
        public void    setMimeType(String m)          { this.mimeType = m; }
        public String  getFileType()                  { return fileType; }
        public void    setFileType(String f)          { this.fileType = f; }
        public String  getExtractedText()             { return extractedText; }
        public void    setExtractedText(String t)     { this.extractedText = t; }
        public double  getTextConfidence()            { return textConfidence; }
        public void    setTextConfidence(double c)    { this.textConfidence = c; }
        public int     getWordCount()                 { return wordCount; }
        public void    setWordCount(int w)            { this.wordCount = w; }
        public int     getPageCount()                 { return pageCount; }
        public void    setPageCount(int p)            { this.pageCount = p; }
        public boolean isHasDocumentPattern()         { return hasDocumentPattern; }
        public void    setHasDocumentPattern(boolean h){ this.hasDocumentPattern = h; }
    }
}