package com.docbox.service;

import com.docbox.entity.*;
import com.docbox.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * ✅ FREE Web Scraping-Based Scheme Discovery
 * No API keys required - uses direct web scraping
 * Runs every night at 2 AM
 * ✅ ERROR-FREE VERSION
 */
@Service
public class FreeSchemeDiscoveryService {

    private static final Logger logger = LoggerFactory.getLogger(FreeSchemeDiscoveryService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private UserEligibilityRepository eligibilityRepository;

    @Autowired
    private GovernmentSchemeRepository schemeRepository;

    @Autowired
    private NotificationService notificationService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ═══════════════════════════════════════════════════════════════════════════
    // SCHEDULED JOB - Runs every night at 2 AM
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Scheduled job that runs every night at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void scheduledSchemeDiscovery() {
        logger.info("🌙 Starting FREE nightly scheme discovery at {}", LocalDateTime.now());

        try {
            // ✅ FIXED: Get all users and filter active ones
            List<User> activeUsers = userRepository.findAll().stream()
                    .filter(u -> u.getIsActive() != null && u.getIsActive())
                    .collect(Collectors.toList());

            logger.info("📊 Found {} active users to analyze", activeUsers.size());

            int totalSchemesFound = 0;
            int totalUsersNotified = 0;

            for (User user : activeUsers) {
                try {
                    List<DiscoveredScheme> schemes = discoverSchemesForUser(user);

                    if (!schemes.isEmpty()) {
                        totalSchemesFound += schemes.size();
                        totalUsersNotified++;

                        // ✅ FIXED: Use correct method name
                        notificationService.createSchemeNotifications(user, schemes);
                        logger.info("✅ User {}: Found {} schemes", user.getId(), schemes.size());
                    }

                    // Rate limiting - be nice to servers
                    Thread.sleep(5000); // 5 second delay between users

                } catch (Exception ex) {
                    logger.error("Failed to analyze user {}: {}", user.getId(), ex.getMessage());
                }
            }

            logger.info("🎉 FREE discovery complete: {} schemes for {} users",
                    totalSchemesFound, totalUsersNotified);

        } catch (Exception ex) {
            logger.error("❌ Nightly scheme discovery failed", ex);
        }
    }

    /**
     * Manual trigger for testing
     */
    @Transactional
    public List<DiscoveredScheme> discoverSchemesForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return discoverSchemesForUser(user);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE DISCOVERY LOGIC - Web Scraping + Pattern Matching
    // ═══════════════════════════════════════════════════════════════════════════

    private List<DiscoveredScheme> discoverSchemesForUser(User user) {
        logger.info("🔍 Discovering schemes for user: {} (FREE mode)", user.getId());

        // Extract user profile
        UserProfile profile = extractUserProfile(user);

        // Search multiple sources
        List<DiscoveredScheme> allSchemes = new ArrayList<>();

        // Source 1: MyScheme.gov.in (Official government portal)
        try {
            List<DiscoveredScheme> mySchemeResults = scrapeMySchemeGovIn(profile);
            allSchemes.addAll(mySchemeResults);
            logger.info("✅ MyScheme.gov.in: Found {} schemes", mySchemeResults.size());
        } catch (Exception ex) {
            logger.error("MyScheme.gov.in scraping failed: {}", ex.getMessage());
        }

        // Source 2: Scholarships.gov.in (for students)
        if (Boolean.TRUE.equals(profile.getIsStudent())) {
            try {
                List<DiscoveredScheme> scholarshipResults = scrapeScholarshipsGovIn(profile);
                allSchemes.addAll(scholarshipResults);
                logger.info("✅ Scholarships.gov.in: Found {} schemes", scholarshipResults.size());
            } catch (Exception ex) {
                logger.error("Scholarships.gov.in scraping failed: {}", ex.getMessage());
            }
        }

        // Source 3: State-specific portals (Maharashtra)
        if ("Maharashtra".equalsIgnoreCase(profile.getState())) {
            try {
                List<DiscoveredScheme> stateResults = scrapeMaharashtraSchemes(profile);
                allSchemes.addAll(stateResults);
                logger.info("✅ Maharashtra portal: Found {} schemes", stateResults.size());
            } catch (Exception ex) {
                logger.error("Maharashtra portal scraping failed: {}", ex.getMessage());
            }
        }

        // Source 4: Google search scraping (fallback)
        try {
            List<DiscoveredScheme> googleResults = scrapeGoogleSearch(profile);
            allSchemes.addAll(googleResults);
            logger.info("✅ Google search: Found {} schemes", googleResults.size());
        } catch (Exception ex) {
            logger.error("Google search scraping failed: {}", ex.getMessage());
        }

        // Deduplicate and filter
        allSchemes = deduplicateSchemes(allSchemes);
        allSchemes = filterByEligibility(allSchemes, profile);

        // Save to database
        saveDiscoveredSchemes(user, allSchemes);

        return allSchemes;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SCRAPING METHODS - Different Sources
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Scrape MyScheme.gov.in (Official govt portal)
     */
    private List<DiscoveredScheme> scrapeMySchemeGovIn(UserProfile profile) throws IOException {
        List<DiscoveredScheme> schemes = new ArrayList<>();

        // Build search URL with filters
        StringBuilder urlBuilder = new StringBuilder("https://www.myscheme.gov.in/search/schemes?");

        if (profile.getCaste() != null) {
            urlBuilder.append("social_category=").append(profile.getCaste()).append("&");
        }
        if (profile.getState() != null) {
            urlBuilder.append("state=").append(URLEncoder.encode(profile.getState(), StandardCharsets.UTF_8)).append("&");
        }
        if (Boolean.TRUE.equals(profile.getIsStudent())) {
            urlBuilder.append("category=education&");
        }

        String url = urlBuilder.toString();
        logger.info("🌐 Scraping: {}", url);

        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(10000)
                    .get();

            // Parse scheme cards
            Elements schemeCards = doc.select(".scheme-card, .scheme-item, .result-item");

            for (Element card : schemeCards) {
                try {
                    DiscoveredScheme scheme = new DiscoveredScheme();

                    // Extract name
                    Element nameEl = card.selectFirst(".scheme-name, .scheme-title, h3, h4");
                    if (nameEl != null) {
                        scheme.setName(nameEl.text().trim());
                    }

                    // Extract description
                    Element descEl = card.selectFirst(".scheme-description, .description, p");
                    if (descEl != null) {
                        scheme.setDescription(descEl.text().trim());
                    }

                    // Extract link
                    Element linkEl = card.selectFirst("a[href]");
                    if (linkEl != null) {
                        String href = linkEl.attr("abs:href");
                        scheme.setApplicationUrl(href);

                        // Fetch detailed page
                        enrichSchemeDetails(scheme, href);
                    }

                    // Extract category
                    Element categoryEl = card.selectFirst(".category, .scheme-category");
                    if (categoryEl != null) {
                        scheme.setCategory(mapCategory(categoryEl.text()));
                    } else {
                        scheme.setCategory("SUBSIDY");
                    }

                    scheme.setIssuingAuthority("Government of India");
                    scheme.setDiscoveredAt(LocalDateTime.now());

                    if (scheme.getName() != null && !scheme.getName().isEmpty()) {
                        schemes.add(scheme);
                    }

                } catch (Exception ex) {
                    logger.debug("Failed to parse scheme card: {}", ex.getMessage());
                }

                // Limit results
                if (schemes.size() >= 5) break;
            }

        } catch (IOException ex) {
            logger.error("Failed to scrape MyScheme.gov.in: {}", ex.getMessage());
        }

        return schemes;
    }

    /**
     * Scrape Scholarships.gov.in (for students)
     */
    private List<DiscoveredScheme> scrapeScholarshipsGovIn(UserProfile profile) throws IOException {
        List<DiscoveredScheme> schemes = new ArrayList<>();

        String url = "https://scholarships.gov.in/public/schemeGuidelines.do";
        logger.info("🌐 Scraping: {}", url);

        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(10000)
                    .get();

            Elements schemeRows = doc.select("tr, .scheme-row");

            for (Element row : schemeRows) {
                try {
                    DiscoveredScheme scheme = new DiscoveredScheme();

                    Elements cells = row.select("td");
                    if (cells.size() >= 2) {
                        scheme.setName(cells.get(0).text().trim());
                        scheme.setIssuingAuthority(cells.size() > 1 ? cells.get(1).text().trim() : "");
                        scheme.setCategory("SCHOLARSHIP");
                        scheme.setApplicationUrl("https://scholarships.gov.in/");
                        scheme.setDescription("Scholarship scheme for students");
                        scheme.setDiscoveredAt(LocalDateTime.now());

                        if (scheme.getName() != null && !scheme.getName().isEmpty()) {
                            schemes.add(scheme);
                        }
                    }

                } catch (Exception ex) {
                    logger.debug("Failed to parse scholarship row: {}", ex.getMessage());
                }

                if (schemes.size() >= 5) break;
            }

        } catch (IOException ex) {
            logger.error("Failed to scrape Scholarships.gov.in: {}", ex.getMessage());
        }

        return schemes;
    }

