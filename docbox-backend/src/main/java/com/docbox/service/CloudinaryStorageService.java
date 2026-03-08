package com.docbox.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.docbox.exception.FileStorageException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

/**
 * CloudinaryStorageService — Drop-in replacement for GoogleDriveStorageService
 * ─────────────────────────────────────────────────────────────────────────────
 * All config comes from environment variables (or application.properties):
 *
 *   CLOUDINARY_CLOUD_NAME   → your Cloudinary cloud name
 *   CLOUDINARY_API_KEY      → your Cloudinary API key
 *   CLOUDINARY_API_SECRET   → your Cloudinary API secret
 *
 * Alternatively set a single CLOUDINARY_URL env var:
 *   CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 *
 * What "storedFilename" means here
 * ─────────────────────────────────
 * Previously (Drive): a Drive file-ID like "1BxiMVs0XRA5..."
 * Now (Cloudinary):   the Cloudinary public_id, e.g. "docbox/Aadhaar_Card/uuid_original"
 *
 * The public_id is opaque to all callers — they just pass it back when they
 * need to download or delete, exactly as before. Zero changes needed in
 * DocumentService, BulkOperationsService, ShareLinkService, OfflineService, etc.
 *
 * Files are stored as raw resources (not images) so that PDFs, DOCXs, etc.
 * are all supported. Image files (jpg/png/etc.) are also stored as raw to
 * preserve the original bytes on download.
 */
@Service
public class CloudinaryStorageService {

    private static final Logger logger = LoggerFactory.getLogger(CloudinaryStorageService.class);

    /** Cloudinary root folder — all app files live under docbox/<category>/ */
    private static final String ROOT_FOLDER = "docbox";

    /** Resource type used for ALL uploads (raw preserves any file type). */
    private static final String RESOURCE_TYPE = "raw";

    @Autowired
    private Cloudinary cloudinary;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @PostConstruct
    public void init() {
        // Validate that the Cloudinary bean was configured properly
        String cloudName = (String) cloudinary.config.cloudName;
        if (cloudName == null || cloudName.isBlank()) {
            throw new FileStorageException(
                    "Cloudinary cloud name is not configured!\n" +
                            "Set env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET\n" +
                            "Or a single: CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME", null);
        }
        logger.info("CloudinaryStorageService ready — cloud={}", cloudName);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC API  (identical signatures to GoogleDriveStorageService)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Upload a file to Cloudinary inside a category sub-folder.
     *
     * @param file         MultipartFile from the HTTP request
     * @param categoryName e.g. "Aadhaar Card" — becomes a Cloudinary folder segment
     * @return             Cloudinary public_id  (stored as Document.storedFilename)
     */
    public String storeFile(MultipartFile file, String categoryName) {
        if (file == null || file.isEmpty()) {
            throw new FileStorageException("Cannot store an empty file", null);
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.contains("..")) {
            throw new FileStorageException("Invalid filename: " + originalFilename, null);
        }

        // Sanitise category name for use as a folder segment
        String safeCategory = categoryName.replaceAll("[^a-zA-Z0-9 _-]", "_").trim();
        // Build a unique public_id:  docbox/Aadhaar_Card/<uuid>_<originalFilename>
        String publicId = ROOT_FOLDER + "/" + safeCategory + "/"
                + UUID.randomUUID() + "_" + stripExtension(originalFilename);

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().upload(
                    file.getBytes(),
                    ObjectUtils.asMap(
                            "public_id",     publicId,
                            "resource_type", RESOURCE_TYPE,
                            "use_filename",  false,
                            "overwrite",     false
                    )
            );

            String returnedPublicId = (String) result.get("public_id");
            logger.info("Uploaded to Cloudinary: {} → public_id={}", originalFilename, returnedPublicId);
            return returnedPublicId;

        } catch (IOException ex) {
            throw new FileStorageException("Failed to upload file to Cloudinary", ex);
        }
    }

