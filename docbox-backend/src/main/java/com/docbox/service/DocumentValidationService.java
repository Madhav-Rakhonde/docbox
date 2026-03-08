package com.docbox.service;

import com.docbox.exception.FileValidationException;
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
 * Document Validation Service - PRODUCTION READY
 * Smart validation that accepts valid documents while filtering obvious non-documents
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
    private OCRService ocrService;

    @Autowired
    private PDFProcessingService pdfProcessingService;

    @Autowired
    private ImageProcessingService imageProcessingService;

    private final Tika tika = new Tika();

    // Enhanced document patterns
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

    /**
     * FAST validation — no OCR, no text extraction.
     * Used when the user has already selected a category so we skip the slow
     * Tesseract passes. Only checks size, extension, and MIME type.
     */
    public ValidationResult validateFileQuick(MultipartFile file) {
        ValidationResult result = new ValidationResult();
        try {
            if (file.isEmpty()) { result.setValid(false); result.setReason("File is empty"); return result; }
            if (file.getSize() > maxFileSize) { result.setValid(false); result.setReason("File size exceeds limit"); return result; }

            String filename = file.getOriginalFilename();
            if (filename == null || filename.isEmpty()) { result.setValid(false); result.setReason("Invalid filename"); return result; }

            String extension = getFileExtension(filename).toLowerCase();
            List<String> allowed = Arrays.asList(allowedExtensions.split(","));
            if (!allowed.contains(extension)) { result.setValid(false); result.setReason("File type not allowed"); return result; }

            byte[] fileBytes = file.getBytes();
            String mimeType = tika.detect(fileBytes, filename);
            result.setMimeType(mimeType);
            result.setFileType(extension.toUpperCase());
            result.setValid(true);
            result.setReason("Quick validation passed");
            logger.info("Quick validation OK: {} ({})", filename, mimeType);
            return result;
        } catch (Exception ex) {
            logger.error("Quick validation failed", ex);
            result.setValid(false);
            result.setReason("Validation error");
            return result;
        }
    }

    public ValidationResult validateFile(MultipartFile file) {
        ValidationResult result = new ValidationResult();

        try {
            if (file.isEmpty()) {
                result.setValid(false);
                result.setReason("File is empty");
                return result;
            }

            if (file.getSize() > maxFileSize) {
                result.setValid(false);
                result.setReason("File size exceeds limit");
                return result;
            }

            String filename = file.getOriginalFilename();
            if (filename == null || filename.isEmpty()) {
                result.setValid(false);
                result.setReason("Invalid filename");
                return result;
            }

            String extension = getFileExtension(filename).toLowerCase();
            List<String> allowed = Arrays.asList(allowedExtensions.split(","));

            if (!allowed.contains(extension)) {
                result.setValid(false);
                result.setReason("File type not allowed");
                return result;
            }

            byte[] fileBytes = file.getBytes();
            String mimeType = tika.detect(fileBytes, filename);
            result.setMimeType(mimeType);
            result.setFileType(extension.toUpperCase());

            logger.info("Validating: {} ({}), {} bytes", filename, mimeType, file.getSize());

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
            result.setValid(false);
            result.setReason("Validation error");
            return result;
        }
    }

    private ValidationResult validateImage(byte[] imageBytes, ValidationResult result) {
        try {
            if (!imageProcessingService.isValidImage(imageBytes)) {
                result.setValid(false);
                result.setReason("Invalid image file");
                return result;
            }

            OCRService.OcrResult ocrResult = ocrService.extractTextWithConfidence(imageBytes);
            String extractedText = ocrResult.getText();
            int wordCount = ocrResult.getWordCount();
            double confidence = ocrResult.getConfidence();

            result.setExtractedText(extractedText);
            result.setTextConfidence(confidence);
            result.setWordCount(wordCount);

            logger.info("OCR: {} words, {:.1f}% confidence", wordCount, confidence);

            boolean hasDocumentPattern = checkDocumentPatterns(extractedText);
            result.setHasDocumentPattern(hasDocumentPattern);

            if (hasDocumentPattern) {
                logger.info("✓ Document pattern found - ACCEPTING");
                result.setValid(true);
                result.setReason("Document validated");
                return result;
            }

            if (wordCount >= 10) {
                logger.info("✓ Sufficient text ({} words) - ACCEPTING", wordCount);
                result.setValid(true);
                result.setReason("Document validated");
                return result;
            }

            if (wordCount >= minTextWords && confidence > 40.0) {
                logger.info("✓ Text with confidence - ACCEPTING");
                result.setValid(true);
                result.setReason("Document validated");
                return result;
            }

            if (wordCount >= 2 && confidence > 70.0) {
                logger.info("✓ High confidence - ACCEPTING");
                result.setValid(true);
                result.setReason("Document validated");
                return result;
            }

            logger.warn("✗ Insufficient text - REJECTING");
            result.setValid(false);
            result.setReason("Unable to detect text in image");
            return result;

        } catch (Exception ex) {
            logger.warn("OCR failed, accepting anyway", ex);
            result.setValid(true);
            result.setWarning(true);
            result.setReason("Document accepted");
            return result;
        }
    }

    private ValidationResult validatePdf(byte[] pdfBytes, ValidationResult result) {
        try {
            if (!pdfProcessingService.isValidPdf(pdfBytes)) {
                result.setValid(false);
                result.setReason("Invalid PDF file");
                return result;
            }

            if (pdfProcessingService.isEncrypted(pdfBytes)) {
                logger.warn("Encrypted PDF - accepting");
                result.setValid(true);
                result.setWarning(true);
                result.setReason("Encrypted PDF accepted");
                return result;
            }

            int pageCount = pdfProcessingService.getPageCount(pdfBytes);
            result.setPageCount(pageCount);

            String extractedText = "";
            int wordCount = 0;

            try {
                extractedText = pdfProcessingService.extractText(pdfBytes);
                wordCount = countWords(extractedText);
                result.setExtractedText(extractedText);
                result.setWordCount(wordCount);
            } catch (Exception ex) {
                logger.warn("PDF text extraction failed");
            }

            logger.info("PDF: {} pages, {} words", pageCount, wordCount);

            if (pageCount > 0) {
                if (wordCount > 10) {
                    boolean hasDocumentPattern = checkDocumentPatterns(extractedText);
                    result.setHasDocumentPattern(hasDocumentPattern);
                }

                logger.info("✓ PDF validated - ACCEPTING");
                result.setValid(true);
                result.setReason("PDF document accepted");
                return result;
            }

            logger.warn("✗ Empty PDF - REJECTING");
            result.setValid(false);
            result.setReason("PDF appears empty");
            return result;

        } catch (Exception ex) {
            logger.warn("PDF validation error, accepting anyway", ex);
            result.setValid(true);
            result.setWarning(true);
            result.setReason("PDF accepted");
            return result;
        }
    }

    private boolean checkDocumentPatterns(String text) {
        if (text == null || text.isEmpty()) {
            return false;
        }

        String lowerText = text.toLowerCase();
        for (String pattern : DOCUMENT_PATTERNS) {
            if (lowerText.contains(pattern)) {
                return true;
            }
        }
        return false;
    }

    private int countWords(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }

    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        return lastDot == -1 ? "" : filename.substring(lastDot + 1);
    }

    public static class ValidationResult {
        private boolean valid;
        private boolean warning;
        private String reason;
        private String suggestion;
        private String mimeType;
        private String fileType;
        private String extractedText;
        private double textConfidence;
        private int wordCount;
        private int pageCount;
        private boolean hasDocumentPattern;

        public boolean isValid() { return valid; }
        public void setValid(boolean valid) { this.valid = valid; }

        public boolean isWarning() { return warning; }
        public void setWarning(boolean warning) { this.warning = warning; }

        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }

        public String getSuggestion() { return suggestion; }
        public void setSuggestion(String suggestion) { this.suggestion = suggestion; }

        public String getMimeType() { return mimeType; }
        public void setMimeType(String mimeType) { this.mimeType = mimeType; }

        public String getFileType() { return fileType; }
        public void setFileType(String fileType) { this.fileType = fileType; }

        public String getExtractedText() { return extractedText; }
        public void setExtractedText(String extractedText) { this.extractedText = extractedText; }

        public double getTextConfidence() { return textConfidence; }
        public void setTextConfidence(double textConfidence) { this.textConfidence = textConfidence; }

        public int getWordCount() { return wordCount; }
        public void setWordCount(int wordCount) { this.wordCount = wordCount; }

        public int getPageCount() { return pageCount; }
        public void setPageCount(int pageCount) { this.pageCount = pageCount; }

        public boolean isHasDocumentPattern() { return hasDocumentPattern; }
        public void setHasDocumentPattern(boolean hasDocumentPattern) {
            this.hasDocumentPattern = hasDocumentPattern;
        }
    }
}