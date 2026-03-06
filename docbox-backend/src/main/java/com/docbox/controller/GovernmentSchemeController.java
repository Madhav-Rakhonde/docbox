package com.docbox.controller;

import com.docbox.dto.ApiResponse;
import com.docbox.entity.GovernmentScheme;
import com.docbox.entity.UserEligibility;
import com.docbox.repository.GovernmentSchemeRepository;
import com.docbox.service.FreeSchemeDiscoveryService;
import com.docbox.util.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

/**
 * Government Schemes REST Controller (NEW)
 */
@RestController
@RequestMapping("/api/schemes")
public class GovernmentSchemeController {

    private static final Logger logger = LoggerFactory.getLogger(GovernmentSchemeController.class);

    @Autowired
    private GovernmentSchemeRepository schemeRepository;

    @Autowired
    private FreeSchemeDiscoveryService discoveryService;

    /**
     * Trigger manual discovery (for testing)
     */
    @PostMapping("/discover-free")
    public ResponseEntity<ApiResponse<Map<String, Object>>> manualDiscover() {
        try {
            Long userId = SecurityUtils.getCurrentUserId();

            List<FreeSchemeDiscoveryService.DiscoveredScheme> schemes =
                    discoveryService.discoverSchemesForUser(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("totalDiscovered", schemes.size());
            response.put("schemes", schemes);

            return ResponseEntity.ok(ApiResponse.success(
                    "Discovered " + schemes.size() + " schemes", response));

        } catch (Exception ex) {
            logger.error("Failed to discover schemes", ex);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Discovery failed: " + ex.getMessage()));
        }
    }

    /**
     * Get eligible schemes (from user_eligibilities table)
     */
    @GetMapping("/eligible")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEligibleSchemes() {
        try {
            Long userId = SecurityUtils.getCurrentUserId();

            // This would use UserEligibilityRepository
            // For now, returning all active schemes
            List<GovernmentScheme> schemes = schemeRepository.findActiveSchemes(LocalDate.now());

            Map<String, Object> response = new HashMap<>();
            response.put("total", schemes.size());
            response.put("schemes", schemes);

            return ResponseEntity.ok(ApiResponse.success("Eligible schemes", response));

        } catch (Exception ex) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to get schemes: " + ex.getMessage()));
        }
    }

    /**
     * Browse all schemes
     */
    @GetMapping("/browse")
    public ResponseEntity<ApiResponse<Map<String, Object>>> browseSchemes(
            @RequestParam(required = false) String category) {
        try {
            List<GovernmentScheme> schemes;

            if (category != null && !category.isEmpty()) {
                schemes = schemeRepository.findByCategoryAndIsActiveTrue(category);
            } else {
                schemes = schemeRepository.findActiveSchemes(LocalDate.now());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("totalSchemes", schemes.size());
            response.put("schemes", schemes);

            return ResponseEntity.ok(ApiResponse.success("Schemes retrieved", response));

        } catch (Exception ex) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to browse schemes: " + ex.getMessage()));
        }
    }

    /**
     * Search schemes
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Map<String, Object>>> searchSchemes(
            @RequestParam String query) {
        try {
            List<GovernmentScheme> schemes = schemeRepository.searchSchemes(query);

            Map<String, Object> response = new HashMap<>();
            response.put("totalResults", schemes.size());
            response.put("schemes", schemes);

            return ResponseEntity.ok(ApiResponse.success("Search results", response));

        } catch (Exception ex) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Search failed: " + ex.getMessage()));
        }
    }

    /**
     * Get scheme by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GovernmentScheme>> getScheme(@PathVariable Long id) {
        try {
            GovernmentScheme scheme = schemeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Scheme not found"));

            return ResponseEntity.ok(ApiResponse.success("Scheme details", scheme));

        } catch (Exception ex) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Failed to get scheme: " + ex.getMessage()));
        }
    }

    /**
     * Get scheme categories
     */
    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<String>>> getCategories() {
        List<String> categories = Arrays.asList(
                "SCHOLARSHIP", "SUBSIDY", "PENSION", "EMPLOYMENT",
                "HOUSING", "HEALTH", "LOAN"
        );

        return ResponseEntity.ok(ApiResponse.success("Categories", categories));
    }
}