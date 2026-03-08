package com.docbox.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

/**
 * FileStorageService — Cloudinary Edition
 * ─────────────────────────────────────────
 * This class REPLACES the previous Google-Drive-backed FileStorageService.
 * All method signatures are identical so DocumentService, BulkOperationsService,
 * ShareLinkService, OfflineService etc. require ZERO changes.
 *
 * Every call is delegated to CloudinaryStorageService which talks to the
 * Cloudinary API using your cloud credentials.
 *
 * What "storedFilename" means now
 * ────────────────────────────────
 * Previously (Drive): a Drive file-ID like "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
 * Now (Cloudinary):   a Cloudinary public_id like "docbox/Aadhaar_Card/uuid_filename"
 *
 * The public_id is opaque to all callers — they just pass it back when they
 * need to download or delete, exactly as before.
 */
@Service
public class FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);

    @Autowired
    private CloudinaryStorageService cloudinaryStorageService;

    /**
     * Store file in a category-specific Cloudinary sub-folder.
     *
     * @param file         MultipartFile from the HTTP request
     * @param categoryName e.g. "Aadhaar Card" — becomes a Cloudinary folder segment
     * @return             Cloudinary public_id (used as storedFilename in Document entity)
     */
    public String storeFile(MultipartFile file, String categoryName) {
        logger.debug("Storing file '{}' in Cloudinary category '{}'",
                file.getOriginalFilename(), categoryName);
        return cloudinaryStorageService.storeFile(file, categoryName);
    }

    /**
     * Download file bytes from Cloudinary.
     *
     * @param publicId  Cloudinary public_id (Document.storedFilename)
     * @return          Raw file bytes
     */
    public byte[] loadFileAsBytes(String publicId) {
        logger.debug("Loading file from Cloudinary: {}", publicId);
        return cloudinaryStorageService.loadFileAsBytes(publicId);
    }

    /**
     * Delete a file from Cloudinary.
     *
     * @param publicId  Cloudinary public_id (Document.storedFilename)
     */
    public void deleteFile(String publicId) {
        logger.debug("Deleting Cloudinary file: {}", publicId);
        cloudinaryStorageService.deleteFile(publicId);
    }

    /**
     * Returns the HTTPS secure URL for the asset as a Path.
     * Use .toString() on the result to get the URL string for Document.filePath.
     *
     * @param publicId  Cloudinary public_id
     * @return          URI-based Path wrapping the HTTPS URL (cross-platform safe)
     */
    public Path getFilePath(String publicId) {
        return cloudinaryStorageService.getFilePath(publicId);
    }

    /**
     * Returns the HTTPS secure URL directly as a String.
     * This is what gets stored in Document.filePath.
     *
     * @param publicId  Cloudinary public_id
     * @return          Signed HTTPS download URL
     */
    public String getFileUrl(String publicId) {
        return cloudinaryStorageService.getFileUrl(publicId);
    }

    /**
     * Generate a time-limited secure URL for the asset.
     * Delegates to CloudinaryStorageService.
     *
     * @param publicId  Cloudinary public_id
     * @return          Signed URL string
     */
    public String generateSecureUrl(String publicId) {
        return cloudinaryStorageService.generateSecureUrl(publicId);
    }
}