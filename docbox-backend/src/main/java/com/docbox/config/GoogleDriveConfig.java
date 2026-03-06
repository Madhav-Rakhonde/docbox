package com.docbox.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * GoogleDriveConfig — Docker / env-var edition
 * ─────────────────────────────────────────────
 * Credentials are read ONLY from environment variables. No file needed.
 *
 * Required env vars (set in docker-compose.yml or docker run -e):
 *
 *   GOOGLE_DRIVE_CREDENTIALS_JSON   → full service-account JSON, one line
 *   GOOGLE_DRIVE_FOLDER_ID          → 1WSv4l5C1ONd75dSjSY8FcH0epT7FeWkj
 *
 * Optional:
 *   GOOGLE_DRIVE_MAKE_PUBLIC        → false (default) | true
 */
@Configuration
public class GoogleDriveConfig {

    private static final Logger logger = LoggerFactory.getLogger(GoogleDriveConfig.class);

    @Value("${spring.application.name:DocBox}")
    private String applicationName;

    @Bean
    public Drive googleDriveService() throws IOException, GeneralSecurityException {

        // Spring Boot auto-maps  GOOGLE_DRIVE_CREDENTIALS_JSON
        //                     →  google.drive.credentials-json
        // but we also read the raw env var directly as a safety net.
        String credentialsJson = System.getenv("GOOGLE_DRIVE_CREDENTIALS_JSON");

        if (credentialsJson == null || credentialsJson.isBlank()) {
            throw new IllegalStateException(
                    "\n\n" +
                            "╔══════════════════════════════════════════════════════════════╗\n" +
                            "║  GOOGLE_DRIVE_CREDENTIALS_JSON environment variable not set  ║\n" +
                            "╠══════════════════════════════════════════════════════════════╣\n" +
                            "║  docker-compose.yml:                                         ║\n" +
                            "║    environment:                                              ║\n" +
                            "║      - GOOGLE_DRIVE_CREDENTIALS_JSON={\"type\":\"service_...\"} ║\n" +
                            "║                                                              ║\n" +
                            "║  docker run:                                                 ║\n" +
                            "║    -e GOOGLE_DRIVE_CREDENTIALS_JSON='{\"type\":...}'          ║\n" +
                            "╚══════════════════════════════════════════════════════════════╝\n"
            );
        }

        logger.info("Loading Google Drive credentials from environment variable");

        InputStream stream = new ByteArrayInputStream(
                credentialsJson.getBytes(StandardCharsets.UTF_8));

        GoogleCredentials credentials = GoogleCredentials
                .fromStream(stream)
                .createScoped(Collections.singleton(DriveScopes.DRIVE));

        Drive drive = new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                JacksonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName(applicationName)
                .build();

        logger.info("Google Drive client ready");
        return drive;
    }
}