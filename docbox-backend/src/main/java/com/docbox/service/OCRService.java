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
import java.io.ByteArrayInputStream;
import java.io.File;

/**
 * ✅ OPTIMIZED OCR Service with Quick Mode
 */
@Service
public class OCRService {

    private static final Logger logger = LoggerFactory.getLogger(OCRService.class);

    @Value("${app.ocr.tesseract-data-path:/usr/share/tesseract-ocr/4.00/tessdata}")
    private String tesseractDataPath;

    private ITesseract englishTesseract;
    private ITesseract hindiTesseract;
    private ITesseract marathiTesseract;

    /**
     * ✅ Get English Tesseract instance
     */
    private ITesseract getEnglishTesseract() {
        if (englishTesseract == null) {
            englishTesseract = new Tesseract();
            configureTesseract(englishTesseract, "eng");
            logger.info("✅ English Tesseract initialized");
        }
        return englishTesseract;
    }

    /**
     * ✅ Get Hindi Tesseract instance
     */
    private ITesseract getHindiTesseract() {
        if (hindiTesseract == null) {
            hindiTesseract = new Tesseract();
            configureTesseract(hindiTesseract, "hin");
            logger.info("✅ Hindi Tesseract initialized");
        }
        return hindiTesseract;
    }

    /**
     * ✅ Get Marathi Tesseract instance
     */
    private ITesseract getMarathiTesseract() {
        if (marathiTesseract == null) {
            marathiTesseract = new Tesseract();
            configureTesseract(marathiTesseract, "mar");
            logger.info("✅ Marathi Tesseract initialized");
        }
        return marathiTesseract;
    }

    /**
     * ✅ Configure Tesseract
     */
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

        if (!pathSet) {
            logger.warn("⚠️ Could not find tessdata path, using system default");
        }

