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

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  PDF Processing Service  v2.0 — Smart OCR fallback for scanned PDFs        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ IMPROVEMENTS OVER v1:                                                        ║
 * ║  • extractText() now falls back to per-page OCR when native text is sparse  ║
 * ║    (< MIN_NATIVE_WORDS words). Scanned government PDFs (income certs,       ║
 * ║    domicile, caste certs) are typically image-only; v1 returned "" for them  ║
 * ║    and classification fell through to filename-only, which is unreliable.   ║
 * ║                                                                              ║
 * ║  • Render DPI for OCR fallback is 200 (vs 50 for thumbnails). This gives    ║
 * ║    Tesseract enough resolution to recognise Devanagari and small text.      ║
 * ║                                                                              ║
 * ║  • extractTextFromPage() renders a single page to BufferedImage and hands   ║
 * ║    it to OCRService for full multi-pass extraction.                         ║
 * ║                                                                              ║
 * ║  • generateThumbnail() remains fast (low DPI, nearest-neighbour) — no      ║
 * ║    quality regression there.                                                ║
 * ║                                                                              ║
 * ║  • All original public methods kept for backward compatibility.             ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
@Service
public class PDFProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(PDFProcessingService.class);

    /** Thumbnail generation DPI — kept low for speed. */
    @Value("${app.pdf.thumbnail-dpi:50}")
    private int thumbnailDpi;

    /** Max pages used for text extraction. */
    @Value("${app.pdf.max-pages:10}")
    private int maxPages;

    /**
     * If native text extraction yields fewer than this many words, we assume the
     * PDF is a scanned image document and fall back to per-page OCR.
     */
    private static final int MIN_NATIVE_WORDS = 20;

    /** DPI used when rendering a PDF page for OCR. 200 DPI gives good Tesseract results. */
    private static final int OCR_RENDER_DPI = 200;

    @Autowired
    private OCRService ocrService;

    // ════════════════════════════════════════════════════════════════════════════
    // TEXT EXTRACTION
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Extract text from PDF InputStream.
     */
    public String extractText(InputStream pdfStream) {
        try {
            byte[] pdfBytes = pdfStream.readAllBytes();
            return extractText(pdfBytes);
        } catch (IOException ex) {
            logger.error("Failed to read PDF stream", ex);
            return "";
        }
    }

    /**
     * v2: Extract text from PDF bytes.
     * Strategy:
     *   1. Try native text layer (PDFTextStripper) — instant, no OCR needed.
     *   2. If sparse (< MIN_NATIVE_WORDS), render each page at OCR_RENDER_DPI
     *      and hand to OCRService for full multi-pass extraction.
     */
    public String extractText(byte[] pdfBytes) {
        // --- Step 1: native text extraction ---
        String nativeText = extractNativeText(pdfBytes);
        int wordCount = countWords(nativeText);

        if (wordCount >= MIN_NATIVE_WORDS) {
            logger.debug("✅ Native text PDF: {} words — using native text", wordCount);
            return nativeText;
        }

        // --- Step 2: OCR fallback for scanned PDFs ---
        logger.info("📸 Sparse native text ({} words) — falling back to page OCR", wordCount);
        String ocrText = extractTextViaOcr(pdfBytes);

        // Return whichever is richer
        if (countWords(ocrText) > wordCount) {
            logger.info("✅ OCR fallback produced {} words", countWords(ocrText));
            return ocrText;
        }

        return nativeText; // return native (even if sparse) to avoid empty string
    }

    /**
     * Native text extraction only — fast path (no OCR).
     * Used by DocumentValidationService for quick word-count checks.
     */
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

    /**
     * Render each page to a BufferedImage and OCR it.
     * Processes up to maxPages pages and concatenates results.
     */
    private String extractTextViaOcr(byte[] pdfBytes) {
        StringBuilder sb = new StringBuilder();
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(document);
            int pages = Math.min(document.getNumberOfPages(), maxPages);

            for (int i = 0; i < pages; i++) {
                try {
                    // Render to BufferedImage at OCR resolution
                    BufferedImage pageImage = renderer.renderImageWithDPI(i, OCR_RENDER_DPI);

                    // Convert to bytes for OCRService
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    ImageIO.write(pageImage, "png", baos);
                    byte[] pageBytes = baos.toByteArray();

                    OCRService.OcrResult pageResult = ocrService.extractTextWithConfidence(pageBytes);
                    if (pageResult.getWordCount() > 0) {
                        if (sb.length() > 0) sb.append("\n\n");
                        sb.append("--- Page ").append(i + 1).append(" ---\n");
                        sb.append(pageResult.getText());
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

    // ════════════════════════════════════════════════════════════════════════════
    // THUMBNAIL GENERATION (v1 logic kept — still fast low-DPI)
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Generate thumbnail from first page of PDF.
     * Uses low DPI (configured via app.pdf.thumbnail-dpi) for speed.
     */
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

    // ════════════════════════════════════════════════════════════════════════════
    // UTILITY METHODS (unchanged from v1)
    // ════════════════════════════════════════════════════════════════════════════

    public int getPageCount(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            return document.getNumberOfPages();
        } catch (IOException ex) {
            logger.error("Failed to get page count", ex);
            return 0;
        }
    }

    public int getPageCount(InputStream pdfStream) {
        try { return getPageCount(pdfStream.readAllBytes()); }
        catch (IOException ex) { logger.error("Failed to get page count from stream", ex); return 0; }
    }

    public boolean isValidPdf(byte[] fileBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(fileBytes)) {
            return document.getNumberOfPages() > 0;
        } catch (Exception ex) { return false; }
    }

    public boolean isEncrypted(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            return document.isEncrypted();
        } catch (Exception ex) { return false; }
    }

    public String extractMetadata(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            if (document.getDocumentInformation() != null) {
                StringBuilder metadata = new StringBuilder();
                var info = document.getDocumentInformation();
                if (info.getTitle()   != null) metadata.append("Title: ").append(info.getTitle()).append("\n");
                if (info.getAuthor()  != null) metadata.append("Author: ").append(info.getAuthor()).append("\n");
                if (info.getSubject() != null) metadata.append("Subject: ").append(info.getSubject()).append("\n");
                if (info.getCreationDate() != null) metadata.append("Created: ").append(info.getCreationDate()).append("\n");
                return metadata.toString();
            }
            return "";
        } catch (IOException ex) { logger.error("Failed to extract metadata", ex); return ""; }
    }

    private int countWords(String text) {
        if (text == null || text.isEmpty()) return 0;
        return (int) java.util.Arrays.stream(text.trim().split("\\s+"))
                .filter(w -> !w.isEmpty()).count();
    }
}