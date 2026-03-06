package com.docbox.service;

import com.docbox.exception.FileStorageException;
import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.google.api.services.drive.model.Permission;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * GoogleDriveStorageService — Docker / env-var edition
 * ─────────────────────────────────────────────────────
 * All config comes from environment variables:
 *
 *   GOOGLE_DRIVE_FOLDER_ID      → root Drive folder ID
 *   GOOGLE_DRIVE_MAKE_PUBLIC    → true | false  (default false)
 *
 * storedFilename in the Document entity = Drive file-ID.
 * All other services (DocumentService, BulkOperationsService, etc.)
 * pass that ID back here for downloads and deletes — no changes needed elsewhere.
 */
@Service
public class GoogleDriveStorageService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleDriveStorageService.class);

    @Autowired
    private Drive googleDriveService;

    private String rootFolderId;
    private boolean makePublic;

    /** Category name → Drive folder ID. Cleared on container restart. */
    private final Map<String, String> categoryFolderCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        rootFolderId = System.getenv("GOOGLE_DRIVE_FOLDER_ID");
        String makePublicEnv = System.getenv("GOOGLE_DRIVE_MAKE_PUBLIC");
        makePublic = "true".equalsIgnoreCase(makePublicEnv);

        if (rootFolderId == null || rootFolderId.isBlank()) {
            throw new FileStorageException(
                    "GOOGLE_DRIVE_FOLDER_ID environment variable is not set!\n" +
                            "Add it to your docker-compose.yml:\n" +
                            "  - GOOGLE_DRIVE_FOLDER_ID=1WSv4l5C1ONd75dSjSY8FcH0epT7FeWkj", null);
        }

        logger.info("GoogleDriveStorageService ready — folder={}, makePublic={}", rootFolderId, makePublic);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API  (identical signatures to old FileStorageService)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Upload a file to Google Drive inside a category sub-folder.
     *
     * @return Drive file-ID  — stored as Document.storedFilename
     */
    public String storeFile(MultipartFile file, String categoryName) {
        if (file == null || file.isEmpty()) {
            throw new FileStorageException("Cannot store an empty file", null);
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.contains("..")) {
            throw new FileStorageException("Invalid filename: " + originalFilename, null);
        }

        try {
            String categoryFolderId = getOrCreateCategoryFolder(categoryName);

            File fileMeta = new File();
            fileMeta.setName(UUID.randomUUID() + "_" + originalFilename);
            fileMeta.setParents(Collections.singletonList(categoryFolderId));

            String mimeType = file.getContentType() != null
                    ? file.getContentType() : "application/octet-stream";

            File uploaded;
            try (InputStream in = file.getInputStream()) {
                InputStreamContent content = new InputStreamContent(mimeType, in);
                content.setLength(file.getSize());
                uploaded = googleDriveService.files()
                        .create(fileMeta, content)
                        .setFields("id, name")
                        .execute();
            }

            logger.info("Uploaded to Drive: {} → fileId={}", originalFilename, uploaded.getId());

            if (makePublic) {
                makeFilePublic(uploaded.getId());
            }

            return uploaded.getId(); // ← this becomes storedFilename in Document
        } catch (IOException ex) {
            throw new FileStorageException("Failed to upload file to Google Drive", ex);
        }
    }

    /**
     * Download file bytes from Drive by file-ID.
     *
     * @param driveFileId  Document.storedFilename
     */
    public byte[] loadFileAsBytes(String driveFileId) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            googleDriveService.files()
                    .get(driveFileId)
                    .executeMediaAndDownloadTo(baos);
            logger.debug("Downloaded {} bytes from Drive fileId={}", baos.size(), driveFileId);
            return baos.toByteArray();
        } catch (IOException ex) {
            throw new FileStorageException(
                    "Failed to download file from Google Drive: " + driveFileId, ex);
        }
    }

    /**
     * Delete a file from Drive by file-ID.
     *
     * @param driveFileId  Document.storedFilename
     */
    public void deleteFile(String driveFileId) {
        try {
            googleDriveService.files().delete(driveFileId).execute();
            logger.info("Deleted Drive file: {}", driveFileId);
        } catch (IOException ex) {
            // Log only — mirrors original FileStorageService behaviour
            logger.error("Failed to delete Drive file {}: {}", driveFileId, ex.getMessage());
        }
    }

    /**
     * Returns a cosmetic Path for Document.filePath storage.
     * Format: drive://<driveFileId>
     */
    public Path getFilePath(String driveFileId) {
        return Paths.get("drive://" + driveFileId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Find or create a Drive sub-folder for the given category inside rootFolderId.
     * Results cached in-memory for the lifetime of the container.
     */
    private String getOrCreateCategoryFolder(String categoryName) throws IOException {
        String folderName = categoryName.replaceAll("[^a-zA-Z0-9 _-]", "_");

        if (categoryFolderCache.containsKey(folderName)) {
            return categoryFolderCache.get(folderName);
        }

        String query = String.format(
                "mimeType='application/vnd.google-apps.folder' " +
                        "and name='%s' " +
                        "and '%s' in parents " +
                        "and trashed=false",
                folderName.replace("'", "\\'"), rootFolderId);

        FileList result = googleDriveService.files()
                .list().setQ(query).setFields("files(id)").execute();

        if (!result.getFiles().isEmpty()) {
            String id = result.getFiles().get(0).getId();
            categoryFolderCache.put(folderName, id);
            return id;
        }

        // Create the folder
        File folderMeta = new File();
        folderMeta.setName(folderName);
        folderMeta.setMimeType("application/vnd.google-apps.folder");
        folderMeta.setParents(Collections.singletonList(rootFolderId));

        File created = googleDriveService.files()
                .create(folderMeta).setFields("id").execute();

        categoryFolderCache.put(folderName, created.getId());
        logger.info("Created Drive sub-folder '{}' → {}", folderName, created.getId());
        return created.getId();
    }

    private void makeFilePublic(String fileId) throws IOException {
        googleDriveService.permissions()
                .create(fileId, new Permission().setType("anyone").setRole("reader"))
                .execute();
        logger.debug("Drive file {} is now public", fileId);
    }
}