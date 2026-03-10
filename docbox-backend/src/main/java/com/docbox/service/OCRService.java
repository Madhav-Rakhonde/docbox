package com.docbox.service;

import com.docbox.exception.OCRProcessingException;
import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.io.ByteArrayInputStream;
import java.io.File;

@Service
public class OCRService {

    private static final Logger logger = LoggerFactory.getLogger(OCRService.class);

    @Value("${app.ocr.tesseract-data-path:/usr/share/tesseract-ocr/4.00/tessdata}")
    private String tesseractDataPath;

    // Minimum OCR image width — images smaller than this are upscaled before OCR
    private static final int MIN_OCR_WIDTH_PX = 300;

    // Devanagari detection threshold: if this fraction of non-space chars are Devanagari,
    // we consider the document multilingual and run Hindi+Marathi passes
    private static final double DEVANAGARI_DETECT_THRESHOLD = 0.08;

    /**
     * FIX-OCR-3: Minimum confidence required for early exit.
     * English Tesseract on Devanagari produces ~40-55% estimated confidence
     * (lots of garbage characters). A genuine English document typically gives >= 70%.
     * Setting this to 60.0 blocks Devanagari-garbled results from early-exiting.
     */
    private static final double MIN_EARLY_EXIT_CONFIDENCE = 60.0;

    private ITesseract englishTesseract;
    private ITesseract hindiTesseract;
    private ITesseract marathiTesseract;

    // ════════════════════════════════════════════════════════════════════════════
    // TESSERACT INSTANCE MANAGEMENT
    // ════════════════════════════════════════════════════════════════════════════

    private ITesseract getEnglishTesseract() {
        if (englishTesseract == null) {
            englishTesseract = new Tesseract();
            configureTesseract(englishTesseract, "eng");
            logger.info("✅ English Tesseract initialized");
        }
        return englishTesseract;
    }

    private ITesseract getHindiTesseract() {
        if (hindiTesseract == null) {
            hindiTesseract = new Tesseract();
            configureTesseract(hindiTesseract, "hin");
            logger.info("✅ Hindi Tesseract initialized");
        }
        return hindiTesseract;
    }

    private ITesseract getMarathiTesseract() {
        if (marathiTesseract == null) {
            marathiTesseract = new Tesseract();
            configureTesseract(marathiTesseract, "mar");
            logger.info("✅ Marathi Tesseract initialized");
        }
        return marathiTesseract;
    }

    private void configureTesseract(ITesseract tesseract, String language) {
        String[] possiblePaths = {
                "/usr/share/tesseract-ocr/4.00/tessdata",
                "/usr/share/tesseract-ocr/5/tessdata",
                "/usr/share/tessdata",
                "/opt/homebrew/share/tessdata",
                "C:\\Program Files\\Tesseract-OCR\\tessdata",
                tesseractDataPath
        };

        boolean pathSet = false;
        for (String path : possiblePaths) {
            File dir = new File(path);
            if (dir.exists() && dir.isDirectory()) {
                File langFile = new File(dir, language + ".traineddata");
                if (langFile.exists()) {
                    tesseract.setDatapath(path);
                    logger.info("✅ Tessdata path set: {} for language: {}", path, language);
                    pathSet = true;
                    break;
                }
            }
        }
        if (!pathSet) logger.warn("⚠️ Could not find tessdata path for {}, using system default", language);

        tesseract.setLanguage(language);
        tesseract.setPageSegMode(3);   // Fully automatic page segmentation
        tesseract.setOcrEngineMode(1); // LSTM neural net engine
    }