        tesseract.setLanguage(language);
        tesseract.setPageSegMode(3);
        tesseract.setOcrEngineMode(1);
    }

    /**
     * ✅ NEW: QUICK OCR for fast classification
     */
    public OcrResult extractTextWithConfidenceQuick(byte[] imageBytes) {
        try {
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (originalImage == null) {
                throw new OCRProcessingException("Failed to read image");
            }

            // ✅ FAST: Resize image to max 800px width
            BufferedImage resizedImage = resizeForQuickOCR(originalImage);

            // ✅ FAST: Grayscale only (no preprocessing)
            BufferedImage grayscale = convertToGrayscale(resizedImage);

            // ✅ Try English only (fastest)
            OcrResult result = performOCR(grayscale, getEnglishTesseract(), "English");

            logger.info("✅ Quick OCR: {} words, {:.1f}% confidence",
                    result.getWordCount(), result.getConfidence());

            return result;

        } catch (Exception ex) {
            logger.warn("⚠️ Quick OCR failed: {}", ex.getMessage());
            OcrResult result = new OcrResult();
            result.setText("");
            result.setConfidence(0.0);
            result.setWordCount(0);
            result.setDetectedLanguage("unknown");
            return result;
        }
    }

    /**
     * ✅ FULL OCR: Complete extraction with preprocessing
     */
    public OcrResult extractTextWithConfidence(byte[] imageBytes) {
        try {
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(imageBytes));
            if (originalImage == null) {
                throw new OCRProcessingException("Failed to read image");
            }

            BufferedImage processedImage = preprocessImage(originalImage);

            OcrResult englishResult = performOCR(processedImage, getEnglishTesseract(), "English");
            OcrResult hindiResult = performOCR(processedImage, getHindiTesseract(), "Hindi");

            OcrResult bestResult = selectBestResult(englishResult, hindiResult);

            logger.info("✅ OCR Complete: {} words, {:.1f}% confidence, Language: {}",
                    bestResult.getWordCount(), bestResult.getConfidence(), bestResult.getDetectedLanguage());

            return bestResult;

        } catch (Exception ex) {
            logger.error("❌ OCR failed", ex);
            OcrResult result = new OcrResult();
            result.setText("");
            result.setConfidence(0.0);
            result.setWordCount(0);
            result.setDetectedLanguage("unknown");
            return result;
        }
    }

    /**
     * ✅ Resize image for faster OCR
     */
    private BufferedImage resizeForQuickOCR(BufferedImage original) {
        int maxWidth = 800;

        if (original.getWidth() <= maxWidth) {
            return original;
        }

        int newWidth = maxWidth;
        int newHeight = (int) (original.getHeight() * ((double) maxWidth / original.getWidth()));

        BufferedImage resized = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = resized.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(original, 0, 0, newWidth, newHeight, null);
        g.dispose();

        logger.debug("✅ Resized: {}x{} → {}x{}",
                original.getWidth(), original.getHeight(), newWidth, newHeight);

        return resized;
    }

    /**
     * ✅ Simple grayscale conversion
     */
    private BufferedImage convertToGrayscale(BufferedImage original) {
        BufferedImage grayscale = new BufferedImage(
                original.getWidth(), original.getHeight(), BufferedImage.TYPE_BYTE_GRAY);

        Graphics2D g = grayscale.createGraphics();
        g.drawImage(original, 0, 0, null);
        g.dispose();

        return grayscale;
    }

    /**
     * ✅ Full image preprocessing
     */
    private BufferedImage preprocessImage(BufferedImage original) {
        try {
            BufferedImage grayscale = new BufferedImage(
                    original.getWidth(), original.getHeight(), BufferedImage.TYPE_BYTE_GRAY);

            Graphics2D g = grayscale.createGraphics();
            g.drawImage(original, 0, 0, null);
            g.dispose();

            BufferedImage enhanced = new BufferedImage(
                    grayscale.getWidth(), grayscale.getHeight(), BufferedImage.TYPE_BYTE_GRAY);

            for (int y = 0; y < grayscale.getHeight(); y++) {
                for (int x = 0; x < grayscale.getWidth(); x++) {
                    int pixel = grayscale.getRGB(x, y);
                    int gray = (pixel >> 16) & 0xff;
                    int newGray = gray > 128 ? 255 : 0;
                    int newPixel = (newGray << 16) | (newGray << 8) | newGray;
                    enhanced.setRGB(x, y, newPixel);
                }
            }

            logger.debug("✅ Image preprocessed: {}x{}", enhanced.getWidth(), enhanced.getHeight());
            return enhanced;

        } catch (Exception ex) {
            logger.warn("⚠️ Preprocessing failed, using original", ex);
            return original;
        }
    }

    /**
     * ✅ Perform OCR
     */
    private OcrResult performOCR(BufferedImage image, ITesseract tesseract, String language) {
        OcrResult result = new OcrResult();

        try {
            String text = tesseract.doOCR(image);
            text = cleanText(text);

            result.setText(text);
            result.setWordCount(countWords(text));
            result.setConfidence(estimateConfidence(text));
            result.setDetectedLanguage(language);

            logger.debug("📊 {} OCR: {} words, {:.1f}% confidence",
                    language, result.getWordCount(), result.getConfidence());

        } catch (TesseractException ex) {
            logger.warn("⚠️ {} OCR failed: {}", language, ex.getMessage());
            result.setText("");
            result.setWordCount(0);
            result.setConfidence(0.0);
            result.setDetectedLanguage(language);
        }

        return result;
    }

    /**
     * ✅ Select best result
     */
    private OcrResult selectBestResult(OcrResult result1, OcrResult result2) {
        double score1 = result1.getWordCount() * result1.getConfidence();
        double score2 = result2.getWordCount() * result2.getConfidence();

        if (score1 > score2) {
            return result1;
        } else if (score2 > score1) {
            return result2;
        }

        return result1.getWordCount() >= result2.getWordCount() ? result1 : result2;
    }

    /**
     * ✅ Clean text
     */
    private String cleanText(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }

        text = text.replaceAll("\\s+", " ");
        text = text.replaceAll("[\\p{C}&&[^\\n\\r]]", "");
        text = text.trim();

        return text;
    }

    /**
     * ✅ Count words
     */
    private int countWords(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }

        String[] words = text.trim().split("\\s+");
        int count = 0;

        for (String word : words) {
            if (word.length() > 0 && word.matches(".*[\\p{L}\\p{N}].*")) {
                count++;
            }
        }

        return count;
    }

    /**
     * ✅ Estimate confidence
     */
    private double estimateConfidence(String text) {
        if (text == null || text.isEmpty()) {
            return 0.0;
        }

        int totalChars = 0;
        int validChars = 0;

        for (char c : text.toCharArray()) {
            if (Character.isWhitespace(c)) continue;
            totalChars++;

            if (Character.isLetterOrDigit(c) ||
                    (c >= '\u0900' && c <= '\u0DFF') ||
                    "/-:.,()".indexOf(c) >= 0) {
                validChars++;
            }
        }

        if (totalChars == 0) return 0.0;

        double ratio = (double) validChars / totalChars;

        int wordCount = countWords(text);
        if (wordCount >= 10) ratio = Math.min(1.0, ratio * 1.15);
        if (wordCount >= 20) ratio = Math.min(1.0, ratio * 1.10);

        return Math.min(100.0, ratio * 100.0);
    }

    /**
     * ✅ Simple extract methods
     */
    public String extractText(byte[] imageBytes) {
        return extractTextWithConfidence(imageBytes).getText();
    }

    public String extractText(BufferedImage image) {
        try {
            return getEnglishTesseract().doOCR(image);
        } catch (TesseractException ex) {
            logger.error("❌ OCR failed", ex);
            return "";
        }
    }


    public static class OcrResult {
        private String text;
        private double confidence;
        private int wordCount;
        private String detectedLanguage;

        public String getText() { return text; }
        public void setText(String text) { this.text = text; }

        public double getConfidence() { return confidence; }
        public void setConfidence(double confidence) { this.confidence = confidence; }

        public int getWordCount() { return wordCount; }
        public void setWordCount(int wordCount) { this.wordCount = wordCount; }

        public String getDetectedLanguage() { return detectedLanguage; }
        public void setDetectedLanguage(String detectedLanguage) { this.detectedLanguage = detectedLanguage; }
    }
}