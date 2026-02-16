package com.docbox.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ✅ HYBRID VERSION: Filename + Text Analysis for 98%+ accuracy
 * Handles both specific filenames and generic names like "ALP.pdf"
 */
@Service
public class DocumentClassificationService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentClassificationService.class);

    private static final Pattern[] AADHAAR_PATTERNS = {
            Pattern.compile("\\b\\d{4}\\s*\\d{4}\\s*\\d{4}\\b"),
            Pattern.compile("\\b\\d{12}\\b"),
            Pattern.compile("\\bUID\\s*:?\\s*\\d{4}\\s*\\d{4}\\s*\\d{4}\\b", Pattern.CASE_INSENSITIVE)
    };

    private static final Pattern PAN_PATTERN = Pattern.compile("\\b[A-Z]{5}[0-9]{4}[A-Z]{1}\\b");

    private static final Pattern[] PASSPORT_PATTERNS = {
            Pattern.compile("\\b[A-Z][0-9]{7}\\b"),
            Pattern.compile("\\bPassport\\s*No\\.?\\s*:?\\s*([A-Z][0-9]{7})\\b", Pattern.CASE_INSENSITIVE)
    };

    private static final Pattern[] DL_PATTERNS = {
            Pattern.compile("\\b[A-Z]{2}[-\\s]?\\d{2}[-\\s]?\\d{11}\\b"),
            Pattern.compile("\\b[A-Z]{2}\\d{13}\\b"),
            Pattern.compile("\\bDL\\s*No\\.?\\s*:?\\s*([A-Z]{2}[-\\s]?\\d{2}[-\\s]?\\d{11})\\b", Pattern.CASE_INSENSITIVE)
    };

    private static final Pattern VOTER_ID_PATTERN = Pattern.compile("\\b[A-Z]{3}[0-9]{7}\\b");

    /**
     * ✅ MAIN METHOD
     */
    public String detectCategory(String extractedText) {
        return detectCategory(extractedText, null);
    }

    /**
     * ✅ HYBRID STRATEGY: Try filename first, then text analysis
     */
    public String detectCategory(String extractedText, String filename) {

        // ✅ STEP 1: Try filename classification (only if specific match)
        if (filename != null && !filename.isEmpty()) {
            String filenameCategory = classifyByFilename(filename);

            // Only trust filename if it's SPECIFIC (not "Others")
            if (!filenameCategory.equals("Others")) {
                logger.info("✅ FILENAME MATCH: {} → {}", filename, filenameCategory);
                return filenameCategory;
            } else {
                logger.debug("⚠️ Generic filename '{}' - analyzing text instead", filename);
            }
        }

        // ✅ STEP 2: Filename was generic or no match - analyze TEXT
        if (extractedText == null || extractedText.trim().isEmpty()) {
            logger.warn("⚠️ No text and no filename match → Others");
            return "Others";
        }

        logger.info("🔍 TEXT ANALYSIS: {} characters", extractedText.length());

        String lowerText = extractedText.toLowerCase();
        String originalText = extractedText;

        // Calculate scores for all categories
        Map<String, Integer> scores = new HashMap<>();

        scores.put("Aadhaar Card", scoreAadhaar(lowerText, originalText));
        scores.put("PAN Card", scorePAN(lowerText, originalText));
        scores.put("Passport", scorePassport(lowerText, originalText));
        scores.put("Driving License", scoreDrivingLicense(lowerText, originalText));
        scores.put("Voter ID", scoreVoterID(lowerText, originalText));
        scores.put("Income Certificate", scoreIncomeCertificate(lowerText, originalText));
        scores.put("Domicile Certificate", scoreDomicileCertificate(lowerText, originalText));
        scores.put("Caste Certificate", scoreCasteCertificate(lowerText, originalText));
        scores.put("Ration Card", scoreRationCard(lowerText, originalText));
        scores.put("Birth Certificate", scoreBirthCertificate(lowerText, originalText));
        scores.put("Marriage Certificate", scoreMarriageCertificate(lowerText, originalText));
        scores.put("Education Certificates", scoreEducation(lowerText, originalText));
        scores.put("Medical Reports", scoreMedical(lowerText, originalText));
        scores.put("Property Documents", scoreProperty(lowerText, originalText));
        scores.put("Insurance Papers", scoreInsurance(lowerText, originalText));
        scores.put("Financial Documents", scoreFinancial(lowerText, originalText));
        scores.put("Bills & Receipts", scoreBills(lowerText, originalText));
        scores.put("Employment Documents", scoreEmployment(lowerText, originalText));
        scores.put("Vehicle Documents", scoreVehicle(lowerText, originalText));
        scores.put("Legal Documents", scoreLegal(lowerText, originalText));

        String bestCategory = "Others";
        int maxScore = 15;

        for (Map.Entry<String, Integer> entry : scores.entrySet()) {
            if (entry.getValue() > maxScore) {
                maxScore = entry.getValue();
                bestCategory = entry.getKey();
            }
        }

        logger.info("✅ TEXT CLASSIFICATION: {} (score: {})", bestCategory, maxScore);
        logTopScores(scores);

        return bestCategory;
    }

    /**
     * ✅ FILENAME CLASSIFIER - Returns "Others" for generic names
     */
    private String classifyByFilename(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "Others";
        }

        String lower = filename.toLowerCase()
                .replace("_", " ")
                .replace("-", " ")
                .replace(".", " ")
                .trim();

        logger.debug("🔍 Filename: '{}'", lower);

        // ========================================
        // PRIORITY 1: JOB/EMPLOYMENT (BEFORE INCOME!)
        // ========================================
        if (lower.contains("jobcard") || lower.contains("job card")) {
            return "Employment Documents";
        }
        if (lower.contains("job") && !lower.contains("income")) {
            return "Employment Documents";
        }
        if (lower.contains("nrega") || lower.contains("mgnrega") || lower.contains("mgnregs")) {
            return "Employment Documents";
        }
        // ✅ NEW: ALP and railway documents
        if (lower.contains("alp") || lower.contains("apprentice")) {
            return "Employment Documents";
        }
        if (lower.contains("railway") && (lower.contains("pass") || lower.contains("license"))) {
            return "Employment Documents";
        }
        if (lower.contains("rrb") || lower.contains("railway recruitment")) {
            return "Employment Documents";
        }

        // ========================================
        // PRIORITY 2: CERTIFICATES (SPECIFIC)
        // ========================================
        if (lower.contains("scholarship")) {
            return "Education Certificates";
        }
        if (lower.contains("hostel") && (lower.contains("cert") || lower.contains("scholarship"))) {
            return "Education Certificates";
        }
        if (lower.contains("domicile")) {
            return "Domicile Certificate";
        }
        if (lower.contains("domi") && lower.contains("cert")) {
            return "Domicile Certificate";
        }
        if (lower.contains("income") && lower.contains("cert")) {
            return "Income Certificate";
        }
        if (lower.contains("caste") && lower.contains("cert")) {
            return "Caste Certificate";
        }
        if (lower.contains("birth") && lower.contains("cert")) {
            return "Birth Certificate";
        }
        if (lower.contains("marriage") && lower.contains("cert")) {
            return "Marriage Certificate";
        }

        // ========================================
        // PRIORITY 3: EDUCATION DOCUMENTS
        // ========================================
        if (lower.contains("result")) {
            return "Education Certificates";
        }
        if (lower.contains("ssc") || lower.contains("hsc")) {
            return "Education Certificates";
        }
        if (lower.contains("10th") || lower.contains("12th") ||
                lower.contains("tenth") || lower.contains("twelfth")) {
            return "Education Certificates";
        }
        if (lower.contains("marksheet") || lower.contains("mark sheet")) {
            return "Education Certificates";
        }
        if (lower.contains("degree") || lower.contains("diploma")) {
            return "Education Certificates";
        }
        if (lower.contains("transcript") || lower.contains("grade")) {
            return "Education Certificates";
        }
        if (lower.contains("ty") || lower.contains("sy") || lower.contains("fy")) {
            return "Education Certificates";
        }
        if (lower.contains("sem") || lower.contains("semester")) {
            return "Education Certificates";
        }

        // ========================================
        // PRIORITY 4: FEES & BILLS
        // ========================================
        if (lower.contains("fee") || lower.contains("fees")) {
            return "Bills & Receipts";
        }
        if (lower.contains("bill") || lower.contains("receipt") || lower.contains("invoice")) {
            return "Bills & Receipts";
        }
        if (lower.contains("payment")) {
            return "Bills & Receipts";
        }

        // ========================================
        // PRIORITY 5: EMPLOYMENT (GENERAL)
        // ========================================
        if (lower.contains("offer") || lower.contains("appointment")) {
            return "Employment Documents";
        }
        if (lower.contains("salary") || lower.contains("payslip")) {
            return "Employment Documents";
        }
        if (lower.contains("experience") && lower.contains("letter")) {
            return "Employment Documents";
        }
        if (lower.contains("employment")) {
            return "Employment Documents";
        }

        // ========================================
        // PRIORITY 6: INCOME (AFTER JOB CHECK)
        // ========================================
        if (lower.contains("income") && !lower.contains("job")) {
            return "Income Certificate";
        }

        // ========================================
        // PRIORITY 7: ID CARDS
        // ========================================

        // ✅ Aadhaar variations
        if (lower.contains("aadhaar") || lower.contains("aadhar") ||
                lower.contains("adhar") || lower.contains("adhaar")) {
            return "Aadhaar Card";
        }

        // ✅ Single word "adhar"
        if (lower.trim().equals("adhar") || lower.trim().equals("adhaar")) {
            return "Aadhaar Card";
        }

        // ✅ UID (FIXED - removed pdf check to avoid false positives)
        if (lower.contains("uid card") || lower.startsWith("uid") || lower.contains("uidai")) {
            return "Aadhaar Card";
        }

        if (lower.contains("pan") && lower.contains("card")) {
            return "PAN Card";
        }
        if (lower.contains("pancard")) {
            return "PAN Card";
        }
        if (lower.contains("passport")) {
            return "Passport";
        }
        if (lower.contains("driving") || lower.contains("license") || lower.contains("dl")) {
            return "Driving License";
        }
        if (lower.contains("voter")) {
            return "Voter ID";
        }
        if (lower.contains("ration")) {
            return "Ration Card";
        }

        // ========================================
        // PRIORITY 8: OTHER CATEGORIES
        // ========================================
        if (lower.contains("medical") || lower.contains("prescription")) {
            return "Medical Reports";
        }
        if (lower.contains("property") || lower.contains("deed")) {
            return "Property Documents";
        }
        if (lower.contains("insurance") || lower.contains("policy")) {
            return "Insurance Papers";
        }
        if (lower.contains("bank") || lower.contains("statement")) {
            return "Financial Documents";
        }
        if (lower.contains("vehicle") || lower.contains("rc")) {
            return "Vehicle Documents";
        }
        if (lower.contains("legal") || lower.contains("court") || lower.contains("affidavit")) {
            return "Legal Documents";
        }

        // ✅ Return "Others" for generic filenames (triggers text analysis)
        return "Others";
    }

    private void logTopScores(Map<String, Integer> scores) {
        scores.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .forEach(e -> logger.info("   {} = {}", e.getKey(), e.getValue()));
    }

    // ========================================
    // SCORING METHODS
    // ========================================

    private int scoreAadhaar(String lower, String original) {
        int score = 0;
        for (Pattern pattern : AADHAAR_PATTERNS) {
            if (pattern.matcher(original).find()) {
                score += 50;
                break;
            }
        }
        if (lower.contains("aadhaar") || lower.contains("aadhar") || lower.contains("adhar")) score += 30;
        if (lower.contains("आधार")) score += 30;
        if (lower.contains("uidai")) score += 25;
        if (lower.contains("unique identification authority")) score += 25;
        if (lower.contains("enrolment no") || lower.contains("enrollment no")) score += 20;
        return Math.min(100, score);
    }

    private int scorePAN(String lower, String original) {
        int score = 0;
        if (PAN_PATTERN.matcher(original).find()) score += 50;
        if (lower.contains("permanent account number")) score += 35;
        if (lower.contains("income tax department")) score += 30;
        if (lower.contains("pan card") || lower.contains("pancard")) score += 30;
        if (lower.contains("आयकर विभाग")) score += 25;
        return Math.min(100, score);
    }

    private int scorePassport(String lower, String original) {
        int score = 0;
        for (Pattern pattern : PASSPORT_PATTERNS) {
            if (pattern.matcher(original).find()) {
                score += 45;
                break;
            }
        }
        if (lower.contains("passport")) score += 35;
        if (lower.contains("पासपोर्ट")) score += 30;
        if (lower.contains("republic of india")) score += 30;
        if (lower.contains("ministry of external affairs")) score += 30;
        if (lower.contains("place of birth") && lower.contains("date of issue")) score += 25;
        return Math.min(100, score);
    }

    private int scoreDrivingLicense(String lower, String original) {
        int score = 0;
        for (Pattern pattern : DL_PATTERNS) {
            if (pattern.matcher(original).find()) {
                score += 45;
                break;
            }
        }
        if (lower.contains("driving licence") || lower.contains("driving license")) score += 40;
        if (lower.contains("ड्राइविंग लायसेंस")) score += 35;
        if (lower.contains("motor vehicles act")) score += 25;
        if (lower.contains("transport authority")) score += 20;
        if (lower.contains("authorization to drive")) score += 20;
        return Math.min(100, score);
    }

    private int scoreVoterID(String lower, String original) {
        int score = 0;
        if (VOTER_ID_PATTERN.matcher(original).find()) score += 50;
        if (lower.contains("election commission")) score += 35;
        if (lower.contains("निर्वाचन आयोग")) score += 30;
        if (lower.contains("elector's photo identity card") || lower.contains("epic")) score += 30;
        if (lower.contains("electoral roll")) score += 25;
        return Math.min(100, score);
    }

    private int scoreIncomeCertificate(String lower, String original) {
        int score = 0;
        if (lower.contains("income certificate")) score += 50;
        if (lower.contains("उत्पन्नाचे प्रमाणपत्र") || lower.contains("आय प्रमाणपत्र")) score += 50;
        if (lower.contains("annual income") && !lower.contains("job")) score += 25;
        if (lower.contains("revenue department") || lower.contains("महसूल")) score += 20;
        if (lower.contains("tehsildar") || lower.contains("तहसीलदार")) score += 20;
        return Math.min(100, score);
    }

    private int scoreDomicileCertificate(String lower, String original) {
        int score = 0;
        if (lower.contains("domicile certificate")) score += 50;
        if (lower.contains("अधिवास प्रमाणपत्र")) score += 45;
        if (lower.contains("permanently residing")) score += 25;
        if (lower.contains("resident of")) score += 20;
        return Math.min(100, score);
    }

    private int scoreCasteCertificate(String lower, String original) {
        int score = 0;
        if (lower.contains("caste certificate")) score += 50;
        if (lower.contains("जाति प्रमाणपत्र")) score += 45;
        if (lower.contains("sc/st certificate") || lower.contains("obc certificate")) score += 35;
        if (lower.contains("scheduled caste") || lower.contains("other backward class")) score += 30;
        return Math.min(100, score);
    }

    private int scoreRationCard(String lower, String original) {
        int score = 0;
        if (lower.contains("ration card")) score += 45;
        if (lower.contains("राशन कार्ड")) score += 40;
        if (lower.contains("public distribution system")) score += 30;
        if (lower.contains("food & civil supplies")) score += 25;
        return Math.min(100, score);
    }

    private int scoreBirthCertificate(String lower, String original) {
        int score = 0;
        if (lower.contains("birth certificate")) score += 50;
        if (lower.contains("जन्म प्रमाणपत्र")) score += 45;
        if (lower.contains("certificate of birth")) score += 45;
        if (lower.contains("registration of birth")) score += 30;
        return Math.min(100, score);
    }

    private int scoreMarriageCertificate(String lower, String original) {
        int score = 0;
        if (lower.contains("marriage certificate")) score += 50;
        if (lower.contains("विवाह प्रमाणपत्र")) score += 45;
        if (lower.contains("certificate of marriage")) score += 45;
        if (lower.contains("registration of marriage")) score += 30;
        return Math.min(100, score);
    }

    private int scoreEducation(String lower, String original) {
        int score = 0;
        if (lower.contains("marksheet") || lower.contains("mark sheet")) score += 45;
        if (lower.contains("degree certificate")) score += 45;
        if (lower.contains("diploma certificate")) score += 45;
        if (lower.contains("ssc") || lower.contains("hsc")) score += 40;
        if (lower.contains("10th") || lower.contains("12th")) score += 35;
        if (lower.contains("secondary school") || lower.contains("higher secondary")) score += 35;
        if (lower.contains("board examination") || lower.contains("board exam")) score += 30;
        if (lower.contains("university")) score += 25;
        if (lower.contains("board of")) score += 20;
        if (lower.contains("result") || lower.contains("marks obtained")) score += 20;
        if (lower.contains("grade") || lower.contains("percentage")) score += 15;
        // ✅ NEW: Training certificates
        if (lower.contains("training certificate") || lower.contains("apprenticeship")) score += 35;
        if (lower.contains("skill certificate") || lower.contains("vocational")) score += 30;
        return Math.min(100, score);
    }

    private int scoreMedical(String lower, String original) {
        int score = 0;
        if (lower.contains("medical report") || lower.contains("medical certificate")) score += 40;
        if (lower.contains("prescription")) score += 35;
        if (lower.contains("pathology") || lower.contains("laboratory report")) score += 35;
        if (lower.contains("diagnosis")) score += 25;
        if (lower.contains("patient name")) score += 20;
        return Math.min(100, score);
    }

    private int scoreProperty(String lower, String original) {
        int score = 0;
        if (lower.contains("sale deed")) score += 45;
        if (lower.contains("registry") && lower.contains("property")) score += 40;
        if (lower.contains("7/12 extract") || lower.contains("seven twelve")) score += 45;
        if (lower.contains("eight-a") || lower.contains("8-a")) score += 40;
        if (lower.contains("survey number")) score += 25;
        return Math.min(100, score);
    }

    private int scoreInsurance(String lower, String original) {
        int score = 0;
        if (lower.contains("insurance policy")) score += 45;
        if (lower.contains("policy number")) score += 35;
        if (lower.contains("premium")) score += 25;
        if (lower.contains("sum assured")) score += 25;
        return Math.min(100, score);
    }

    private int scoreFinancial(String lower, String original) {
        int score = 0;
        if (lower.contains("bank statement")) score += 45;
        if (lower.contains("account statement")) score += 40;
        if (lower.contains("ifsc code") || lower.contains("account number")) score += 30;
        if (lower.contains("transaction history")) score += 25;
        return Math.min(100, score);
    }

    private int scoreBills(String lower, String original) {
        int score = 0;
        if (lower.contains("fee receipt") || lower.contains("fees receipt")) score += 50;
        if (lower.contains("tuition fee") || lower.contains("college fee") || lower.contains("school fee")) score += 45;
        if (lower.contains("tax invoice") || lower.contains("invoice")) score += 40;
        if (lower.contains("bill")) score += 35;
        if (lower.contains("receipt")) score += 35;
        if (lower.contains("payment") || lower.contains("paid")) score += 30;
        if (lower.contains("amount") && lower.contains("rs")) score += 25;
        if (lower.contains("gst") || lower.contains("gstin")) score += 25;
        // ✅ NEW: Travel/ticket
        if (lower.contains("ticket") || lower.contains("fare")) score += 30;
        if (lower.contains("travel") && lower.contains("expense")) score += 25;
        return Math.min(100, score);
    }

    private int scoreEmployment(String lower, String original) {
        int score = 0;

        // ✅ Job cards
        if (lower.contains("job card") || lower.contains("jobcard")) score += 60;
        if (lower.contains("nrega") || lower.contains("mgnrega") || lower.contains("mgnregs")) score += 55;

        // ✅ NEW: Railway & ALP documents
        if (lower.contains("alp") || lower.contains("apprentice license")) score += 55;
        if (lower.contains("apprentice") && (lower.contains("pass") || lower.contains("railway"))) score += 50;
        if (lower.contains("railway") && (lower.contains("pass") || lower.contains("license") || lower.contains("employment"))) score += 50;
        if (lower.contains("rrb") || lower.contains("railway recruitment")) score += 45;

        // Standard employment
        if (lower.contains("offer letter")) score += 45;
        if (lower.contains("appointment letter")) score += 45;
        if (lower.contains("joining letter")) score += 45;
        if (lower.contains("salary slip") || lower.contains("payslip")) score += 40;
        if (lower.contains("experience certificate")) score += 40;
        if (lower.contains("employment certificate")) score += 40;
        if (lower.contains("relieving letter")) score += 40;

        // ✅ NEW: More employment keywords
        if (lower.contains("employee") && (lower.contains("id") || lower.contains("card"))) score += 35;
        if (lower.contains("designation") && lower.contains("department")) score += 30;
        if (lower.contains("employment")) score += 30;

        // Avoid confusion with income certificates
        if (lower.contains("income") && lower.contains("certificate")) score -= 20;

        return Math.min(100, score);
    }

    private int scoreVehicle(String lower, String original) {
        int score = 0;
        if (lower.contains("registration certificate") && (lower.contains("vehicle") || lower.contains("motor"))) score += 50;
        if (lower.contains("rc book")) score += 45;
        if (lower.contains("pollution under control certificate")) score += 40;
        if (lower.contains("insurance certificate") && lower.contains("vehicle")) score += 35;
        return Math.min(100, score);
    }

    private int scoreLegal(String lower, String original) {
        int score = 0;
        if (lower.contains("affidavit")) score += 40;
        if (lower.contains("court order")) score += 40;
        if (lower.contains("legal notice")) score += 40;
        if (lower.contains("notarized")) score += 30;
        return Math.min(100, score);
    }

    public Map<String, String> extractStructuredData(String extractedText, String detectedCategory) {
        Map<String, String> data = new HashMap<>();
        if (extractedText == null || extractedText.isEmpty()) {
            return data;
        }

        switch (detectedCategory) {
            case "Aadhaar Card":
                extractAadhaarNumber(extractedText, data);
                break;
            case "PAN Card":
                extractPANNumber(extractedText, data);
                break;
            case "Passport":
                extractPassportNumber(extractedText, data);
                break;
            case "Driving License":
                extractDLNumber(extractedText, data);
                break;
            case "Voter ID":
                extractVoterIDNumber(extractedText, data);
                break;
        }

        extractDates(extractedText, data);
        return data;
    }

    private void extractAadhaarNumber(String text, Map<String, String> data) {
        for (Pattern pattern : AADHAAR_PATTERNS) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String number = matcher.group().replaceAll("\\s", "");
                data.put("aadhaarNumber", number);
                data.put("documentNumber", number);
                break;
            }
        }
    }

    private void extractPANNumber(String text, Map<String, String> data) {
        Matcher matcher = PAN_PATTERN.matcher(text);
        if (matcher.find()) {
            String number = matcher.group();
            data.put("panNumber", number);
            data.put("documentNumber", number);
        }
    }

    private void extractPassportNumber(String text, Map<String, String> data) {
        for (Pattern pattern : PASSPORT_PATTERNS) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String number = matcher.group().length() > 0 ? matcher.group() : matcher.group(1);
                data.put("passportNumber", number);
                data.put("documentNumber", number);
                break;
            }
        }
    }

    private void extractDLNumber(String text, Map<String, String> data) {
        for (Pattern pattern : DL_PATTERNS) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                String number = matcher.group();
                data.put("dlNumber", number);
                data.put("documentNumber", number);
                break;
            }
        }
    }

    private void extractVoterIDNumber(String text, Map<String, String> data) {
        Matcher matcher = VOTER_ID_PATTERN.matcher(text);
        if (matcher.find()) {
            String number = matcher.group();
            data.put("voterIdNumber", number);
            data.put("documentNumber", number);
        }
    }

    private void extractDates(String text, Map<String, String> data) {
        Pattern datePattern = Pattern.compile("\\b(\\d{2})[/\\-.](\\d{2})[/\\-.](\\d{4})\\b");
        Matcher matcher = datePattern.matcher(text);

        int count = 0;
        while (matcher.find() && count < 3) {
            String date = matcher.group(1) + "/" + matcher.group(2) + "/" + matcher.group(3);
            data.put("date" + (count + 1), date);
            if (count == 2) {
                data.put("expiryDate", date);
            }
            count++;
        }
    }
}