    // ════════════════════════════════════════════════════════════════════════════
    // PUBLIC API — same signatures as v2.0
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * QUICK OCR — fast path for initial classification decisions.
     * English only, reduced image size, no multi-pass.
     */
    public OcrResult extractTextWithConfidenceQuick(byte[] imageBytes) {
        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (original == null) throw new OCRProcessingException("Failed to read image");

            BufferedImage resized   = resizeForQuickOCR(original);
            BufferedImage grayscale = convertToGrayscale(resized);

            OcrResult result = performOCR(grayscale, getEnglishTesseract(), "English");
            logger.info("✅ Quick OCR: {} words, {:.1f}% conf", result.getWordCount(), result.getConfidence());
            return result;

        } catch (Exception ex) {
            logger.warn("⚠️ Quick OCR failed: {}", ex.getMessage());
            return emptyResult("unknown");
        }
    }

    /**
     * FULL OCR — complete multi-pass extraction with adaptive preprocessing.
     * Used for structured data extraction and final classification.
     *
     * v2.1 flow:
     *   Pass 1: adaptive binarisation + English
     *     → Early exit ONLY if: wordCount >= 30 AND confidence >= 60% AND no Devanagari
     *   Pass 2: global binarisation + English
     *     → Early exit ONLY if: wordCount >= 20 AND confidence >= 60% AND no Devanagari
     *   Pass 3+4: Hindi + Marathi (always runs if Devanagari detected, or English was sparse)
     *   Merge: English + best Devanagari result combined
     */
    public OcrResult extractTextWithConfidence(byte[] imageBytes) {
        try {
            BufferedImage original = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (original == null) throw new OCRProcessingException("Failed to read image");

            BufferedImage upscaled = upscaleIfNeeded(original);

            // --- Pass 1: adaptive binarisation + English ---
            BufferedImage adaptive   = preprocessAdaptive(upscaled);
            OcrResult    engAdaptive = performOCR(adaptive, getEnglishTesseract(), "English-Adaptive");

            // FIX-OCR-1 + FIX-OCR-2 + FIX-OCR-3:
            // Early exit ONLY when:
            //   (a) word count is substantial (>= 30), AND
            //   (b) confidence is genuinely high (>= 60%), AND
            //   (c) the result does NOT contain Devanagari characters
            //       (which would mean English Tesseract is misreading the script)
            //
            // Previously: only checked wordCount >= 30
            // Bug: Devanagari docs produce 30+ garbage tokens → wrong early exit
            boolean engAdaptiveHasDevanagari = hasSignificantDevanagari(engAdaptive.getText());
            if (engAdaptive.getWordCount() >= 30
                    && engAdaptive.getConfidence() >= MIN_EARLY_EXIT_CONFIDENCE
                    && !engAdaptiveHasDevanagari) {
                logger.info("✅ Early-exit OCR (English-Adaptive sufficient): {} words, {:.1f}% conf",
                        engAdaptive.getWordCount(), engAdaptive.getConfidence());
                return engAdaptive;
            }

            if (engAdaptiveHasDevanagari) {
                logger.info("📸 Devanagari detected in English-Adaptive result — forcing Devanagari passes");
            }

            // --- Pass 2: global binarisation + English ---
            BufferedImage global   = preprocessGlobal(upscaled);
            OcrResult    engGlobal = performOCR(global, getEnglishTesseract(), "English-Global");
            OcrResult    bestEng   = selectBestResult(engAdaptive, engGlobal);

            // FIX-OCR-5: Same guard applied to second early exit
            boolean bestEngHasDevanagari = hasSignificantDevanagari(bestEng.getText());
            if (bestEng.getWordCount() >= 20
                    && bestEng.getConfidence() >= MIN_EARLY_EXIT_CONFIDENCE
                    && !bestEngHasDevanagari) {
                logger.info("✅ Early-exit OCR (English sufficient): {} words, {:.1f}% conf",
                        bestEng.getWordCount(), bestEng.getConfidence());
                return bestEng;
            }

            // --- Pass 3 & 4: Devanagari (Hindi + Marathi) ---
            // Triggered when:
            //   - English passes produced sparse text (likely Devanagari doc), OR
            //   - English result contained Devanagari chars (confirmed script mismatch)
            logger.info("📸 Running Devanagari passes (eng={} words, devanagari_detected={})",
                    bestEng.getWordCount(), bestEngHasDevanagari || engAdaptiveHasDevanagari);

            OcrResult hinResult      = performOCR(adaptive, getHindiTesseract(),   "Hindi");
            OcrResult marResult      = performOCR(adaptive, getMarathiTesseract(), "Marathi");
            OcrResult bestDevanagari = selectBestResult(hinResult, marResult);

            logger.info("📖 Devanagari OCR: {} words (Hindi={}, Marathi={})",
                    bestDevanagari.getWordCount(), hinResult.getWordCount(), marResult.getWordCount());

            // FIX-OCR-4: mergeResults threshold lowered — always merge if English has any text.
            // Previously, < 5 English words caused the English result to be silently dropped,
            // losing ASCII-printed dates (like "18/08/2020") and document numbers.
            OcrResult merged = mergeResults(bestEng, bestDevanagari);
            logger.info("✅ Full OCR: {} words, {:.1f}% conf, lang: {}",
                    merged.getWordCount(), merged.getConfidence(), merged.getDetectedLanguage());
            return merged;

        } catch (Exception ex) {
            logger.error("❌ Full OCR failed", ex);
            return emptyResult("unknown");
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // IMAGE PREPROCESSING
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Upscale image if it is too small for reliable OCR.
     * Tesseract performs best at ~300 DPI; for a typical ID card that's ~1000px wide.
     */
    private BufferedImage upscaleIfNeeded(BufferedImage original) {
        if (original.getWidth() >= MIN_OCR_WIDTH_PX) return original;

        double scale = (double) MIN_OCR_WIDTH_PX / original.getWidth();
        int newW = (int)(original.getWidth()  * scale);
        int newH = (int)(original.getHeight() * scale);

        BufferedImage scaled = new BufferedImage(newW, newH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = scaled.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING,     RenderingHints.VALUE_RENDER_QUALITY);
        g.drawImage(original, 0, 0, newW, newH, null);
        g.dispose();

        logger.debug("Upscaled {}x{} → {}x{}", original.getWidth(), original.getHeight(), newW, newH);
        return scaled;
    }

    /**
     * Quick resize for quick-OCR mode (shrink to 800px wide).
     */
    private BufferedImage resizeForQuickOCR(BufferedImage original) {
        int maxWidth = 800;
        if (original.getWidth() <= maxWidth) return original;

        int newW = maxWidth;
        int newH = (int)(original.getHeight() * ((double) maxWidth / original.getWidth()));
        BufferedImage resized = new BufferedImage(newW, newH, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = resized.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(original, 0, 0, newW, newH, null);
        g.dispose();
        return resized;
    }

    /**
     * ADAPTIVE preprocessing pipeline (v2 main path):
     *   1. Grayscale
     *   2. Median-filter noise reduction
     *   3. Sauvola-style local adaptive binarisation
     *   4. Unsharp mask sharpening
     *
     * Handles uneven illumination, shadows, and low-contrast government seals far better
     * than the old fixed-threshold approach.
     */
    private BufferedImage preprocessAdaptive(BufferedImage original) {
        try {
            BufferedImage gray      = convertToGrayscale(original);
            BufferedImage denoised  = medianDenoise(gray);
            BufferedImage binarised = adaptiveBinarise(denoised, 31, 0.15);
            BufferedImage sharpened = unsharpMask(binarised);
            return sharpened;
        } catch (Exception ex) {
            logger.warn("⚠️ Adaptive preprocessing failed, falling back to global", ex);
            return preprocessGlobal(original);
        }
    }

    /**
     * GLOBAL preprocessing (v2.0 fallback):
     *   Grayscale → fixed 128-threshold binarisation.
     */
    private BufferedImage preprocessGlobal(BufferedImage original) {
        try {
            BufferedImage gray = convertToGrayscale(original);
            int w = gray.getWidth(), h = gray.getHeight();
            BufferedImage bin = new BufferedImage(w, h, BufferedImage.TYPE_BYTE_GRAY);

            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int px = gray.getRGB(x, y);
                    int g  = (px >> 16) & 0xff;
                    int ng = g > 128 ? 255 : 0;
                    bin.setRGB(x, y, (ng << 16) | (ng << 8) | ng);
                }
            }
            return bin;
        } catch (Exception ex) {
            logger.warn("⚠️ Global preprocessing failed, returning original", ex);
            return original;
        }
    }

    /**
     * Sauvola-style adaptive binarisation.
     * For each pixel, computes the local mean and standard deviation in a window of size
     * {@code windowSize × windowSize} and derives a per-pixel threshold.
     */
    private BufferedImage adaptiveBinarise(BufferedImage gray, int windowSize, double k) {
        int w = gray.getWidth(), h = gray.getHeight();
        int[] pixels = new int[w * h];

        for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                pixels[y * w + x] = (gray.getRGB(x, y) >> 16) & 0xff;

        long[] integral  = new long[(w + 1) * (h + 1)];
        long[] integral2 = new long[(w + 1) * (h + 1)];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                long v = pixels[y * w + x];
                integral[(y+1) * (w+1) + (x+1)] =
                        v
                                + integral[y * (w+1) + (x+1)]
                                + integral[(y+1) * (w+1) + x]
                                - integral[y * (w+1) + x];
                integral2[(y+1) * (w+1) + (x+1)] =
                        v * v
                                + integral2[y * (w+1) + (x+1)]
                                + integral2[(y+1) * (w+1) + x]
                                - integral2[y * (w+1) + x];
            }
        }

        int half = windowSize / 2;
        BufferedImage result = new BufferedImage(w, h, BufferedImage.TYPE_BYTE_GRAY);

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int x1 = Math.max(0, x - half), y1 = Math.max(0, y - half);
                int x2 = Math.min(w - 1, x + half), y2 = Math.min(h - 1, y + half);

                int count = (x2 - x1 + 1) * (y2 - y1 + 1);
                long sum  = integral[(y2+1) * (w+1) + (x2+1)]
                        - integral[y1 * (w+1) + (x2+1)]
                        - integral[(y2+1) * (w+1) + x1]
                        + integral[y1 * (w+1) + x1];
                long sum2 = integral2[(y2+1) * (w+1) + (x2+1)]
                        - integral2[y1 * (w+1) + (x2+1)]
                        - integral2[(y2+1) * (w+1) + x1]
                        + integral2[y1 * (w+1) + x1];

                double mean     = (double) sum / count;
                double variance = (double) sum2 / count - mean * mean;
                double stdDev   = variance > 0 ? Math.sqrt(variance) : 0;
                double threshold = mean * (1.0 + k * (stdDev / 128.0 - 1.0));

                int px = pixels[y * w + x];
                int ng = px >= threshold ? 255 : 0;
                result.setRGB(x, y, (ng << 16) | (ng << 8) | ng);
            }
        }
        return result;
    }

    private BufferedImage medianDenoise(BufferedImage gray) {
        float[] blurKernel = {
                1/9f, 1/9f, 1/9f,
                1/9f, 1/9f, 1/9f,
                1/9f, 1/9f, 1/9f
        };
        ConvolveOp blur = new ConvolveOp(new Kernel(3, 3, blurKernel), ConvolveOp.EDGE_NO_OP, null);
        return blur.filter(gray, null);
    }

    private BufferedImage unsharpMask(BufferedImage src) {
        int w = src.getWidth(), h = src.getHeight();
        float s = 1/16f;
        float[] gaussKernel = {
                s*1, s*2, s*1,
                s*2, s*4, s*2,
                s*1, s*2, s*1
        };
        ConvolveOp blur    = new ConvolveOp(new Kernel(3, 3, gaussKernel), ConvolveOp.EDGE_NO_OP, null);
        BufferedImage blurred = blur.filter(src, null);

        double amount = 1.5;
        BufferedImage result = new BufferedImage(w, h, src.getType());
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int sp = (src.getRGB(x, y) >> 16) & 0xff;
                int bp = (blurred.getRGB(x, y) >> 16) & 0xff;
                int rp = Math.min(255, Math.max(0, (int)(sp + amount * (sp - bp))));
                result.setRGB(x, y, (rp << 16) | (rp << 8) | rp);
            }
        }
        return result;
    }

    private BufferedImage convertToGrayscale(BufferedImage original) {
        BufferedImage gray = new BufferedImage(
                original.getWidth(), original.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = gray.createGraphics();
        g.drawImage(original, 0, 0, null);
        g.dispose();
        return gray;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // OCR EXECUTION
    // ════════════════════════════════════════════════════════════════════════════

    private OcrResult performOCR(BufferedImage image, ITesseract tesseract, String language) {
        OcrResult result = new OcrResult();
        try {
            String text = tesseract.doOCR(image);
            text = cleanText(text);
            result.setText(text);
            result.setWordCount(countWords(text));
            result.setConfidence(estimateConfidence(text));
            result.setDetectedLanguage(language);
            logger.debug("📊 {} OCR: {} words, {:.1f}% conf", language, result.getWordCount(), result.getConfidence());
        } catch (TesseractException ex) {
            logger.warn("⚠️ {} OCR failed: {}", language, ex.getMessage());
            result.setText(""); result.setWordCount(0); result.setConfidence(0.0);
            result.setDetectedLanguage(language);
        }
        return result;
    }

    /**
     * Select the better of two OCR results.
     * Scoring: log(wordCount + 1) × confidence — avoids selecting empty high-confidence results.
     */
    private OcrResult selectBestResult(OcrResult r1, OcrResult r2) {
        if (r2 == null) return r1;
        double s1 = Math.log(r1.getWordCount() + 1) * r1.getConfidence();
        double s2 = Math.log(r2.getWordCount() + 1) * r2.getConfidence();
        return s1 >= s2 ? r1 : r2;
    }

    /**
     * Merge English and Devanagari results into a combined result.
     *
     * FIX-OCR-4: Threshold lowered from 5 → 1.
     * Previously: if English produced < 5 words, it was silently dropped.
     * Problem: ASCII-printed elements (dates, doc numbers, barcodes) that appear
     * in the English result were lost, causing date extraction to fail on
     * mixed-script documents where the date is printed in ASCII but the rest
     * is Devanagari (e.g. "दिनांक : 18/08/2020" at the bottom of a Marathi cert).
     * Now: any non-empty English result is always merged.
     */
    private OcrResult mergeResults(OcrResult english, OcrResult devanagari) {
        if (devanagari == null || devanagari.getWordCount() < 5) return english;

        // FIX-OCR-4: was `english.getWordCount() < 5` — now just check non-empty
        if (english == null || english.getText() == null || english.getText().isEmpty()) {
            return devanagari;
        }

        // Both results have content — merge them
        String merged = english.getText() + "\n" + devanagari.getText();
        OcrResult result = new OcrResult();
        result.setText(merged);
        result.setWordCount(countWords(merged));
        result.setConfidence((english.getConfidence() + devanagari.getConfidence()) / 2.0);
        result.setDetectedLanguage("English+" + devanagari.getDetectedLanguage());
        logger.info("🔀 Merged OCR results: {} words total (eng={}, deva={})",
                result.getWordCount(), english.getWordCount(), devanagari.getWordCount());
        return result;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // TEXT PROCESSING
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * Detect whether the text contains a meaningful proportion of Devanagari characters.
     *
     * FIX-OCR-2: This method was dead code in v2.0 — defined but never called.
     * It is now called in extractTextWithConfidence() to guard both early exits.
     *
     * When English Tesseract runs on a Devanagari document, it sometimes outputs
     * a small percentage of actual Devanagari codepoints mixed with garbage ASCII
     * (Unicode pass-through of unrecognised glyphs). This method catches that case.
     * Threshold is intentionally low (8%) to catch even partial Devanagari bleed-through.
     */
    private boolean hasSignificantDevanagari(String text) {
        if (text == null || text.isEmpty()) return false;
        int total = 0, devanagari = 0;
        for (char c : text.toCharArray()) {
            if (Character.isWhitespace(c)) continue;
            total++;
            if (c >= '\u0900' && c <= '\u097F') devanagari++;
        }
        boolean result = total > 0 && (double) devanagari / total >= DEVANAGARI_DETECT_THRESHOLD;
        if (result) {
            logger.debug("🔤 Devanagari detected: {}/{} chars ({:.1f}%)",
                    devanagari, total, total > 0 ? (double) devanagari / total * 100 : 0);
        }
        return result;
    }

    /**
     * Clean OCR output text.
     * v2.1: preserves Devanagari and other Unicode letters; only strips true control characters.
     */
    private String cleanText(String text) {
        if (text == null || text.isEmpty()) return "";
        text = text.replaceAll("[ \\t]+", " ");
        text = text.replaceAll("\\r\\n|\\r", "\n");
        text = text.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "");
        return text.trim();
    }

    private int countWords(String text) {
        if (text == null || text.isEmpty()) return 0;
        int count = 0;
        for (String word : text.trim().split("\\s+")) {
            if (!word.isEmpty() && word.chars().anyMatch(c -> Character.isLetterOrDigit(c))) count++;
        }
        return count;
    }

    /**
     * Estimate OCR confidence from text quality.
     * v2.1: considers Devanagari block, extended punctuation, and has higher word-count bonuses.
     *
     * Note on FIX-OCR-3: English Tesseract on Devanagari text typically scores
     * 40-55% here because Devanagari glyphs pass-through as Unicode letters
     * (counted as valid) but with many garbage punctuation/symbol chars mixed in.
     * The MIN_EARLY_EXIT_CONFIDENCE threshold of 60.0 is calibrated against this.
     */
    private double estimateConfidence(String text) {
        if (text == null || text.isEmpty()) return 0.0;

        int total = 0, valid = 0;
        for (char c : text.toCharArray()) {
            if (Character.isWhitespace(c)) continue;
            total++;
            if (Character.isLetterOrDigit(c)
                    || (c >= '\u0900' && c <= '\u0DFF')   // Devanagari + related scripts
                    || "/-:.,()[]".indexOf(c) >= 0) {
                valid++;
            }
        }
        if (total == 0) return 0.0;

        double ratio = (double) valid / total;
        int wc = countWords(text);
        if (wc >= 5)  ratio = Math.min(1.0, ratio * 1.10);
        if (wc >= 15) ratio = Math.min(1.0, ratio * 1.10);
        if (wc >= 30) ratio = Math.min(1.0, ratio * 1.05);

        return Math.min(100.0, ratio * 100.0);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // CONVENIENCE METHODS (backward-compatible with v1 and v2.0)
    // ════════════════════════════════════════════════════════════════════════════

    public String extractText(byte[] imageBytes) {
        return extractTextWithConfidence(imageBytes).getText();
    }

    public String extractText(BufferedImage image) {
        try { return getEnglishTesseract().doOCR(image); }
        catch (TesseractException ex) { logger.error("❌ OCR failed", ex); return ""; }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ════════════════════════════════════════════════════════════════════════════

    private OcrResult emptyResult(String lang) {
        OcrResult r = new OcrResult();
        r.setText(""); r.setConfidence(0.0); r.setWordCount(0); r.setDetectedLanguage(lang);
        return r;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // RESULT DTO
    // ════════════════════════════════════════════════════════════════════════════

    public static class OcrResult {
        private String text;
        private double confidence;
        private int    wordCount;
        private String detectedLanguage;

        public String getText()               { return text; }
        public void   setText(String t)       { this.text = t; }

        public double getConfidence()         { return confidence; }
        public void   setConfidence(double c) { this.confidence = c; }

        public int    getWordCount()          { return wordCount; }
        public void   setWordCount(int w)     { this.wordCount = w; }

        public String getDetectedLanguage()            { return detectedLanguage; }
        public void   setDetectedLanguage(String lang) { this.detectedLanguage = lang; }
    }
}