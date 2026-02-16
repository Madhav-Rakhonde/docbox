package com.docbox.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;


@Service
public class QRCodeService {

    private static final Logger logger = LoggerFactory.getLogger(QRCodeService.class);

    /**
     * Generate QR code as byte array
     *
     * @param text Text to encode in QR code
     * @param width Width of QR code image
     * @param height Height of QR code image
     * @return PNG image bytes
     */
    public byte[] generateQRCode(String text, int width, int height) {
        try {
            // Configure QR code settings
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);

            // Generate QR code matrix
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(
                    text,
                    BarcodeFormat.QR_CODE,
                    width,
                    height,
                    hints
            );

            // Convert to PNG image
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            byte[] qrCodeBytes = outputStream.toByteArray();

            logger.debug("QR code generated: size={}x{}, text={}", width, height, text);

            return qrCodeBytes;

        } catch (WriterException | IOException ex) {
            logger.error("Failed to generate QR code for text: {}", text, ex);
            return null;
        }
    }

    /**
     * Generate QR code with default size (300x300)
     *
     * @param text Text to encode
     * @return PNG image bytes
     */
    public byte[] generateQRCode(String text) {
        return generateQRCode(text, 300, 300);
    }

    /**
     * Generate QR code for URL
     *
     * @param url URL to encode
     * @return PNG image bytes
     */
    public byte[] generateQRCodeForUrl(String url) {
        return generateQRCode(url, 300, 300);
    }

    /**
     * Generate high-resolution QR code
     *
     * @param text Text to encode
     * @return PNG image bytes (500x500)
     */
    public byte[] generateHighResQRCode(String text) {
        return generateQRCode(text, 500, 500);
    }

    /**
     * Generate small QR code for thumbnails
     *
     * @param text Text to encode
     * @return PNG image bytes (150x150)
     */
    public byte[] generateSmallQRCode(String text) {
        return generateQRCode(text, 150, 150);
    }
}