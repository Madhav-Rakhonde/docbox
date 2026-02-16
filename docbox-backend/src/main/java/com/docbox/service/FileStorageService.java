package com.docbox.service;

import com.docbox.exception.FileStorageException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import jakarta.annotation.PostConstruct;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    private Path fileStorageLocation;

    @PostConstruct
    public void init() {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();

        try {
            Files.createDirectories(fileStorageLocation);
            logger.info("✅ File storage initialized at: {}", fileStorageLocation);
        } catch (Exception ex) {
            throw new FileStorageException("Could not create upload directory", ex);
        }
    }

    /**
     * Store file in category-specific folder
     */
    public String storeFile(MultipartFile file, String categoryName) {
        try {
            if (file.isEmpty()) {
                throw new FileStorageException("Failed to store empty file");
            }

            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.contains("..")) {
                throw new FileStorageException("Invalid filename: " + originalFilename);
            }

            // Sanitize category name for folder
            String sanitizedCategory = categoryName.replaceAll("[^a-zA-Z0-9_-]", "_");

            // Create category folder if it doesn't exist
            Path categoryFolder = fileStorageLocation.resolve(sanitizedCategory);
            Files.createDirectories(categoryFolder);

            // Generate unique filename
            String fileExtension = "";
            int lastDotIndex = originalFilename.lastIndexOf('.');
            if (lastDotIndex > 0) {
                fileExtension = originalFilename.substring(lastDotIndex);
            }

            String storedFilename = UUID.randomUUID().toString() + fileExtension;
            String relativePath = sanitizedCategory + "/" + storedFilename;

            // Store file
            Path targetLocation = fileStorageLocation.resolve(relativePath);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            logger.info("✅ File stored: {}", relativePath);
            return relativePath;

        } catch (IOException ex) {
            throw new FileStorageException("Failed to store file", ex);
        }
    }

    /**
     * Load file as bytes
     */
    public byte[] loadFileAsBytes(String filename) {
        try {
            Path filePath = fileStorageLocation.resolve(filename).normalize();
            return Files.readAllBytes(filePath);
        } catch (IOException ex) {
            throw new FileStorageException("File not found: " + filename, ex);
        }
    }

    /**
     * Delete file
     */
    public void deleteFile(String filename) {
        try {
            Path filePath = fileStorageLocation.resolve(filename).normalize();
            Files.deleteIfExists(filePath);
            logger.info("✅ File deleted: {}", filename);
        } catch (IOException ex) {
            logger.error("Failed to delete file: {}", filename, ex);
        }
    }

    /**
     * Get file path
     */
    public Path getFilePath(String filename) {
        return fileStorageLocation.resolve(filename).normalize();
    }
}