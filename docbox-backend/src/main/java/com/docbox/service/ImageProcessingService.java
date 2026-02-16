package com.docbox.service;

import com.docbox.exception.FileStorageException;
import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Image Processing Service
 * Handles image compression, thumbnail generation, and format conversion
 */
@Service
public class ImageProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(ImageProcessingService.class);

    @Value("${app.image.thumbnail-width:200}")
    private int thumbnailWidth;

    @Value("${app.image.thumbnail-height:200}")
    private int thumbnailHeight;

    @Value("${app.image.compression-quality:0.8}")
    private double compressionQuality;

    /**
     * Generate thumbnail from image bytes
     */
    public byte[] generateThumbnail(byte[] imageBytes) {
        try {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(imageBytes);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            Thumbnails.of(inputStream)
                    .size(thumbnailWidth, thumbnailHeight)
                    .outputFormat("jpg")
                    .outputQuality(compressionQuality)
                    .toOutputStream(outputStream);

            byte[] thumbnail = outputStream.toByteArray();
            logger.debug("Generated thumbnail: {}x{} pixels, {} bytes",
                    thumbnailWidth, thumbnailHeight, thumbnail.length);

            return thumbnail;

        } catch (IOException ex) {
            logger.error("Failed to generate thumbnail", ex);
            return null;
        }
    }

    /**
     * Generate thumbnail from InputStream
     */
    public byte[] generateThumbnail(InputStream imageStream) {
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            Thumbnails.of(imageStream)
                    .size(thumbnailWidth, thumbnailHeight)
                    .outputFormat("jpg")
                    .outputQuality(compressionQuality)
                    .toOutputStream(outputStream);

            return outputStream.toByteArray();

        } catch (IOException ex) {
            logger.error("Failed to generate thumbnail from stream", ex);
            return null;
        }
    }

    /**
     * Compress image
     */
    public byte[] compressImage(byte[] imageBytes, double quality) {
        try {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(imageBytes);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            Thumbnails.of(inputStream)
                    .scale(1.0) // Keep original size
                    .outputFormat("jpg")
                    .outputQuality(quality)
                    .toOutputStream(outputStream);

            byte[] compressed = outputStream.toByteArray();
            logger.debug("Compressed image: {} bytes -> {} bytes ({}% reduction)",
                    imageBytes.length, compressed.length,
                    (100 - (compressed.length * 100 / imageBytes.length)));

            return compressed;

        } catch (IOException ex) {
            logger.error("Failed to compress image", ex);
            return imageBytes; // Return original on failure
        }
    }

    /**
     * Convert HEIC to JPG (placeholder - requires additional library)
     */
    public byte[] convertHeicToJpg(byte[] heicBytes) {
        // HEIC conversion requires additional libraries like imageio-heif
        // For now, return as-is
        logger.warn("HEIC conversion not yet implemented");
        return heicBytes;
    }

    /**
     * Resize image to specific dimensions
     */
    public byte[] resizeImage(byte[] imageBytes, int width, int height) {
        try {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(imageBytes);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

            Thumbnails.of(inputStream)
                    .size(width, height)
                    .outputFormat("jpg")
                    .outputQuality(compressionQuality)
                    .toOutputStream(outputStream);

            return outputStream.toByteArray();

        } catch (IOException ex) {
            logger.error("Failed to resize image", ex);
            return imageBytes;
        }
    }

    /**
     * Get image dimensions
     */
    public int[] getImageDimensions(byte[] imageBytes) {
        try {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(imageBytes);
            BufferedImage image = ImageIO.read(inputStream);

            if (image != null) {
                return new int[]{image.getWidth(), image.getHeight()};
            }
        } catch (IOException ex) {
            logger.error("Failed to get image dimensions", ex);
        }

        return new int[]{0, 0};
    }

    /**
     * Validate if file is a valid image
     */
    public boolean isValidImage(byte[] fileBytes) {
        try {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(fileBytes);
            BufferedImage image = ImageIO.read(inputStream);
            return image != null;
        } catch (Exception ex) {
            return false;
        }
    }

    /**
     * Auto-rotate image based on EXIF orientation (if needed)
     */
    public byte[] autoRotateImage(byte[] imageBytes) {
        // EXIF rotation requires additional processing
        // For now, return as-is
        return imageBytes;
    }
}