package com.docbox.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * ✅ FAST PDF Processing - No OCR (filename-based classification)
 */
@Service
public class PDFProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(PDFProcessingService.class);

    @Value("${app.pdf.thumbnail-dpi:50}")
    private int thumbnailDpi;

    @Value("${app.pdf.max-pages:10}")
    private int maxPages;

    /**
     * Extract text from PDF (InputStream)
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
     * ✅ FAST: Direct text extraction only (NO OCR)
     */
    public String extractText(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {

            int pageCount = document.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(1);
            stripper.setEndPage(Math.min(pageCount, maxPages));

            String text = stripper.getText(document);

            if (text == null || text.trim().isEmpty()) {
                logger.debug("📸 Scanned PDF (no text) - will use filename classification");
                return "";
            }

            logger.debug("✅ Text PDF: {} chars", text.length());
            return text;

        } catch (IOException ex) {
            logger.error("Text extraction failed", ex);
            return "";
        }
    }

    /**
     * ✅ OPTIMIZED: Fast thumbnail with low DPI
     */
    public byte[] generateThumbnail(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {

            if (document.getNumberOfPages() == 0) {
                return null;
            }

            // ✅ Use LOW DPI for speed
            PDFRenderer renderer = new PDFRenderer(document);
            BufferedImage image = renderer.renderImageWithDPI(0, thumbnailDpi);

            // ✅ FAST resize
            int targetWidth = 200;
            int targetHeight = (int) (image.getHeight() * ((double) targetWidth / image.getWidth()));

            BufferedImage thumbnail = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);

            java.awt.Graphics2D g = thumbnail.createGraphics();
            // ✅ Use FAST interpolation
            g.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,
                    java.awt.RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            g.drawImage(image, 0, 0, targetWidth, targetHeight, null);
            g.dispose();

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            ImageIO.write(thumbnail, "jpg", outputStream);

            return outputStream.toByteArray();

        } catch (Exception ex) {
            logger.warn("Thumbnail failed: {}", ex.getMessage());
            return null;
        }
    }

    public int getPageCount(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            return document.getNumberOfPages();
        } catch (IOException ex) {
            logger.error("Failed to get page count", ex);
            return 0;
        }
    }

    public int getPageCount(InputStream pdfStream) {
        try {
            byte[] pdfBytes = pdfStream.readAllBytes();
            return getPageCount(pdfBytes);
        } catch (IOException ex) {
            logger.error("Failed to get page count from stream", ex);
            return 0;
        }
    }

    public boolean isValidPdf(byte[] fileBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(fileBytes)) {
            return document.getNumberOfPages() > 0;
        } catch (Exception ex) {
            return false;
        }
    }

    public String extractMetadata(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            if (document.getDocumentInformation() != null) {
                StringBuilder metadata = new StringBuilder();
                var info = document.getDocumentInformation();

                if (info.getTitle() != null) {
                    metadata.append("Title: ").append(info.getTitle()).append("\n");
                }
                if (info.getAuthor() != null) {
                    metadata.append("Author: ").append(info.getAuthor()).append("\n");
                }
                if (info.getSubject() != null) {
                    metadata.append("Subject: ").append(info.getSubject()).append("\n");
                }
                if (info.getCreationDate() != null) {
                    metadata.append("Created: ").append(info.getCreationDate()).append("\n");
                }

                return metadata.toString();
            }
            return "";
        } catch (IOException ex) {
            logger.error("Failed to extract metadata", ex);
            return "";
        }
    }

    public boolean isEncrypted(byte[] pdfBytes) {
        try (PDDocument document = org.apache.pdfbox.Loader.loadPDF(pdfBytes)) {
            return document.isEncrypted();
        } catch (Exception ex) {
            return false;
        }
    }
}