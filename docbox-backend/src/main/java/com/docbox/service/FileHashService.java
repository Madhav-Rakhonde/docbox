package com.docbox.service;

import org.apache.commons.codec.digest.DigestUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

@Service
public class FileHashService {

    private static final Logger logger = LoggerFactory.getLogger(FileHashService.class);

    /**
     * Calculate SHA-256 hash of a file
     */
    public String calculateFileHash(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            String hash = DigestUtils.sha256Hex(inputStream);
            logger.debug("📊 File hash calculated: {} -> {}", file.getOriginalFilename(), hash);
            return hash;
        } catch (IOException e) {
            logger.error("❌ Failed to calculate file hash: {}", e.getMessage());
            throw new RuntimeException("Failed to calculate file hash", e);
        }
    }

    /**
     * Calculate SHA-256 hash from byte array
     */
    public String calculateHash(byte[] bytes) {
        String hash = DigestUtils.sha256Hex(bytes);
        logger.debug("📊 Hash calculated from bytes: {}", hash);
        return hash;
    }

    /**
     * Verify if two hashes match
     */
    public boolean hashesMatch(String hash1, String hash2) {
        if (hash1 == null || hash2 == null) {
            return false;
        }
        return hash1.equalsIgnoreCase(hash2);
    }
}