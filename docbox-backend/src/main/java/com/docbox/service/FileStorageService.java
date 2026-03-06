package com.docbox.service;

import com.docbox.exception.FileStorageException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

/**
 * FileStorageService  — Google Drive Edition
 * ────────────────────────────────────────────
 * This class REPLACES the original local-disk FileStorageService.
 * All method signatures are identical so DocumentService, BulkOperationsService,
 * ShareLinkService, OfflineService etc. require ZERO changes.
 *
 * Every call is delegated to GoogleDriveStorageService which talks to the
 * Google Drive API using your Service Account credentials.
 *
 * What "storedFilename" means now
 * ────────────────────────────────
 * Previously: a relative path like "Aadhaar_Card/uuid.pdf"
 * Now:        a Drive file-ID like "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs76OlcdSsQ"
 *
 * The Drive file-ID is opaque to all callers — they just pass it back when
 * they need to download or delete the file, exactly as before.
 */
@Service
public class FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);

    @Autowired
    private GoogleDriveStorageService driveStorageService;

    /**
     * Store file in a category-specific Drive sub-folder.
     *
     * @param file         MultipartFile from the HTTP request
     * @param categoryName e.g. "Aadhaar Card" — becomes a Drive sub-folder
     * @return             Drive file-ID (used as storedFilename in Document entity)
     */
    public String storeFile(MultipartFile file, String categoryName) {
        logger.debug("Storing file '{}' in Drive category '{}'",
                file.getOriginalFilename(), categoryName);
        return driveStorageService.storeFile(file, categoryName);
    }

    /**
     * Download file bytes from Drive.
     *
     * @param driveFileId  Drive file-ID (Document.storedFilename)
     * @return             Raw file bytes
     */
    public byte[] loadFileAsBytes(String driveFileId) {
        logger.debug("Loading file from Drive: {}", driveFileId);
        return driveStorageService.loadFileAsBytes(driveFileId);
    }

    /**
     * Delete a file from Drive.
     *
     * @param driveFileId  Drive file-ID (Document.storedFilename)
     */
    public void deleteFile(String driveFileId) {
        logger.debug("Deleting Drive file: {}", driveFileId);
        driveStorageService.deleteFile(driveFileId);
    }

    /**
     * Returns a synthetic Path used by DocumentService to populate Document.filePath.
     * Format: drive://<driveFileId>
     *
     * @param driveFileId  Drive file-ID
     * @return             Cosmetic Path (not a real filesystem path)
     */
    public Path getFilePath(String driveFileId) {
        return driveStorageService.getFilePath(driveFileId);
    }
}