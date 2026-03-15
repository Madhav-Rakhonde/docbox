package com.docbox.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;


@Service
public class PDFProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(PDFProcessingService.class);

    /** Thumbnail DPI — kept low for speed. Do NOT increase. */
    @Value("${app.pdf.thumbnail-dpi:72}")
    private int thumbnailDpi;

    /** Max pages for PDFTextStripper native extraction. */
    @Value("${app.pdf.max-pages:10}")
    private int maxPages;

    /**
     * If native PDFTextStripper yields fewer than this many words,
     * the PDF is treated as a scanned image and OCR is triggered.
     * 20 words is a safe threshold — a real text layer always has more.
     */
    private static final int MIN_NATIVE_WORDS = 20;

    /**
     * DPI for rendering PDF pages to BufferedImage before OCR.
     * 120 DPI → ~990×1400px for A4. Tesseract accuracy is unchanged
     * vs 150 DPI for standard printed document fonts.
     * Faster to render and produces a smaller byte array.
     */
    private static final int OCR_RENDER_DPI = 120;

    /**
     * Max pages to OCR. First 2 pages contain all classification-relevant
     * text in every government document we handle (Aadhaar, PAN, certificates).
     * Pages 3+ are blank backs or fine-print that OCR cannot read reliably.
     */
    private static final int OCR_MAX_PAGES = 2;

    /**
     * If the quick English OCR pass returns at least this many words,
     * we accept the result and skip the full 4-pass OCR pipeline.
     * 15 words is enough to classify any government document.
     * Increasing this causes more docs to fall through to full OCR (slower).
     * Decreasing it may reduce classification accuracy on sparse pages.
     */
    private static final int QUICK_OCR_MIN_WORDS = 15;

    @Autowired
    private OCRService ocrService;

    // ══════════════════════════════════════════════════════════════════════
    // NEW: SINGLE-LOAD RESULT DTO
    // ══════════════════════════════════════════════════════════════════════

    /**
     * All information DocumentValidationService needs from a PDF,
     * gathered in a single PDDocument load.
     */
    public static class PdfValidationResult {
        private boolean valid         = false;
        private boolean encrypted     = false;
        private boolean warning       = false;
        private boolean ocrUsed       = false;
        private int     pageCount     = 0;
        private int     wordCount     = 0;
        private String  extractedText = "";
        private String  reason        = "";

        // getters
        public boolean isValid()            { return valid; }
        public boolean isEncrypted()        { return encrypted; }
        public boolean isWarning()          { return warning; }
        public boolean isOcrUsed()          { return ocrUsed; }
        public int     getPageCount()       { return pageCount; }
        public int     getWordCount()       { return wordCount; }
        public String  getExtractedText()   { return extractedText != null ? extractedText : ""; }
        public String  getReason()          { return reason; }

        // setters
        public void setValid(boolean v)           { this.valid = v; }
        public void setEncrypted(boolean e)       { this.encrypted = e; }
        public void setWarning(boolean w)         { this.warning = w; }
        public void setOcrUsed(boolean o)         { this.ocrUsed = o; }
        public void setPageCount(int p)           { this.pageCount = p; }
        public void setWordCount(int w)           { this.wordCount = w; }
        public void setExtractedText(String t)    { this.extractedText = t; }
        public void setReason(String r)           { this.reason = r; }
    }

    // ══════════════════════════════════════════════════════════════════════
    // NEW PUBLIC METHOD: validateAndExtract
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Validates a PDF and extracts its text in a SINGLE PDDocument open/close.
     *
     * This replaces the four separate calls that DocumentValidationService used:
     *   isValidPdf() + isEncrypted() + getPageCount() + extractText()
     *
     * All checks and text extraction run on the same open PDDocument object.
     * PDFBox only parses the byte stream once.
     *
     * Flow:
     *   1. Load PDF once.
     *   2. Check page count (isValid check).
     *   3. Check encryption.
     *   4. Run PDFTextStripper for native text.
     *   5. If native text is sufficient → return immediately (no OCR).
     *   6. If sparse → render pages and run OCR inside the SAME open document.
     *   7. Close document once at the end of the try-with-resources block.
     *
     * @param pdfBytes  raw PDF byte array from MultipartFile
     * @return          PdfValidationResult with all fields populated
     */
    public PdfValidationResult validateAndExtract(byte[] pdfBytes) {
        PdfValidationResult result = new PdfValidationResult();
        long start = System.currentTimeMillis();

        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {

            // ── Check 1: has pages ────────────────────────────────────────
            int pageCount = document.getNumberOfPages();
            result.setPageCount(pageCount);

            if (pageCount == 0) {
                result.setValid(false);
                result.setReason("PDF appears empty");
                logger.warn("PDF rejected: 0 pages");
                return result;
            }

            result.setValid(true);

            // ── Check 2: encryption ───────────────────────────────────────
            if (document.isEncrypted()) {
                result.setEncrypted(true);
                result.setReason("Encrypted PDF accepted");
                logger.info("Encrypted PDF ({} pages) — accepted without text extraction | {}ms",
                        pageCount, System.currentTimeMillis() - start);
                return result;
            }

            // ── Check 3: native text layer ────────────────────────────────
            String nativeText = stripNativeText(document, pageCount);
            int nativeWords   = countWords(nativeText);

            logger.info("PDF native text: {} page(s), {} words | {}ms",
                    pageCount, nativeWords, System.currentTimeMillis() - start);

            if (nativeWords >= MIN_NATIVE_WORDS) {
                // Real text layer — done, no OCR needed at all
                result.setExtractedText(nativeText);
                result.setWordCount(nativeWords);
                result.setOcrUsed(false);
                result.setReason("PDF document accepted");
                logger.info("Text PDF: {} words — OCR skipped | {}ms",
                        nativeWords, System.currentTimeMillis() - start);
                return result;
            }

            // ── Check 4: scanned PDF — OCR on the SAME open document ──────
            logger.info("Scanned PDF ({} native words) — starting OCR | {}ms",
                    nativeWords, System.currentTimeMillis() - start);

            String ocrText = ocrPagesFromDocument(document, pageCount);
            int    ocrWords = countWords(ocrText);

            // Use whichever source gave more words
            if (ocrWords > nativeWords) {
                result.setExtractedText(ocrText);
                result.setWordCount(ocrWords);
            } else {
                result.setExtractedText(nativeText);
                result.setWordCount(nativeWords);
            }

            result.setOcrUsed(true);
            result.setReason("PDF document accepted");

            logger.info("Scanned PDF OCR: {} words | total {}ms",
                    result.getWordCount(), System.currentTimeMillis() - start);
            return result;

        } catch (Exception ex) {
            // Non-fatal: accept the document rather than blocking the upload
            logger.warn("PDF load/parse failed — accepting anyway: {} | {}ms",
                    ex.getMessage(), System.currentTimeMillis() - start);
            result.setValid(true);
            result.setWarning(true);
            result.setReason("PDF accepted");
            return result;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS — work on an already-open PDDocument
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Extract native text using PDFTextStripper on an already-open PDDocument.
     * No extra loadPDF() call needed.
     */
    private String stripNativeText(PDDocument document, int pageCount) {
        try {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(Math.min(pageCount, maxPages));
            String text = stripper.getText(document);
            return text == null ? "" : text.trim();
        } catch (IOException ex) {
            logger.warn("PDFTextStripper failed: {}", ex.getMessage());
            return "";
        }
    }

    /**
     * Render pages to BufferedImage and OCR them.
     * Runs on an already-open PDDocument — no extra loadPDF() call.
     *
     * SMART OCR STRATEGY:
     *   Step A: Run extractTextWithConfidenceQuick() — English only, ~3–5s.
     *           If it returns >= QUICK_OCR_MIN_WORDS (15), use it and stop.
     *           This covers: English-printed scanned PDFs (most government docs).
     *
     *   Step B: Only if Step A fails (< 15 words) run the full 4-pass OCR.
     *           This covers: pure Devanagari scanned certificates.
     *           Cost: 15–30s (still far better than old sequential 30–60s).
     */
    private String ocrPagesFromDocument(PDDocument document, int pageCount) {
        StringBuilder sb = new StringBuilder();
        PDFRenderer renderer = new PDFRenderer(document);
        int pagesToScan = Math.min(pageCount, OCR_MAX_PAGES);

        for (int i = 0; i < pagesToScan; i++) {
            long pageStart = System.currentTimeMillis();
            try {
                // Render page to image at OCR_RENDER_DPI
                BufferedImage pageImage = renderer.renderImageWithDPI(i, OCR_RENDER_DPI);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(pageImage, "png", baos);
                byte[] pageBytes = baos.toByteArray();

                // ── Step A: Quick English OCR (~3–5s) ────────────────────
                OCRService.OcrResult quickResult =
                        ocrService.extractTextWithConfidenceQuick(pageBytes);
                int quickWords = quickResult.getWordCount();

                logger.info("Page {} quick OCR: {} words | {}ms",
                        i + 1, quickWords, System.currentTimeMillis() - pageStart);

                if (quickWords >= QUICK_OCR_MIN_WORDS) {
                    // Quick pass is good enough — skip full 4-pass OCR
                    appendPage(sb, i + 1, quickResult.getText());
                    logger.info("Page {} accepted from quick OCR — full OCR skipped", i + 1);
                    continue;
                }

                // ── Step B: Full 4-pass OCR (15–30s) — only when needed ──
                // Triggered for: pure Devanagari scanned certs, low-quality scans
                logger.info("Page {} quick OCR insufficient ({} words) — running full OCR", i + 1, quickWords);
                OCRService.OcrResult fullResult =
                        ocrService.extractTextWithConfidence(pageBytes);

                logger.info("Page {} full OCR: {} words | {}ms",
                        i + 1, fullResult.getWordCount(), System.currentTimeMillis() - pageStart);

                if (fullResult.getWordCount() > 0) {
                    appendPage(sb, i + 1, fullResult.getText());
                }

            } catch (Exception ex) {
                logger.warn("Page {} OCR failed: {}", i + 1, ex.getMessage());
            }
        }

        return sb.toString().trim();
    }

    private void appendPage(StringBuilder sb, int pageNum, String text) {
        if (text == null || text.isEmpty()) return;
        if (sb.length() > 0) sb.append("\n\n");
        sb.append("--- Page ").append(pageNum).append(" ---\n");
        sb.append(text);
    }

    // ══════════════════════════════════════════════════════════════════════
    // ALL ORIGINAL PUBLIC METHODS — 100% UNCHANGED
    // Required by: other callers, FreeSchemeDiscoveryService, etc.
    // ══════════════════════════════════════════════════════════════════════

    /** Extract text from a PDF InputStream. Unchanged from v2. */
    public String extractText(InputStream pdfStream) {
        try {
            byte[] pdfBytes = pdfStream.readAllBytes();
            return extractText(pdfBytes);
        } catch (IOException ex) {
            logger.error("Failed to read PDF stream", ex);
            return "";
        }
    }

    /** Extract text from PDF bytes. Unchanged from v2. */
    public String extractText(byte[] pdfBytes) {
        String nativeText = extractNativeText(pdfBytes);
        int wordCount = countWords(nativeText);

        if (wordCount >= MIN_NATIVE_WORDS) {
            logger.debug("Native text PDF: {} words", wordCount);
            return nativeText;
        }

        logger.info("Sparse native text ({} words) — OCR fallback", wordCount);
        String ocrText = extractTextViaOcr(pdfBytes);

        if (countWords(ocrText) > wordCount) {
            logger.info("OCR produced {} words", countWords(ocrText));
            return ocrText;
        }

        return nativeText;
    }

    /** Extract native text layer only. Unchanged from v2. */
    public String extractNativeText(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            int pageCount = document.getNumberOfPages();
            if (pageCount == 0) return "";
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(Math.min(pageCount, maxPages));
            String text = stripper.getText(document);
            logger.debug("Native PDF text: {} chars", text == null ? 0 : text.length());
            return text == null ? "" : text.trim();
        } catch (IOException ex) {
            logger.error("Native text extraction failed", ex);
            return "";
        }
    }

    /** OCR fallback used by extractText(). Unchanged from v2. */
    private String extractTextViaOcr(byte[] pdfBytes) {
        StringBuilder sb = new StringBuilder();
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(document);
            int pages = Math.min(document.getNumberOfPages(), OCR_MAX_PAGES);
            for (int i = 0; i < pages; i++) {
                try {
                    BufferedImage pageImage = renderer.renderImageWithDPI(i, OCR_RENDER_DPI);
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    ImageIO.write(pageImage, "png", baos);
                    byte[] pageBytes = baos.toByteArray();

                    // Smart: quick first, full only if needed
                    OCRService.OcrResult quickResult = ocrService.extractTextWithConfidenceQuick(pageBytes);
                    OCRService.OcrResult pageResult = (quickResult.getWordCount() >= QUICK_OCR_MIN_WORDS)
                            ? quickResult
                            : ocrService.extractTextWithConfidence(pageBytes);

                    if (pageResult.getWordCount() > 0) {
                        appendPage(sb, i + 1, pageResult.getText());
                        logger.debug("Page {} OCR: {} words", i + 1, pageResult.getWordCount());
                    }
                } catch (Exception ex) {
                    logger.warn("Failed to OCR page {}: {}", i + 1, ex.getMessage());
                }
            }
        } catch (IOException ex) {
            logger.error("Failed to load PDF for OCR", ex);
        }
        return sb.toString().trim();
    }

    /** Generate thumbnail from first page. Unchanged from v2. */
    public byte[] generateThumbnail(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            if (document.getNumberOfPages() == 0) return null;
            PDFRenderer renderer = new PDFRenderer(document);
            BufferedImage image  = renderer.renderImageWithDPI(0, thumbnailDpi);
            int targetWidth  = 200;
            int targetHeight = (int)(image.getHeight() * ((double) targetWidth / image.getWidth()));
            BufferedImage thumbnail = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = thumbnail.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            g.drawImage(image, 0, 0, targetWidth, targetHeight, null);
            g.dispose();
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ImageIO.write(thumbnail, "jpg", outputStream);
            return outputStream.toByteArray();
        } catch (Exception ex) {
            logger.warn("Thumbnail generation failed: {}", ex.getMessage());
            return null;
        }
    }

    /** Get page count from byte array. Unchanged from v2. */
    public int getPageCount(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            return document.getNumberOfPages();
        } catch (IOException ex) {
            logger.error("Failed to get page count", ex);
            return 0;
        }
    }

    /** Get page count from stream. Unchanged from v2. */
    public int getPageCount(InputStream pdfStream) {
        try { return getPageCount(pdfStream.readAllBytes()); }
        catch (IOException ex) { logger.error("Failed to get page count from stream", ex); return 0; }
    }

    /** Check if bytes represent a valid non-empty PDF. Unchanged from v2. */
    public boolean isValidPdf(byte[] fileBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(fileBytes)) {
            return document.getNumberOfPages() > 0;
        } catch (Exception ex) { return false; }
    }

    /** Check if PDF is encrypted. Unchanged from v2. */
    public boolean isEncrypted(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            return document.isEncrypted();
        } catch (Exception ex) { return false; }
    }

    /** Extract document metadata. Unchanged from v2. */
    public String extractMetadata(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            if (document.getDocumentInformation() != null) {
                StringBuilder metadata = new StringBuilder();
                var info = document.getDocumentInformation();
                if (info.getTitle()        != null) metadata.append("Title: ").append(info.getTitle()).append("\n");
                if (info.getAuthor()       != null) metadata.append("Author: ").append(info.getAuthor()).append("\n");
                if (info.getSubject()      != null) metadata.append("Subject: ").append(info.getSubject()).append("\n");
                if (info.getCreationDate() != null) metadata.append("Created: ").append(info.getCreationDate()).append("\n");
                return metadata.toString();
            }
            return "";
        } catch (IOException ex) {
            logger.error("Failed to extract metadata", ex);
            return "";
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // PRIVATE UTILITY
    // ══════════════════════════════════════════════════════════════════════

    private int countWords(String text) {
        if (text == null || text.isEmpty()) return 0;
        return (int) java.util.Arrays.stream(text.trim().split("\\s+"))
                .filter(w -> !w.isEmpty()).count();
    }
}