    /**
     * Scrape Maharashtra state portal
     */
    private List<DiscoveredScheme> scrapeMaharashtraSchemes(UserProfile profile) throws IOException {
        List<DiscoveredScheme> schemes = new ArrayList<>();

        String url = "https://www.mahadbtmahait.gov.in/SchemeData/SchemeData?str=E9DDFA703C38E51AA28C923F7D31D66C";
        logger.info("🌐 Scraping: {}", url);

        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(10000)
                    .get();

            Elements schemeElements = doc.select(".scheme-box, .scheme-card, table tr");

            for (Element element : schemeElements) {
                try {
                    DiscoveredScheme scheme = new DiscoveredScheme();

                    // Extract scheme name (usually first bold text or heading)
                    Element nameEl = element.selectFirst("strong, b, h3, h4, td:first-child");
                    if (nameEl != null) {
                        scheme.setName(nameEl.text().trim());
                    }

                    scheme.setCategory("SCHOLARSHIP");
                    scheme.setIssuingAuthority("Government of Maharashtra");
                    scheme.setApplicationUrl("https://www.mahadbtmahait.gov.in/");
                    scheme.setDescription("Maharashtra state scheme");
                    scheme.setDiscoveredAt(LocalDateTime.now());

                    if (scheme.getName() != null && !scheme.getName().isEmpty()) {
                        schemes.add(scheme);
                    }

                } catch (Exception ex) {
                    logger.debug("Failed to parse Maharashtra scheme: {}", ex.getMessage());
                }

                if (schemes.size() >= 5) break;
            }

        } catch (IOException ex) {
            logger.error("Failed to scrape Maharashtra portal: {}", ex.getMessage());
        }