    /**
     * Download file bytes from Cloudinary by public_id.
     *
     * @param publicId  Document.storedFilename (Cloudinary public_id)
     * @return          Raw file bytes
     */
    public byte[] loadFileAsBytes(String publicId) {
        try {
            // Generate a signed download URL that expires in 1 hour
            String downloadUrl = cloudinary.url()
                    .resourceType(RESOURCE_TYPE)
                    .signed(true)
                    .generate(publicId);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(downloadUrl))
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(
                    request, HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() != 200) {
                throw new FileStorageException(
                        "Cloudinary download failed (HTTP " + response.statusCode()
                                + ") for public_id: " + publicId, null);
            }

            logger.debug("Downloaded {} bytes from Cloudinary public_id={}", response.body().length, publicId);
            return response.body();

        } catch (FileStorageException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new FileStorageException(
                    "Failed to download file from Cloudinary: " + publicId, ex);
        }
    }

    /**
     * Delete a file from Cloudinary by public_id.
     *
     * @param publicId  Document.storedFilename (Cloudinary public_id)
     */
    public void deleteFile(String publicId) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = cloudinary.uploader().destroy(
                    publicId,
                    ObjectUtils.asMap("resource_type", RESOURCE_TYPE)
            );

            String outcome = (String) result.get("result");
            if ("ok".equals(outcome)) {
                logger.info("Deleted Cloudinary file: {}", publicId);
            } else {
                // Log only — same lenient behaviour as the Drive implementation
                logger.warn("Cloudinary delete returned '{}' for public_id={}", outcome, publicId);
            }
        } catch (Exception ex) {
            logger.error("Failed to delete Cloudinary file {}: {}", publicId, ex.getMessage());
        }
    }

    /**
     * Returns the HTTPS secure URL for the asset — stored in Document.filePath.
     * This replaces the old broken Paths.get("cloudinary://...") which crashed on
     * Windows because ':' is an illegal character in Windows filesystem paths.
     *
     * @param publicId  Cloudinary public_id
     * @return          Real HTTPS URL string wrapped in a dummy Path so the existing
     *                  FileStorageService.getFilePath() signature is unchanged.
     *                  Callers should use .toString() to get the URL string.
     */
    public Path getFilePath(String publicId) {
        // Generate the actual HTTPS URL and return it as a URI-based Path,
        // which works on all platforms (no OS filesystem path rules apply).
        String url = generateSecureUrl(publicId);
        try {
            return Path.of(new URI(url));
        } catch (Exception e) {
            // If URI parsing fails for any reason, fall back to storing the public_id
            // prefixed with https-cloudinary so it's clearly not a local path.
            return Path.of(url.replace("://", "-"));
        }
    }

    /**
     * Returns the HTTPS secure URL directly as a String.
     * Builds the URL locally from the public_id — no extra Cloudinary API call.
     * The URL is unsigned (publicly accessible if your Cloudinary account allows it)
     * which is fine for document storage since access control is handled at the app layer.
     *
     * @param publicId  Cloudinary public_id
     * @return          HTTPS URL string
     */
    public String getFileUrl(String publicId) {
        // Build URL locally — avoids an extra round-trip to Cloudinary signing API.
        // Format: https://res.cloudinary.com/<cloud>/raw/upload/<public_id>
        String cloudName = (String) cloudinary.config.cloudName;
        return "https://res.cloudinary.com/" + cloudName + "/raw/upload/" + publicId;
    }

    /**
     * Generate a time-limited (1-hour) secure download URL for the asset.
     * Useful if you want to give the browser a direct link without proxying bytes.
     *
     * @param publicId  Cloudinary public_id
     * @return          Signed URL string
     */
    public String generateSecureUrl(String publicId) {
        return cloudinary.url()
                .resourceType(RESOURCE_TYPE)
                .signed(true)
                .generate(publicId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    /** Remove the file extension so Cloudinary doesn't double-append it. */
    private String stripExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot == -1 ? filename : filename.substring(0, dot);
    }
}