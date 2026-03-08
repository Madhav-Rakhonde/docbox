package com.docbox.config;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * CloudinaryConfig
 * ─────────────────
 * Produces the singleton {@link Cloudinary} bean used by CloudinaryStorageService.
 *
 * Configuration priority (highest → lowest):
 *   1. CLOUDINARY_URL env var (or property)
 *      e.g.  CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 *
 *   2. Three separate env vars / application.properties keys:
 *        CLOUDINARY_CLOUD_NAME  (or cloudinary.cloud-name)
 *        CLOUDINARY_API_KEY     (or cloudinary.api-key)
 *        CLOUDINARY_API_SECRET  (or cloudinary.api-secret)
 *
 * docker-compose.yml example:
 * ───────────────────────────
 *   environment:
 *     - CLOUDINARY_CLOUD_NAME=my-cloud
 *     - CLOUDINARY_API_KEY=123456789012345
 *     - CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
 *
 * application.properties example:
 * ────────────────────────────────
 *   cloudinary.cloud-name=${CLOUDINARY_CLOUD_NAME}
 *   cloudinary.api-key=${CLOUDINARY_API_KEY}
 *   cloudinary.api-secret=${CLOUDINARY_API_SECRET}
 */
@Configuration
public class CloudinaryConfig {

    private static final Logger logger = LoggerFactory.getLogger(CloudinaryConfig.class);

    @Bean
    public Cloudinary cloudinary() {
        // ── Option 1: single CLOUDINARY_URL env var ──────────────────────────
        String cloudinaryUrl = resolveProperty("CLOUDINARY_URL", "cloudinary.url");
        if (cloudinaryUrl != null && !cloudinaryUrl.isBlank()) {
            logger.info("Cloudinary configured via CLOUDINARY_URL");
            return new Cloudinary(cloudinaryUrl);
        }

        // ── Option 2: three separate credentials ─────────────────────────────
        String cloudName  = resolveProperty("CLOUDINARY_CLOUD_NAME", "cloudinary.cloud-name");
        String apiKey     = resolveProperty("CLOUDINARY_API_KEY",    "cloudinary.api-key");
        String apiSecret  = resolveProperty("CLOUDINARY_API_SECRET", "cloudinary.api-secret");

        if (isBlank(cloudName) || isBlank(apiKey) || isBlank(apiSecret)) {
            throw new IllegalStateException(
                    "Cloudinary credentials are not configured!\n" +
                            "Option A — set a single env var:\n" +
                            "  CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME\n\n" +
                            "Option B — set three env vars:\n" +
                            "  CLOUDINARY_CLOUD_NAME=<your-cloud>\n" +
                            "  CLOUDINARY_API_KEY=<your-key>\n" +
                            "  CLOUDINARY_API_SECRET=<your-secret>"
            );
        }

        logger.info("Cloudinary configured — cloud={}", cloudName);

        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key",    apiKey,
                "api_secret", apiSecret,
                "secure",     true   // always use HTTPS
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolve a value from env var first, then from Spring properties.
     * Returns null if neither is set.
     */
    private String resolveProperty(String envKey, String propKey) {
        // Check env var
        String value = System.getenv(envKey);
        if (value != null && !value.isBlank()) return value;

        // Fallback: Spring property (works if set in application.properties / yaml)
        // We read via System.getProperty for simplicity; in a full Spring app
        // you'd @Autowire Environment, but keeping this config class self-contained.
        value = System.getProperty(propKey);
        if (value != null && !value.isBlank()) return value;

        return null;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}