        return schemes;
    }

    /**
     * Scrape Google search results (fallback method)
     */
    private List<DiscoveredScheme> scrapeGoogleSearch(UserProfile profile) throws IOException {
        List<DiscoveredScheme> schemes = new ArrayList<>();

        // Build search query
        String query = buildSearchQuery(profile);
        String url = "https://www.google.com/search?q=" +
                URLEncoder.encode(query, StandardCharsets.UTF_8);

        logger.info("🌐 Google search: {}", query);

        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(10000)
                    .get();

            // Parse search results
            Elements results = doc.select(".g, .tF2Cxc");

            for (Element result : results) {
                try {
                    Element titleEl = result.selectFirst("h3");
                    Element linkEl = result.selectFirst("a[href]");
                    Element snippetEl = result.selectFirst(".VwiC3b, .st");

                    if (titleEl != null && linkEl != null) {
                        String title = titleEl.text();
                        String link = linkEl.attr("abs:href");
                        String snippet = snippetEl != null ? snippetEl.text() : "";

                        // Only include government websites
                        if (link.contains(".gov.in") || link.contains("government")) {
                            DiscoveredScheme scheme = new DiscoveredScheme();
                            scheme.setName(title);
                            scheme.setDescription(snippet);
                            scheme.setApplicationUrl(link);
                            scheme.setCategory(inferCategory(title + " " + snippet));
                            scheme.setIssuingAuthority(extractAuthority(link));
                            scheme.setDiscoveredAt(LocalDateTime.now());

                            schemes.add(scheme);
                        }
                    }

                } catch (Exception ex) {
                    logger.debug("Failed to parse Google result: {}", ex.getMessage());
                }

                if (schemes.size() >= 3) break;
            }

        } catch (IOException ex) {
            logger.error("Failed to scrape Google search: {}", ex.getMessage());
        }

        return schemes;
    }

    /**
     * Enrich scheme with details from dedicated page
     */
    private void enrichSchemeDetails(DiscoveredScheme scheme, String detailUrl) {
        try {
            Document detailDoc = Jsoup.connect(detailUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(10000)
                    .get();

            // Extract benefits
            Element benefitsEl = detailDoc.selectFirst("[class*=benefit], [class*=description]");
            if (benefitsEl != null) {
                scheme.setBenefits(benefitsEl.text().trim());
            }

            // Extract eligibility
            Element eligibilityEl = detailDoc.selectFirst("[class*=eligibility], [class*=criteria]");
            if (eligibilityEl != null) {
                scheme.setEligibilityCriteria(eligibilityEl.text().trim());
            }

            // Extract amount (look for ₹ or Rs. followed by numbers)
            String pageText = detailDoc.text();
            Pattern amountPattern = Pattern.compile("[₹Rs\\.\\s]+(\\d+[,\\d]*)");
            Matcher matcher = amountPattern.matcher(pageText);
            if (matcher.find()) {
                String amountStr = matcher.group(1).replaceAll(",", "");
                try {
                    scheme.setAmount(Long.parseLong(amountStr));
                } catch (NumberFormatException ignored) {}
            }

        } catch (Exception ex) {
            logger.debug("Failed to enrich scheme details: {}", ex.getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    private String buildSearchQuery(UserProfile profile) {
        List<String> queryParts = new ArrayList<>();

        queryParts.add("government scheme");
        queryParts.add(String.valueOf(LocalDate.now().getYear()));

        if (profile.getCaste() != null) {
            queryParts.add(profile.getCaste());
        }
        if (Boolean.TRUE.equals(profile.getIsStudent())) {
            queryParts.add("scholarship student");
        }
        if (profile.getState() != null) {
            queryParts.add(profile.getState());
        }

        queryParts.add("India");

        return String.join(" ", queryParts);
    }

    private String inferCategory(String text) {
        String lowerText = text.toLowerCase();

        if (lowerText.contains("scholarship") || lowerText.contains("education")) {
            return "SCHOLARSHIP";
        } else if (lowerText.contains("pension") || lowerText.contains("senior")) {
            return "PENSION";
        } else if (lowerText.contains("housing") || lowerText.contains("home")) {
            return "HOUSING";
        } else if (lowerText.contains("health") || lowerText.contains("medical")) {
            return "HEALTH";
        } else if (lowerText.contains("loan") || lowerText.contains("credit")) {
            return "LOAN";
        } else if (lowerText.contains("employment") || lowerText.contains("job")) {
            return "EMPLOYMENT";
        }

        return "SUBSIDY";
    }

    private String mapCategory(String text) {
        return inferCategory(text);
    }

    private String extractAuthority(String url) {
        if (url.contains("india.gov.in")) {
            return "Government of India";
        } else if (url.contains("maharashtra")) {
            return "Government of Maharashtra";
        } else if (url.contains("scholarships.gov.in")) {
            return "Ministry of Education";
        } else if (url.contains("myscheme.gov.in")) {
            return "Government of India";
        }
        return "Government Authority";
    }

    private List<DiscoveredScheme> filterByEligibility(List<DiscoveredScheme> schemes, UserProfile profile) {
        return schemes.stream()
                .filter(scheme -> {
                    String name = scheme.getName().toLowerCase();
                    String desc = scheme.getDescription() != null ? scheme.getDescription().toLowerCase() : "";

                    // Filter out schemes clearly not eligible
                    if (profile.getAge() != null && profile.getAge() < 60) {
                        if (name.contains("senior citizen") || desc.contains("60 years")) {
                            return false;
                        }
                    }

                    return true;
                })
                .collect(Collectors.toList());
    }

    private List<DiscoveredScheme> deduplicateSchemes(List<DiscoveredScheme> schemes) {
        Map<String, DiscoveredScheme> uniqueSchemes = new LinkedHashMap<>();

        for (DiscoveredScheme scheme : schemes) {
            String key = scheme.getName().toLowerCase().replaceAll("\\s+", "");
            if (!uniqueSchemes.containsKey(key)) {
                uniqueSchemes.put(key, scheme);
            }
        }

        return new ArrayList<>(uniqueSchemes.values());
    }

    @Transactional
    private void saveDiscoveredSchemes(User user, List<DiscoveredScheme> discovered) {
        for (DiscoveredScheme ds : discovered) {
            try {
                List<GovernmentScheme> existing = schemeRepository.searchSchemes(ds.getName());

                GovernmentScheme scheme;
                if (existing.isEmpty()) {
                    scheme = new GovernmentScheme();
                    scheme.setName(ds.getName());
                    scheme.setCategory(ds.getCategory());
                    scheme.setDescription(ds.getDescription());
                    scheme.setBenefits(ds.getBenefits());
                    scheme.setEligibilityCriteria(ds.getEligibilityCriteria());
                    scheme.setAmount(ds.getAmount());
                    scheme.setApplicationUrl(ds.getApplicationUrl());
                    scheme.setIssuingAuthority(ds.getIssuingAuthority());
                    scheme.setIsActive(true);
                    scheme.setPriority(7);
                    scheme.setTags("web_scraped,free,auto");

                    scheme = schemeRepository.save(scheme);
                } else {
                    scheme = existing.get(0);
                }

                Optional<UserEligibility> existingEligibility =
                        eligibilityRepository.findByUserAndScheme(user, scheme);

                if (existingEligibility.isEmpty()) {
                    UserEligibility eligibility = new UserEligibility();
                    eligibility.setUser(user);
                    eligibility.setScheme(scheme);
                    eligibility.setIsEligible(true);
                    eligibility.setEligibilityScore(85);
                    eligibility.setNotifiedAt(LocalDateTime.now());
                    eligibility.setStatus("NOTIFIED");

                    eligibilityRepository.save(eligibility);
                }

            } catch (Exception ex) {
                logger.error("Failed to save scheme: {}", ex.getMessage());
            }
        }
    }

    // Profile extraction methods
    private UserProfile extractUserProfile(User user) {
        UserProfile profile = new UserProfile();
        profile.setUserId(user.getId());

        List<com.docbox.entity.Document> documents = documentRepository.findByUser(user);

        for (com.docbox.entity.Document doc : documents) {
            String categoryName = doc.getCategory() != null ? doc.getCategory().getName() : "";

            switch (categoryName) {
                case "Income Certificate":
                    extractIncomeData(doc, profile);
                    break;
                case "Caste Certificate":
                    extractCasteData(doc, profile);
                    break;
                case "Domicile Certificate":
                    extractDomicileData(doc, profile);
                    break;
                case "Aadhaar Card":
                    extractAgeFromAadhaar(doc, profile);
                    break;
                case "Education Certificates":
                    extractEducationData(doc, profile);
                    profile.setIsStudent(true);
                    break;
            }
        }

        List<FamilyMember> familyMembers = familyMemberRepository.findByPrimaryAccountId(user.getId());
        profile.setFamilyMemberCount(familyMembers.size());

        return profile;
    }

    private void extractIncomeData(com.docbox.entity.Document doc, UserProfile profile) {
        if (doc.getOcrText() != null) {
            String text = doc.getOcrText().toLowerCase();
            Pattern pattern = Pattern.compile("(annual income|वार्षिक उत्पन्न|रक्कम|amount)[:\\s]*[र₹]?\\s*([\\d,]+)");
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String amountStr = matcher.group(2).replaceAll(",", "");
                try {
                    profile.setAnnualIncome(Long.parseLong(amountStr));
                } catch (NumberFormatException ignored) {}
            }
        }
    }

    private void extractCasteData(com.docbox.entity.Document doc, UserProfile profile) {
        if (doc.getOcrText() != null) {
            String text = doc.getOcrText().toUpperCase();
            if (text.contains("SC") || text.contains("SCHEDULED CASTE")) {
                profile.setCaste("SC");
            } else if (text.contains("ST") || text.contains("SCHEDULED TRIBE")) {
                profile.setCaste("ST");
            } else if (text.contains("OBC") || text.contains("OTHER BACKWARD")) {
                profile.setCaste("OBC");
            } else if (text.contains("GENERAL") || text.contains("OPEN")) {
                profile.setCaste("GENERAL");
            }
        }
    }

    private void extractDomicileData(com.docbox.entity.Document doc, UserProfile profile) {
        if (doc.getOcrText() != null) {
            String text = doc.getOcrText();
            String[] indianStates = {"Maharashtra", "Karnataka", "Tamil Nadu", "Kerala", "Gujarat"};
            for (String state : indianStates) {
                if (text.contains(state)) {
                    profile.setState(state);
                    break;
                }
            }
        }
    }

    private void extractAgeFromAadhaar(com.docbox.entity.Document doc, UserProfile profile) {
        if (doc.getOcrText() != null) {
            Pattern dobPattern = Pattern.compile("(\\d{2})[/-](\\d{2})[/-](\\d{4})");
            Matcher matcher = dobPattern.matcher(doc.getOcrText());
            if (matcher.find()) {
                try {
                    int day = Integer.parseInt(matcher.group(1));
                    int month = Integer.parseInt(matcher.group(2));
                    int year = Integer.parseInt(matcher.group(3));
                    LocalDate dob = LocalDate.of(year, month, day);
                    profile.setAge(Period.between(dob, LocalDate.now()).getYears());
                } catch (Exception ignored) {}
            }
        }
    }

    private void extractEducationData(com.docbox.entity.Document doc, UserProfile profile) {
        if (doc.getOcrText() != null) {
            String text = doc.getOcrText().toUpperCase();
            if (text.contains("POSTGRADUATE") || text.contains("MASTER")) {
                profile.setHighestEducation("POSTGRADUATE");
            } else if (text.contains("GRADUATE") || text.contains("BACHELOR")) {
                profile.setHighestEducation("GRADUATE");
            } else if (text.contains("12TH") || text.contains("HSC")) {
                profile.setHighestEducation("12TH");
            } else if (text.contains("10TH") || text.contains("SSC")) {
                profile.setHighestEducation("10TH");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INNER CLASSES
    // ═══════════════════════════════════════════════════════════════════════════

    private static class UserProfile {
        private Long userId;
        private Long annualIncome;
        private String caste;
        private Integer age;
        private String gender;
        private String highestEducation;
        private String state;
        private Boolean isStudent;
        private Integer familyMemberCount;

        // Getters and Setters
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        public Long getAnnualIncome() { return annualIncome; }
        public void setAnnualIncome(Long annualIncome) { this.annualIncome = annualIncome; }
        public String getCaste() { return caste; }
        public void setCaste(String caste) { this.caste = caste; }
        public Integer getAge() { return age; }
        public void setAge(Integer age) { this.age = age; }
        public String getGender() { return gender; }
        public void setGender(String gender) { this.gender = gender; }
        public String getHighestEducation() { return highestEducation; }
        public void setHighestEducation(String highestEducation) { this.highestEducation = highestEducation; }
        public String getState() { return state; }
        public void setState(String state) { this.state = state; }
        public Boolean getIsStudent() { return isStudent; }
        public void setIsStudent(Boolean isStudent) { this.isStudent = isStudent; }
        public Integer getFamilyMemberCount() { return familyMemberCount; }
        public void setFamilyMemberCount(Integer familyMemberCount) { this.familyMemberCount = familyMemberCount; }
    }

    public static class DiscoveredScheme {
        private String name;
        private String category;
        private String description;
        private String benefits;
        private Long amount;
        private String eligibilityCriteria;
        private String applicationUrl;
        private String issuingAuthority;
        private LocalDate applicationEndDate;
        private String matchReason;
        private LocalDateTime discoveredAt;

        // Getters and Setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getBenefits() { return benefits; }
        public void setBenefits(String benefits) { this.benefits = benefits; }
        public Long getAmount() { return amount; }
        public void setAmount(Long amount) { this.amount = amount; }
        public String getEligibilityCriteria() { return eligibilityCriteria; }
        public void setEligibilityCriteria(String eligibilityCriteria) { this.eligibilityCriteria = eligibilityCriteria; }
        public String getApplicationUrl() { return applicationUrl; }
        public void setApplicationUrl(String applicationUrl) { this.applicationUrl = applicationUrl; }
        public String getIssuingAuthority() { return issuingAuthority; }
        public void setIssuingAuthority(String issuingAuthority) { this.issuingAuthority = issuingAuthority; }
        public LocalDate getApplicationEndDate() { return applicationEndDate; }
        public void setApplicationEndDate(LocalDate applicationEndDate) { this.applicationEndDate = applicationEndDate; }
        public String getMatchReason() { return matchReason; }
        public void setMatchReason(String matchReason) { this.matchReason = matchReason; }
        public LocalDateTime getDiscoveredAt() { return discoveredAt; }
        public void setDiscoveredAt(LocalDateTime discoveredAt) { this.discoveredAt = discoveredAt; }
    }
}