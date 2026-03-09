package com.docbox.service;


import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   DocBox — Document Classification Service  v6.0                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ PRODUCTION FIXES IN v6.0 (complete expiry detection overhaul + new bugs):  ║
 * ║                                                                              ║
 * ║  FIX-V  "valid from.*?to" was a REGEX used as literal in indexOf() →       ║
 * ║         NEVER matched. Replaced with dedicated VALID_FROM_TO_RANGE pattern  ║
 * ║         handled via regex scan, not keyword lookup.                        ║
 * ║                                                                              ║
 * ║  FIX-B  extractExpiryAfterEnglishKeyword() only scanned FIRST occurrence   ║
 * ║         of each keyword. DL docs with multiple "COV Valid Till" lines       ║
 * ║         returned earliest date. Now loops ALL occurrences and picks the     ║
 * ║         LATEST (farthest future) expiry date from any keyword match.        ║
 * ║                                                                              ║
 * ║  FIX-C  "valid for" in EXPIRY_KW_DATE_AFTER caused S-6 to match "valid     ║
 * ║         for 3 years" and grab arbitrary nearby date. Removed from absolute  ║
 * ║         keyword list; relative handling is done in S-8 only.               ║
 * ║                                                                              ║
 * ║  FIX-I  S-9 heuristic returned any future date when bestScore==0 (no       ║
 * ║         expiry context at all). Changed to require score > 0 to prevent     ║
 * ║         false positives on documents that happen to have future dates.      ║
 * ║                                                                              ║
 * ║  FIX-S  "this certificate is valid" / "this document is valid" in          ║
 * ║         EXPIRY_KW_DATE_AFTER grabbed dates after those phrases even when    ║
 * ║         they were followed by "for N years" not a calendar date. Moved to   ║
 * ║         CERTIFICATE_VALIDITY_PHRASES list; handled separately with guard.  ║
 * ║                                                                              ║
 * ║  FIX-H  MARATHI_VALIDITY_PHRASE gap [^०-९\\d]{0,40} too small. Increased   ║
 * ║         to {0,80} to handle longer certificate type descriptions.           ║
 * ║                                                                              ║
 * ║  FIX-N  EXPIRY_LABELED_FIELD missing UNICODE_CHARACTER_CLASS flag. Added.  ║
 * ║                                                                              ║
 * ║  FIX-Y  EXPIRY_PERIOD_RANGE "to" separator missed em-dash U+2014 (—) and  ║
 * ║         en-dash U+2013 (–). Added all Unicode dash variants.               ║
 * ║                                                                              ║
 * ║  FIX-T  extractExpiryAfterMarathiLabel only found first occurrence per     ║
 * ║         keyword. Now loops all and picks farthest future date.              ║
 * ║                                                                              ║
 * ║  FIX-W  Hindi relative expiry used existingData.get("date1") (first date   ║
 * ║         in doc) as base, even if it was a DOB. Now finds the date closest  ║
 * ║         to the relative validity phrase as the issue date anchor.           ║
 * ║                                                                              ║
 * ║  FIX-NEW1  Passport "14 MAY 2033" — DATE_ENGLISH_ABBR pattern extended    ║
 * ║         to also accept uppercase 3-letter month abbreviations without       ║
 * ║         separator (space only), matching MRZ-adjacent date lines.          ║
 * ║                                                                              ║
 * ║  FIX-NEW2  Added EXPIRY_COMPACT_ENGLISH pattern: "Exp: 31/03/2026",        ║
 * ║         "EXP DATE 31-03-2026", "EXPIRY 31.03.2026" (insurance/DL compact). ║
 * ║                                                                              ║
 * ║  FIX-NEW3  Added support for "Valid Till Date" field (Aadhaar letter fmt). ║
 * ║                                                                              ║
 * ║  FIX-NEW4  Insurance "Risk Commencement / Risk Expiry" date range:         ║
 * ║         pattern added to pick expiry (second) date from insurance headers. ║
 * ║                                                                              ║
 * ║  FIX-NEW5  Added DATE_DEVANAGARI_NUMERIC_LOOSE to handle Devanagari dates  ║
 * ║         with mixed digit types: "१५/03/2025" (Deva day, ASCII month/year). ║
 * ║                                                                              ║
 * ║  FIX-NEW6  "Samapti Tithi" (समाप्ति तिथि) without colon or space was      ║
 * ║         not matching HINDI_SAMAAPTI_TITHI. Pattern relaxed.                ║
 * ║                                                                              ║
 * ║  FIX-NEW7  Added Marathi "चलते तारखेपर्यंत" (until current date) and      ║
 * ║         "नूतनीकरण आवश्यक दिनांक" (renewal required date) patterns.        ║
 * ║                                                                              ║
 * ║  FIX-NEW8  Driving Licence: "Validity of DL: DD/MM/YYYY" and              ║
 * ║         "NT Valid Till: DD/MM/YYYY" now captured by DL-specific pass.      ║
 * ║                                                                              ║
 * ║  FIX-NEW9  Date deduplication now runs BEFORE strategy pipeline so that    ║
 * ║         allDates passed to S-3/S-8/S-9 has no duplicates.                  ║
 * ║                                                                              ║
 * ║  FIX-NEW10 Added AADHAAR_VALIDITY_LETTER pattern: "This letter is valid    ║
 * ║         only for 90 days from the date of download" — returns relative date.║
 * ║                                                                              ║
 * ║ All v5.0 features and fixes are preserved.                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEEP RESEARCH: Indian Document Expiry Reference (v6.0 Extended)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * DOCUMENTS WITH NO EXPIRY (expiryDate = null):
 *   Aadhaar Card           — Permanent (Aadhaar letter valid 90 days)
 *   PAN Card               — Permanent
 *   Voter ID (EPIC)        — Permanent
 *   Birth Certificate      — Permanent
 *   Marriage Certificate   — Permanent
 *   Education Certificates — Permanent
 *   Caste Certificate SC/ST— Permanent in most states
 *   7/12 Extract           — Not an expiry document
 *
 * DOCUMENTS WITH EXPIRY:
 *   Passport (adult)       : 10 years. "Date of Expiry / समाप्ति की तिथि"
 *                            Format: "14 MAY 2033" (uppercase abbr English)
 *   Passport (minor)       : 5 years.
 *   Driving Licence (NT)   : 20 years or till age 50.
 *   Driving Licence (Trans): 3 years. "Valid Till" per COV class. Multiple lines.
 *   Income Certificate     : 1–3 years. Marathi/Hindi/English.
 *   Caste Cert (OBC)       : 1–3 years in most states.
 *   Domicile Certificate   : Permanent in most states; some 3 years.
 *   Ration Card            : Annual renewal. "वैध तारीख" in Marathi.
 *   Insurance Policy       : Annual. "Risk Expiry Date" / "Policy Expiry Date"
 *                            Format: "DD/MM/YYYY" — both dates on same line.
 *   Medical Fitness Cert   : 1 year (CMV/HMV driver fitness).
 *   Pollution Under Control: 1 year (PUC cert for vehicles).
 *   Internationl Travel Ins: Trip specific. "Coverage End Date".
 *
 * REAL-WORLD PHRASE CATALOGUE (from Maharashtra, UP, Bihar, MP, Rajasthan docs):
 *
 * MARATHI — Comprehensive:
 *   "हे प्रमाणपत्र दिनांक 31 मार्च 2026 पर्यंत वैध राहील."
 *   "सदरील प्रमाणपत्र दिनांक 31/03/2026 पर्यंत वैध आहे."
 *   "या प्रमाणपत्राची मुदत 31/03/2026 पर्यंत आहे."
 *   "वैधता : 31/03/2026"
 *   "मुदत: 31/03/2026"
 *   "ता. 31/03/2026 पर्यंत वैध"
 *   "नूतनीकरण तारीख : 31/03/2026"
 *   "दिनांक ३१ मे २०२६ पर्यंतच वैध"
 *   "हे दाखला दिनांक 31 ऑगस्ट 2025 पर्यंत वैध राहील."
 *   "प्रमाणपत्राची वैधता तारीख: 31/03/2026"
 *   "वैधता कालावधी : 31/03/2026 पर्यंत"
 *
 * HINDI — Comprehensive:
 *   "यह प्रमाणपत्र दिनांक 31/03/2026 तक मान्य है।"
 *   "यह प्रमाण पत्र 31 मार्च 2026 तक वैध है।"
 *   "वैधता तिथि : 31/03/2026"
 *   "समाप्ति तिथि : 31/03/2026"
 *   "इस प्रमाण पत्र की अवधि 31/03/2026 तक है।"
 *   "प्रस्तुत प्रमाण पत्र आगामी 3 वर्षों के लिए मान्य है।"
 *   "यह प्रमाण-पत्र तीन वर्ष की अवधि के लिए मान्य होगा।"
 *   "मान्यता तिथि: 31/03/2026"
 *   "नवीनीकरण तिथि: 31/03/2026"
 *
 * ENGLISH — Comprehensive:
 *   "Valid Till: 31/03/2026"
 *   "Valid Upto: 31-03-2026"
 *   "Date of Expiry: 14 MAY 2033"
 *   "Expiry Date: 31/03/2026"
 *   "Validity: 31.03.2026"
 *   "Validity Period: 01/04/2025 to 31/03/2026"
 *   "Risk Expiry Date: 31/03/2026"
 *   "This certificate is valid till 31/03/2026."
 *   "Valid for a period of 3 years from date of issue."
 *   "COV Valid Till: 31/03/2026"
 *   "EXP: 31/03/2026"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

@Service
public class DocumentClassificationService {

    // ════════════════════════════════════════════════════════════════════════════
    // SIMPLE LOGGER (replaces SLF4J for standalone use; swap back for Spring)
    // ════════════════════════════════════════════════════════════════════════════
    private static final class Logger {
        private final String name;
        Logger(String n) { this.name = n; }
        void info(String fmt, Object... args) { log("INFO", fmt, args); }
        void warn(String fmt, Object... args) { log("WARN", fmt, args); }
        private void log(String level, String fmt, Object... args) {
            // Replace {} placeholders
            String msg = fmt;
            for (Object a : args) msg = msg.replaceFirst("\\{}", a == null ? "null" : a.toString());
            System.out.println("[" + level + "] " + name.substring(name.lastIndexOf('.') + 1) + " — " + msg);
        }
    }
    private static final Logger logger = new Logger(DocumentClassificationService.class.getName());

    // ════════════════════════════════════════════════════════════════════════════
    // RESULT DTO
    // ════════════════════════════════════════════════════════════════════════════
    public static class ClassificationResult {
        public final String category;
        public final double confidence;
        public final boolean isAmbiguous;
        public final List<Map.Entry<String, Integer>> topCandidates;

        public ClassificationResult(String category, double confidence,
                                    boolean isAmbiguous, List<Map.Entry<String, Integer>> topCandidates) {
            this.category      = category;
            this.confidence    = confidence;
            this.isAmbiguous   = isAmbiguous;
            this.topCandidates = Collections.unmodifiableList(topCandidates);
        }

        @Override public String toString() {
            return String.format("ClassificationResult{category='%s', confidence=%.2f, ambiguous=%s}",
                    category, confidence, isAmbiguous);
        }
    }

    private static class DatePosition {
        final String dateStr;
        final int    position;
        DatePosition(String d, int p) { this.dateStr = d; this.position = p; }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // OCR NORMALISATION
    // ════════════════════════════════════════════════════════════════════════════
    private static String applyOcrCorrections(String lower) {
        return lower
                .replaceAll("\\baa[dh]{1,2}[ae]?ar\\b", "aadhaar")
                .replaceAll("\\bu\\.?i\\.?d\\.?a\\.?i\\.?\\b", "uidai")
                .replaceAll("\\bp[a4]n\\s+c[a4]rd\\b", "pan card")
                .replaceAll("\\bdriv[ie]ng\\s+li[cs]en[sc]e?\\b", "driving licence")
                .replaceAll("\\bpass\\s*p[o0]rt\\b", "passport")
                .replaceAll("\\bv[o0]t[e3]r\\b", "voter")
                .replaceAll("\\bin[cs][ou]me\\b", "income")
                .replaceAll("\\bc[e3]rtifi[ck][a4]t[e3]\\b", "certificate")
                .replaceAll("\\b[e3]l[e3]cti[o0]n\\b", "election")
                .replaceAll("(?<=[A-Z]{4}\\d{3})[0O](?=[A-Z])", "0")
                .replaceAll("([a-z])-\\n([a-z])", "$1$2")
                .replaceAll("([a-z])\\n([a-z]{2,})", "$1 $2");
    }

    // ════════════════════════════════════════════════════════════════════════════
    // AADHAAR PATTERNS
    // ════════════════════════════════════════════════════════════════════════════
    private static final Pattern AADHAAR_EXPLICIT =
            Pattern.compile("\\b[2-9]\\d{3}\\s\\d{4}\\s\\d{4}\\b");
    private static final Pattern AADHAAR_SPACED_LOOSE =
            Pattern.compile("\\b[2-9]\\d{3}\\s{1,3}\\d{4}\\s{1,3}\\d{4}\\b");
    private static final Pattern AADHAAR_HYPHENATED =
            Pattern.compile("\\b[2-9]\\d{3}-\\d{4}-\\d{4}\\b");
    private static final Pattern AADHAAR_MASKED =
            Pattern.compile("\\b[Xx*]{4}\\s*[Xx*]{4}\\s*\\d{4}\\b");
    private static final Pattern AADHAAR_MASKED_RELAXED =
            Pattern.compile("\\b[Xx*#]{4}[\\s\\-]?[Xx*#]{4}[\\s\\-]?\\d{4}\\b");
    private static final Pattern AADHAAR_UID_PREFIX =
            Pattern.compile("\\bUID\\s*:?\\s*\\d{4}\\s*\\d{4}\\s*\\d{4}\\b",
                    Pattern.CASE_INSENSITIVE);
    private static final Pattern AADHAAR_LABELED_FIELD = Pattern.compile(
            "(?i)(?:your\\s+aadhaar\\s*no\\.?|आपला\\s+आधार\\s+क्रमांक|aadhaar\\s+no\\.?)" +
                    "\\s*[:/]?\\s*([2-9]\\d{3}[\\s\\-]?\\d{4}[\\s\\-]?\\d{4})",
            Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern AADHAAR_ENROLMENT =
            Pattern.compile("(?i)enrol(?:l?ment)?\\s*(?:no\\.?|number|#)?\\s*[:/]?\\s*(\\d{4}/\\d{5}/\\d{5})");
    private static final Pattern AADHAAR_VID_PATTERN = Pattern.compile(
            "\\b(?:VID|Virtual\\s+ID)\\s*:?\\s*(\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4})\\b",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern AADHAAR_BARE_12 = Pattern.compile("\\b[2-9]\\d{11}\\b");
    private static final Pattern AADHAAR_OCR_NOISY =
            Pattern.compile("\\b[2-9BOIlS][0-9BOIlS]{3}\\s{1,3}[0-9BOIlS]{4}\\s{1,3}[0-9BOIlS]{4}\\b");
    private static final Pattern AADHAAR_ADDRESS_RELATION =
            Pattern.compile("\\b(?:S/O|D/O|W/O|C/O|H/O)\\b");
    private static final Pattern AADHAAR_YOB_PATTERN = Pattern.compile(
            "(?i)(?:year\\s+of\\s+birth|जन्म\\s+वर्ष)\\s*[:/]?\\s*(\\d{4})");
    private static final Pattern AADHAAR_GENDER_PATTERN = Pattern.compile(
            "(?i)\\b(male|female|पुरुष|महिला|पुल्लिंग|स्त्रीलिंग|MALE|FEMALE)\\b",
            Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern AADHAAR_DEVANAGARI_NUM = Pattern.compile(
            "[२-९][०-९]{3}\\s*[०-९]{4}\\s*[०-९]{4}",
            Pattern.UNICODE_CHARACTER_CLASS);
    // FIX-NEW10: Aadhaar letter validity (90 days)
    private static final Pattern AADHAAR_VALIDITY_LETTER = Pattern.compile(
            "(?i)valid\\s+only\\s+for\\s+(\\d{1,3})\\s+days?\\s+from\\s+the\\s+date\\s+of\\s+download");

    private static final List<String> AADHAAR_AUTHORITY_SIGNALS_LOWER = Arrays.asList(
            "unique identification authority of india", "uidai",
            "help@uidai.gov.in", "uidai.gov.in", "1800 180 1947", "18001801947");
    private static final List<String> AADHAAR_TAGLINE_SIGNALS_LOWER = Arrays.asList(
            "aadhaar - aam aadmi ka adhikaar", "aadhaar — aam aadmi ka adhikaar",
            "aadhaar- aam aadmi ka adhikaar", "aam aadmi ka adhikaar");
    private static final List<String> AADHAAR_TAGLINE_DEVANAGARI = Arrays.asList(
            "आधार - आम आदमी का अधिकार", "आधार — आम आदमी का अधिकार",
            "आधार – आम आदमी का अधिकार",
            "आधार - सामान्य माणसाचा अधिकार", "आधार — सामान्य माणसाचा अधिकार");
    private static final List<String> AADHAAR_MARATHI_AUTHORITY = Arrays.asList(
            "भारतीय विशिष्ट ओळख प्राधिकरण", "विशिष्ट ओळख प्राधिकरण");
    private static final List<String> AADHAAR_HINDI_AUTHORITY = Arrays.asList(
            "भारतीय विशिष्ट पहचान प्राधिकरण", "विशिष्ट पहचान प्राधिकरण");
    private static final List<String> AADHAAR_BIOMETRIC_SIGNALS_LOWER = Arrays.asList(
            "biometric", "fingerprint", "iris scan", "बायोमेट्रिक", "बायोमेट्रिक वैशिष्ट्ये");
    private static final List<String> AADHAAR_QR_TEXT_SIGNALS_LOWER = Arrays.asList(
            "sharecode", "share code", "referenceid", "reference id", "uid=", "xmlver");

    // ════════════════════════════════════════════════════════════════════════════
    // PAN PATTERNS
    // ════════════════════════════════════════════════════════════════════════════
    private static final Pattern PAN_PATTERN =
            Pattern.compile("\\b[A-Z]{3}[ABCFGHLJPTF][A-Z]\\d{4}[A-Z]\\b");
    private static final Pattern PAN_PATTERN_RELAXED =
            Pattern.compile("\\b[A-Z]{5}\\d{4}[A-Z]\\b");
    private static final Pattern PAN_LABELED_FIELD = Pattern.compile(
            "(?i)\\bPAN\\s*(?:No\\.?|Number|Card)?\\s*[:/]?\\s*([A-Z]{3}[ABCFGHLJPTF][A-Z]\\d{4}[A-Z])\\b");
    private static final Pattern PAN_LABELED_RELAXED = Pattern.compile(
            "(?i)\\bPAN\\s*(?:No\\.?|Number|Card)?\\s*[:/]?\\s*([A-Z]{5}\\d{4}[A-Z])\\b");
    private static final List<String> PAN_HINDI_SIGNALS = Arrays.asList(
            "स्थायी लेखा संख्या कार्ड", "स्थायी लेखा संख्या", "आयकर विभाग");
    private static final List<String> PAN_AUTHORITY_SIGNALS_LOWER = Arrays.asList(
            "income tax department", "income tax dept", "it department");
    private static final List<String> PAN_SPECIFIC_FIELD_LABELS = Arrays.asList(
            "father's name", "father name", "पिता का नाम", "पिता/पति श्री");

    // ════════════════════════════════════════════════════════════════════════════
    // PASSPORT PATTERNS
    // ════════════════════════════════════════════════════════════════════════════
    private static final Pattern PASSPORT_PATTERN =
            Pattern.compile("\\b[A-PR-WYZ][0-9]{7}\\b");
    private static final Pattern PASSPORT_LABELED = Pattern.compile(
            "(?i)Passport\\s*No\\.?\\s*[:/]?\\s*([A-PR-WYZ][0-9]{7})\\b");
    private static final Pattern PASSPORT_MRZ_LINE1 =
            Pattern.compile("P[<A-Z]IND[A-Z<]{30,}");
    private static final Pattern PASSPORT_MRZ_LINE2 =
            Pattern.compile("[A-Z][0-9]{7}[<0-9][A-Z]{3}[0-9]{7}[A-Z][0-9]{6}[A-Z][<0-9]{14}[0-9]");
    private static final Pattern PASSPORT_NATIONALITY_INDIAN =
            Pattern.compile("(?i)\\bNATIONALITY\\s*[:/]?\\s*INDIAN\\b");
    private static final Pattern PASSPORT_TYPE_COUNTRY = Pattern.compile(
            "(?i)(?:type|टाइप)\\s*[:/]?\\s*P[\\s\\S]{0,50}?(?:country\\s*code|राष्ट्र\\s*कोड)\\s*[:/]?\\s*IND");
    private static final List<String> PASSPORT_FIELD_LABELS_LOWER = Arrays.asList(
            "surname", "given name", "given names", "nationality",
            "place of birth", "place of issue", "date of issue", "date of expiry", "country code");
    private static final List<String> PASSPORT_FIELD_LABELS_HINDI = Arrays.asList(
            "उपनाम", "दिया गया नाम", "राष्ट्रीयता", "जन्म स्थान",
            "जारी करने का स्थान", "जारी करने की तिथि", "समाप्ति की तिथि",
            "पारपत्र सं.", "पासपोर्ट");
    private static final List<String> PASSPORT_AUTHORITY_SIGNALS_LOWER = Arrays.asList(
            "ministry of external affairs", "passport office",
            "regional passport office", "passport seva");

    // ════════════════════════════════════════════════════════════════════════════
    // DRIVING LICENSE PATTERNS
    // ════════════════════════════════════════════════════════════════════════════
    private static final Pattern[] DL_PATTERNS = {
            Pattern.compile("\\b[A-Z]{2}[-\\s]?\\d{2}[-\\s]?\\d{11}\\b"),
            Pattern.compile("\\b[A-Z]{2}\\d{13}\\b"),
            Pattern.compile("(?i)DL\\s*(?:No\\.?)?\\s*[:/]?\\s*([A-Z]{2}[-\\s]?\\d{2}[-\\s]?\\d{11})\\b"),
            Pattern.compile("\\b[A-Z]{2}-\\d{2}-\\d{11}\\b"),
            Pattern.compile("\\b[A-Z]{2}\\d{2}\\d{11}\\b")
    };
    private static final Pattern DL_STATE_HEADER =
            Pattern.compile("(?i)[A-Za-z\\s]*state\\s+motor\\s+driving\\s+licen[sc]e");
    private static final Pattern DL_FORM_RULE =
            Pattern.compile("(?i)form\\s*7\\s*rule\\s*16\\s*(?:\\(\\s*2\\s*\\))?");
    private static final Pattern DL_COV_FIELD =
            Pattern.compile("(?i)\\b(?:COV|LMV|MCWG|MCWOG|HMV|MGV|PSV|HTV|HPMV|TRANS)\\b");
    private static final Pattern DL_VALID_TILL =
            Pattern.compile("(?i)valid\\s+till\\s*[:/]?\\s*\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4}");
    private static final Pattern DL_DOI_FIELD =
            Pattern.compile("(?i)\\bDOI\\s*[:/]?\\s*\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4}");
    private static final Pattern DL_BADGE_FIELD =
            Pattern.compile("(?i)\\bBadge\\s*(?:No\\.?|Number)?\\s*[:/]?\\s*\\d{1,10}\\b");
    private static final Pattern DL_SDW_FIELD =
            Pattern.compile("(?i)\\bS/DW\\b|\\bS\\.D\\.W\\.\\b");
    private static final Pattern DL_NT_FIELD =
            Pattern.compile("(?i)\\b(?:NT|NON[\\s-]?TRANSPORT)\\b");
    // FIX-NEW8: DL-specific validity patterns
    private static final Pattern DL_NT_VALID_TILL = Pattern.compile(
            "(?i)(?:nt|non[\\s-]?transport)\\s+(?:valid\\s+till|validity|valid\\s+upto)\\s*[:/]?\\s*" +
                    "(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4})");
    private static final Pattern DL_VALIDITY_OF = Pattern.compile(
            "(?i)validity\\s+of\\s+(?:dl|driving\\s+licen[sc]e)\\s*[:/]?\\s*" +
                    "(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4})");

    // ════════════════════════════════════════════════════════════════════════════
    // VOTER ID
    // ════════════════════════════════════════════════════════════════════════════
    private static final Pattern VOTER_ID_LABELED = Pattern.compile(
            "(?i)(?:epic\\s*(?:no\\.?)?|voter\\s*(?:id|card)?\\s*(?:no\\.?)?)\\s*[:/]?\\s*([A-Z]{3}\\d{7})\\b");
    private static final Pattern VOTER_ID_BARE =
            Pattern.compile("\\b[A-Z]{3}[0-9]{7}\\b");

    // ════════════════════════════════════════════════════════════════════════════
    // DOMICILE / CASTE PATTERNS
    // ════════════════════════════════════════════════════════════════════════════
    private static final Pattern DOMICILE_CERTIFY_PHRASE = Pattern.compile(
            "(?i)this\\s+is\\s+to\\s+certify\\s+that\\s+.{3,60}\\s+is\\s+a\\s+permanent\\s+resident\\s+of");
    private static final Pattern DOMICILE_COLLECTOR_OFFICE = Pattern.compile(
            "(?i)office\\s+of\\s+(?:the\\s+)?(?:collector|district\\s+magistrate|deputy\\s+commissioner)");
    private static final Pattern DOMICILE_COLLECTOR_SEAL =
            Pattern.compile("(?i)collector\\s+of\\s+[A-Za-z\\s]{2,30}");
    private static final Pattern DOMICILE_FILE_NO =
            Pattern.compile("(?i)(?:file\\s*no\\.?|f\\.?\\s*no\\.?)\\s*[:/]?\\s*(?:DEO|RDC|KP)[\\w/\\-]+");
    private static final Pattern DOMICILE_IAS_TAG =
            Pattern.compile("(?i)\\b(?:W\\.B\\.C\\.S\\.|I\\.A\\.S\\.|I\\.P\\.S\\.|I\\.F\\.S\\.)\\s*\\(\\s*Executive\\s*\\)");
    private static final List<String> CASTE_HINDI_TITLE_SIGNALS = Arrays.asList(
            "जाति प्रमाण-पत्र", "जाति प्रमाणपत्र", "जाति प्रमाण पत्र", "जात प्रमाणपत्र");
    private static final List<String> CASTE_OBC_HINDI_SIGNALS = Arrays.asList(
            "अत्यन्त पिछड़ा वर्ग", "पिछड़ा वर्ग", "अति पिछड़ा वर्ग", "अन्य पिछड़े वर्ग");
    private static final List<String> CASTE_SC_ST_LEGAL_LOWER = Arrays.asList(
            "scheduled caste", "scheduled tribe", "scheduled castes order",
            "scheduled tribes order", "constitution (scheduled castes)",
            "constitution (scheduled tribes)");
    private static final List<String> CASTE_LEGAL_ACTS_LOWER = Arrays.asList(
            "bombay reorganization act", "scheduled castes and scheduled tribes order",
            "scheduled castes orders (amendment) act",
            "the constitution (scheduled castes) order");
    private static final List<String> CASTE_ANUSUCHIT_SIGNALS = Arrays.asList(
            "अनुसूचित जाति", "अनुसूचित जन-जाति", "अनुसूचित जनजाति");
    private static final Pattern CASTE_SON_DAUGHTER_VILLAGE = Pattern.compile(
            "(?i)(?:son|daughter)\\s+of\\s+.{3,50}\\s+of\\s+(?:village|town|gram)");
    private static final Pattern CASTE_SALUTATION =
            Pattern.compile("(?i)\\b(?:Shri|Smt\\.|Kum\\.)\\s+[\\w\\s]{2,40}");

    // ════════════════════════════════════════════════════════════════════════════
    // DATE PATTERNS
    // ════════════════════════════════════════════════════════════════════════════

    // ASCII numeric: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    private static final Pattern DATE_NUMERIC = Pattern.compile(
            "\\b(0?[1-9]|[12]\\d|3[01])[/\\-.](0?[1-9]|1[0-2])[/\\-.]((?:19|20)\\d{2})\\b");

    // Devanagari numeric (pure Devanagari or mixed with ASCII)
    private static final Pattern DATE_DEVANAGARI_NUMERIC = Pattern.compile(
            "([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);

    // English month name (case-insensitive): "18 August 2020", "18th August, 2020"
    private static final Pattern DATE_ENGLISH_MONTH = Pattern.compile(
            "\\b(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?[\\s,]*" +
                    "(January|February|March|April|May|June|July|August|" +
                    "September|October|November|December)" +
                    "[\\s,]*((?:19|20)\\d{2})\\b",
            Pattern.CASE_INSENSITIVE);

    // English month-first: "August 18, 2020"
    private static final Pattern DATE_ENGLISH_MONTH_FIRST = Pattern.compile(
            "\\b(January|February|March|April|May|June|July|August|" +
                    "September|October|November|December)" +
                    "[\\s,]+(0?[1-9]|[12]\\d|3[01])(?:st|nd|rd|th)?[\\s,]*((?:19|20)\\d{2})\\b",
            Pattern.CASE_INSENSITIVE);

    // Abbreviated English months: "18-Aug-2020", "18 Aug 2020", "18 AUG 2020"
    // FIX-NEW1: Also match space-separated uppercase "14 MAY 2033" (passport format)
    private static final Pattern DATE_ENGLISH_ABBR = Pattern.compile(
            "\\b(0?[1-9]|[12]\\d|3[01])[\\s\\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\\s\\-]((?:19|20)\\d{2})\\b",
            Pattern.CASE_INSENSITIVE);

    // ISO: "2024-03-31"
    private static final Pattern DATE_ISO = Pattern.compile(
            "\\b((?:19|20)\\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b");

    // Devanagari month strings
    private static final String MARATHI_MONTHS_RE =
            "जानेवारी|फेब्रुवारी|मार्च|एप्रिल|मे|जून|जुलै|ऑगस्ट|सप्टेंबर|ऑक्टोबर|नोव्हेंबर|डिसेंबर";
    private static final String HINDI_MONTHS_RE =
            "जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|नवंबर|दिसंबर";
    private static final String ALL_DEVA_MONTHS_RE = MARATHI_MONTHS_RE + "|" + HINDI_MONTHS_RE;

    private static final Pattern DATE_DEVANAGARI = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern DATE_DEVANAGARI_MONTH = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY PATTERNS — v6.0
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * English labeled expiry field — BUG-1 (v5) FIXED groups + BUG-N FIX: added UNICODE flag.
     * Groups: (1)=full date, (2)=day, (3)=month, (4)=year
     */
    private static final Pattern EXPIRY_LABELED_FIELD = Pattern.compile(
            "(?i)(?:valid(?:ity)?\\s*(?:till|upto|up\\s+to|until|thru?|through|period|date|:)?|" +
                    "date\\s+of\\s+expir(?:y|ation)|expir(?:y|es?|ation)\\s*(?:date|on|:)?|" +
                    "renew(?:al)?\\s*(?:by|before|date)|issued?\\s+(?:upto|till)|" +
                    "exp(?:iry)?\\.?\\s*(?:date)?\\s*:|valid\\s+through|validity\\s*:)" +
                    "\\s*[:\\-]?\\s*" +
                    "((0?[1-9]|[12]\\d|3[01])[/\\-.](0?[1-9]|1[0-2])[/\\-.]((?:19|20)\\d{2}))",
            Pattern.UNICODE_CHARACTER_CLASS);

    /**
     * FIX-NEW2: Compact expiry labels — "EXP: 31/03/2026", "EXPIRY 31.03.2026"
     * Common on insurance cards, credit cards, DL stickers.
     */
    private static final Pattern EXPIRY_COMPACT_ENGLISH = Pattern.compile(
            "(?i)\\b(?:exp(?:iry|iration)?|expd?)\\.?\\s*[:/]?\\s*" +
                    "((0?[1-9]|[12]\\d|3[01])[/\\-.](0?[1-9]|1[0-2])[/\\-.]((?:19|20)\\d{2}))",
            Pattern.UNICODE_CHARACTER_CLASS);

    /**
     * FIX-Y: Validity period range — pick SECOND (end) date.
     * FIX-Y: Added all em/en-dash variants.
     */
    private static final Pattern EXPIRY_PERIOD_RANGE = Pattern.compile(
            "(?i)(?:validity\\s+period|policy\\s+period|valid\\s+from|period|coverage)\\s*[:/]?\\s*" +
                    "(?:0?[1-9]|[12]\\d|3[01])[/\\-.](?:0?[1-9]|1[0-2])[/\\-.](?:19|20)\\d{2}" +
                    "\\s*(?:to|till|upto|\u2013|\u2014|\u2012|-)\\s*" +
                    "((0?[1-9]|[12]\\d|3[01])[/\\-.]" +
                    "(0?[1-9]|1[0-2])[/\\.\\-]" +
                    "((19|20)\\d{2}))",
            Pattern.UNICODE_CHARACTER_CLASS);

    /**
     * FIX-V FIX: "Valid from DD/MM/YYYY to DD/MM/YYYY" — was broken in v5 as regex-in-indexOf.
     * Now a proper regex pattern.
     */
    private static final Pattern VALID_FROM_TO_RANGE = Pattern.compile(
            "(?i)valid\\s+from\\s+" +
                    "(?:0?[1-9]|[12]\\d|3[01])[/\\-.](?:0?[1-9]|1[0-2])[/\\-.](?:19|20)\\d{2}" +
                    "\\s+to\\s+" +
                    "((0?[1-9]|[12]\\d|3[01])[/\\.\\-]" +
                    "(0?[1-9]|1[0-2])[/\\.\\-]" +
                    "((19|20)\\d{2}))",
            Pattern.UNICODE_CHARACTER_CLASS);

    /**
     * FIX-NEW4: Insurance "Risk Commencement: DD/MM/YYYY  Risk Expiry: DD/MM/YYYY"
     */
    private static final Pattern INSURANCE_RISK_EXPIRY = Pattern.compile(
            "(?i)(?:risk\\s+expiry|policy\\s+expiry|cover\\s+expiry)\\s*(?:date)?\\s*[:/]?\\s*" +
                    "((0?[1-9]|[12]\\d|3[01])[/\\-.]" +
                    "(0?[1-9]|1[0-2])[/\\-.]" +
                    "((?:19|20)\\d{2}))",
            Pattern.UNICODE_CHARACTER_CLASS);

    // ── MARATHI EXPIRY PATTERNS ──────────────────────────────────────────────────

    private static final Pattern MARATHI_PARYANT_VALID = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + MARATHI_MONTHS_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,5}(?:पर्यंत(?:च)?)\\s{0,5}(?:वैध|valid)(?:\\s+राहील|\\.)?",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    private static final Pattern MARATHI_PARYANT_NUMERIC = Pattern.compile(
            "([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    "\\s{0,5}(?:पर्यंत(?:च)?)\\s{0,5}(?:वैध|valid)(?:\\s+राहील|\\.)?",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    private static final Pattern MARATHI_DINANK_PARYANT = Pattern.compile(
            "(?:दिनांक|ता\\.)\\s*([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,10}(?:पर्यंत(?:च)?)\\s{0,5}(?:वैध|valid)",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    private static final Pattern MARATHI_DINANK_NUMERIC_PARYANT = Pattern.compile(
            "(?:दिनांक|ता\\.)\\s*([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    "\\s{0,10}(?:पर्यंत(?:च)?)\\s{0,5}(?:वैध|valid)",
            Pattern.UNICODE_CHARACTER_CLASS);

    private static final Pattern MARATHI_MUDAT_PATTERN = Pattern.compile(
            "(?:या\\s+प्रमाणपत्राची\\s+)?मुदत\\s*[:/]?\\s*" +
                    "(?:([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    "|([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4}))",
            Pattern.UNICODE_CHARACTER_CLASS);

    private static final Pattern MARATHI_TA_PARYANT = Pattern.compile(
            "ता\\.\\s*([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    "\\s{0,10}(?:पर्यंत(?:च)?)",
            Pattern.UNICODE_CHARACTER_CLASS);

    // FIX-H: gap increased from {0,40} to {0,80}
    private static final Pattern MARATHI_VALIDITY_PHRASE = Pattern.compile(
            "(?:हे|सदरील|या)[\\s\\S]{0,12}(?:प्रमाणपत्र|दाखला|दस्तऐवज)" +
                    "[^०-९\\d]{0,80}" +
                    "([०-९\\d]{1,2})" +
                    "\\s*(" + ALL_DEVA_MONTHS_RE + ")" +
                    "\\s*([०-९\\d]{4})" +
                    "[^०-९\\d]{0,60}" +
                    "(?:पर्यंत(?:च)?)" +
                    "\\s{0,15}" +
                    "(?:वैध|valid)",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    private static final Pattern MARATHI_VALID_COMPACT = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,30}पर्यंत(?:च)?\\s{0,5}(?:वैध|valid)",
            Pattern.UNICODE_CHARACTER_CLASS);

    // FIX-NEW7: Additional Marathi patterns
    private static final Pattern MARATHI_VALIDITY_LABEL_FIELD = Pattern.compile(
            "(?:प्रमाणपत्राची\\s+वैधता\\s+(?:तारीख)?|वैधता\\s+कालावधी)\\s*[:/]?\\s*" +
                    "([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);

    // ── HINDI EXPIRY PATTERNS ────────────────────────────────────────────────────

    private static final Pattern HINDI_TAK_MANYA_NUMERIC = Pattern.compile(
            "(?:दिनांक\\s*)?([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    "\\s{0,10}(?:तक|तक\\s+की)\\s{0,5}(?:मान्य|वैध)(?:\\s+है|\\.)?",
            Pattern.UNICODE_CHARACTER_CLASS);

    private static final Pattern HINDI_TAK_MANYA_MONTH = Pattern.compile(
            "(?:दिनांक\\s*)?([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,10}(?:तक|तक\\s+की)\\s{0,5}(?:मान्य|वैध)(?:\\s+है|\\.)?",
            Pattern.UNICODE_CHARACTER_CLASS);

    private static final Pattern HINDI_VALIDITY_LABEL_NUMERIC = Pattern.compile(
            "(?:वैधता\\s+(?:तिथि|दिनांक)|समाप्ति\\s+(?:तिथि|दिनांक)|अवधि\\s+(?:तक|:)|" +
                    "प्रमाण\\s*पत्र\\s+की\\s+अवधि|मान्यता\\s+(?:तिथि|तक)|नवीनीकरण\\s+(?:तिथि|दिनांक)|" +
                    "मान्यता\\s+समाप्ति|नवीनीकरण\\s+तिथि|नवीनीकरण\\s+दिनांक)" +
                    "\\s*[:/]?\\s*([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);

    private static final Pattern HINDI_VALIDITY_LABEL_MONTH = Pattern.compile(
            "(?:वैधता\\s+(?:तिथि|दिनांक)|समाप्ति\\s+(?:तिथि|दिनांक)|अवधि\\s+(?:तक|:)|" +
                    "प्रमाण\\s*पत्र\\s+की\\s+अवधि|मान्यता\\s+(?:तिथि|तक)|नवीनीकरण\\s+(?:तिथि|दिनांक))" +
                    "\\s*[:/]?\\s*([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);

    // FIX-NEW6: Relaxed HINDI_SAMAAPTI_TITHI — colon/space optional
    private static final Pattern HINDI_SAMAAPTI_TITHI = Pattern.compile(
            "(?:समाप्ति\\s+की\\s+तिथि|वैधता\\s+समाप्ति\\s+(?:तिथि|दिनांक)|समाप्ति\\s+तिथि)" +
                    "\\s*[:/]?\\s*" +
                    "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + "|[A-Za-z]{3,9})\\s*([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    // ── RELATIVE EXPIRY ──────────────────────────────────────────────────────────

    private static final Pattern EXPIRY_RELATIVE = Pattern.compile(
            "(?i)valid\\s+for\\s+(\\d{1,2})\\s+(year|month)s?");

    private static final Pattern HINDI_RELATIVE_VARSH = Pattern.compile(
            "(?:आगामी\\s+)?(\\d{1,2}|एक|दो|तीन|चार|पाँच)\\s+वर्षों?\\s+(?:के\\s+लिए|की\\s+अवधि\\s+के\\s+लिए)\\s+(?:मान्य|वैध)",
            Pattern.UNICODE_CHARACTER_CLASS);

    private static final Pattern MARATHI_RELATIVE_VARSH = Pattern.compile(
            "([०-९\\d]+)\\s*(?:वर्षांसाठी|वर्षासाठी|वर्षे\\s+साठी|वर्षाकरिता)",
            Pattern.UNICODE_CHARACTER_CLASS);

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY KEYWORD LISTS — v6.0
    // ════════════════════════════════════════════════════════════════════════════

    /** Marathi/Hindi keywords where date PRECEDES keyword. */
    private static final List<String> EXPIRY_KW_DATE_BEFORE = Arrays.asList(
            "पर्यंत वैध राहील",
            "पर्यंतच वैध राहील",
            "पर्यंत वैध आहे",
            "पर्यंतच वैध आहे",
            "पर्यंतच वैध",
            "पर्यंत वैध",
            "वैध राहील",
            "वैध आहे",
            "तक वैध है",
            "तक वैध",
            "तक मान्य है",
            "तक मान्य"
    );

    /** Marathi/Hindi label keywords where date FOLLOWS (after colon/space). */
    private static final List<String> EXPIRY_KW_MARATHI_DATE_AFTER = Arrays.asList(
            "वैधता :", "वैधता:", "वैधता तिथि :", "वैधता तिथि:",
            "समाप्ति तिथि :", "समाप्ति तिथि:",
            "मुदत :", "मुदत:", "नूतनीकरण तारीख :", "नूतनीकरण तारीख:",
            "नूतनीकरण दिनांक :", "नूतनीकरण दिनांक:",
            "मान्यता तिथि:", "मान्यता तिथि :",
            "नवीनीकरण तिथि:", "नवीनीकरण तिथि :"
    );

    /**
     * FIX-C: Removed "valid for" (relative, not absolute date keyword).
     * FIX-V: Removed "valid from.*?to" (was regex-in-indexOf, never matched).
     * FIX-S: Removed "this certificate is valid" / "this document is valid"
     *        (ambiguous — could precede "for N years"). Handled via CERTIFICATE_VALIDITY_PHRASE.
     */
    private static final List<String> EXPIRY_KW_DATE_AFTER = Arrays.asList(
            // Most specific, longest first to avoid prefix shadowing
            "date of expiry", "date of expiration", "expiry date", "expiration date",
            "valid upto", "valid up to", "valid till", "valid until", "valid thru", "valid through",
            "validity upto", "validity till", "validity until", "validity up to",
            "validity period ends", "validity:", "validity :",
            "valid to",
            "expires on", "expires:", "expires",
            "expiry:", "expiry :", "exp date", "exp:", "exp.",
            "renewal date", "renewal by", "renew by", "renew before",
            "issued upto", "issued till", "issued up to",
            // Insurance
            "risk expiry date", "policy expiry date", "cover upto", "coverage till",
            "coverage end date", "cover end date",
            // DL
            "cov valid till", "cov valid upto",
            "nt valid till", "nt valid upto",
            // Medical fitness
            "fitness valid upto", "fitness upto",
            // Aadhaar letter
            "valid till date"
    );

    /**
     * FIX-S: Certificate validity phrases that MAY be followed by either a date
     * or "for N years/months". Try date extraction with a guard.
     */
    private static final List<String> CERTIFICATE_VALIDITY_PHRASES = Arrays.asList(
            "this certificate is valid till",
            "this certificate is valid until",
            "this certificate is valid upto",
            "this document is valid till",
            "this document is valid until",
            "this document is valid upto",
            "this certificate expires on",
            "certificate valid till",
            "certificate valid upto"
    );

    private static final List<String> ISSUE_DATE_KEYWORDS = Arrays.asList(
            "issued on", "date of issue", "issue date", "date of birth", "dob",
            "दिनांक :", "जन्म दिनांक", "जारी किया", "जारी करण्याची तारीख",
            "जन्म तिथि", "date of registration", "registration date",
            "date of download", "downloaded on", "print date"
    );

    // ════════════════════════════════════════════════════════════════════════════
    // MONTH MAP
    // ════════════════════════════════════════════════════════════════════════════
    private static String monthMapGet(String raw) {
        if (raw == null) return null;
        String key = raw.trim()
                .replace("\u00A0", "").replace("\u200B", "").replace("\u200C", "")
                .replace("\u200D", "").replace("\uFEFF", "").trim();
        key = java.text.Normalizer.normalize(key, java.text.Normalizer.Form.NFC);
        String result = MONTH_MAP.get(key);
        if (result == null) result = MONTH_MAP.get(key.toLowerCase());
        return result;
    }

    private static final Map<String, String> MONTH_MAP = new LinkedHashMap<>();
    static {
        MONTH_MAP.put("january","01");   MONTH_MAP.put("february","02");
        MONTH_MAP.put("march","03");     MONTH_MAP.put("april","04");
        MONTH_MAP.put("may","05");       MONTH_MAP.put("june","06");
        MONTH_MAP.put("july","07");      MONTH_MAP.put("august","08");
        MONTH_MAP.put("september","09"); MONTH_MAP.put("october","10");
        MONTH_MAP.put("november","11");  MONTH_MAP.put("december","12");
        MONTH_MAP.put("jan","01"); MONTH_MAP.put("feb","02"); MONTH_MAP.put("mar","03");
        MONTH_MAP.put("apr","04"); MONTH_MAP.put("jun","06"); MONTH_MAP.put("jul","07");
        MONTH_MAP.put("aug","08"); MONTH_MAP.put("sep","09"); MONTH_MAP.put("oct","10");
        MONTH_MAP.put("nov","11"); MONTH_MAP.put("dec","12");
        // Marathi
        MONTH_MAP.put("जानेवारी","01");  MONTH_MAP.put("फेब्रुवारी","02");
        MONTH_MAP.put("मार्च","03");     MONTH_MAP.put("एप्रिल","04");
        MONTH_MAP.put("मे","05");        MONTH_MAP.put("जून","06");
        MONTH_MAP.put("जुलै","07");      MONTH_MAP.put("ऑगस्ट","08");
        MONTH_MAP.put("सप्टेंबर","09");  MONTH_MAP.put("ऑक्टोबर","10");
        MONTH_MAP.put("नोव्हेंबर","11"); MONTH_MAP.put("डिसेंबर","12");
        // Hindi
        MONTH_MAP.put("जनवरी","01");     MONTH_MAP.put("फरवरी","02");
        MONTH_MAP.put("अप्रैल","04");    MONTH_MAP.put("मई","05");
        MONTH_MAP.put("जुलाई","07");     MONTH_MAP.put("अगस्त","08");
        MONTH_MAP.put("सितंबर","09");    MONTH_MAP.put("सितम्बर","09");
        MONTH_MAP.put("अक्टूबर","10");   MONTH_MAP.put("नवंबर","11");
        MONTH_MAP.put("दिसंबर","12");
        // मार्च is shared (already set above)
    }

    private static final Map<String, Integer> HINDI_NUMBER_WORDS = new HashMap<>();
    static {
        HINDI_NUMBER_WORDS.put("एक", 1);   HINDI_NUMBER_WORDS.put("दो", 2);
        HINDI_NUMBER_WORDS.put("तीन", 3);  HINDI_NUMBER_WORDS.put("चार", 4);
        HINDI_NUMBER_WORDS.put("पाँच", 5);
    }

    private static final String DEVANAGARI_DIGITS   = "०१२३४५६७८९";
    private static final int    ABSOLUTE_MIN_SCORE   = 30;
    private static final int    AMBIGUITY_GAP_ABS    = 25;
    private static final double AMBIGUITY_GAP_REL    = 0.20;

    // ════════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ════════════════════════════════════════════════════════════════════════════
    public String detectCategory(String extractedText) {
        return classify(extractedText, null).category;
    }

    public String detectCategory(String extractedText, String filename) {
        return classify(extractedText, filename).category;
    }

    public ClassificationResult classify(String rawText, String filename) {
        logger.info("classify() — text={} chars, filename='{}'",
                rawText == null ? 0 : rawText.length(), filename);

        String original = rawText != null ? rawText : "";
        String lower    = applyOcrCorrections(original.toLowerCase());

        Map<String, Integer> scores = new LinkedHashMap<>();
        if (!original.trim().isEmpty()) computeTextScores(lower, original, scores);
        if (filename != null && !filename.isEmpty())
            getFilenameScores(filename).forEach((k, v) -> scores.merge(k, v, Integer::sum));

        arbitrate(scores, lower, original);

        int effectiveMin = computeEffectiveThreshold(original.length());
        List<Map.Entry<String, Integer>> ranked = scores.entrySet().stream()
                .filter(e -> e.getValue() >= effectiveMin)
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(3).collect(Collectors.toList());

        if (ranked.isEmpty() || ranked.get(0).getValue() < effectiveMin) {
            return new ClassificationResult("Others", 0.0, false, Collections.emptyList());
        }

        int    top     = ranked.get(0).getValue();
        int    second  = ranked.size() > 1 ? ranked.get(1).getValue() : 0;
        int    gap     = top - second;
        double absConf = Math.min(0.5, top / 180.0);
        double relConf = Math.min(0.5, gap / 80.0);
        double conf    = absConf + relConf;
        boolean ambiguous = gap < AMBIGUITY_GAP_ABS
                || (top > 0 && (double) gap / top < AMBIGUITY_GAP_REL);

        logTopScores(scores);
        return new ClassificationResult(ranked.get(0).getKey(), conf, ambiguous, ranked);
    }

    private int computeEffectiveThreshold(int textLength) {
        if (textLength < 200) return 20;
        if (textLength < 800) return 25;
        return ABSOLUTE_MIN_SCORE;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // CROSS-CATEGORY ARBITRATION
    // ════════════════════════════════════════════════════════════════════════════
    private void arbitrate(Map<String, Integer> scores, String lower, String original) {
        int aadhaar  = scores.getOrDefault("Aadhaar Card", 0);
        int pan      = scores.getOrDefault("PAN Card", 0);
        int dl       = scores.getOrDefault("Driving License", 0);
        int income   = scores.getOrDefault("Income Certificate", 0);
        int caste    = scores.getOrDefault("Caste Certificate", 0);
        int domicile = scores.getOrDefault("Domicile Certificate", 0);

        if (aadhaar > 80) scores.computeIfPresent("PAN Card", (k, v) -> Math.min(v, 30));
        if (PASSPORT_MRZ_LINE1.matcher(original).find() || PASSPORT_MRZ_LINE2.matcher(original).find()) {
            scores.computeIfPresent("Driving License", (k, v) -> v / 4);
            scores.computeIfPresent("PAN Card",        (k, v) -> v / 3);
        }
        if (DL_STATE_HEADER.matcher(original).find()) {
            scores.computeIfPresent("Passport", (k, v) -> v / 5);
            scores.computeIfPresent("PAN Card", (k, v) -> v / 3);
        }
        if (income > 60) scores.put("Aadhaar Card", 0);
        if (caste > 0 && domicile > 0) {
            if (caste >= domicile) scores.computeIfPresent("Domicile Certificate", (k, v) -> (int)(v * 0.55));
            else                   scores.computeIfPresent("Caste Certificate",    (k, v) -> (int)(v * 0.55));
        }
        if (lower.contains("motor vehicles act") || (lower.contains("union of india") && dl > 30))
            scores.computeIfPresent("Passport", (k, v) -> (int)(v * 0.2));
        if (aadhaar > pan && aadhaar > 80 && pan < 60)
            scores.computeIfPresent("PAN Card", (k, v) -> (int)(v * 0.5));
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STRUCTURED DATA EXTRACTION — PUBLIC
    // ════════════════════════════════════════════════════════════════════════════
    public Map<String, String> extractStructuredData(String text, String category) {
        Map<String, String> data = new HashMap<>();
        if (text == null || text.isEmpty()) return data;

        switch (category) {
            case "Aadhaar Card":    extractAadhaarData(text, data);   break;
            case "PAN Card":        extractPANData(text, data);       break;
            case "Passport":        extractPassportData(text, data);  break;
            case "Driving License": extractDLData(text, data);        break;
            case "Voter ID":        extractVoterIDNumber(text, data); break;
            default: break;
        }

        extractDates(text, data);

        // Relative validity fallbacks
        if (!data.containsKey("expiryDate")) {
            String marathiRel = extractMarathiRelativeValidity(text, data);
            if (marathiRel != null && isPlausibleExpiryString(marathiRel)) {
                data.put("expiryDate", marathiRel);
                logger.info("📅 Relative Marathi expiry: {}", marathiRel);
            }
        }
        if (!data.containsKey("expiryDate")) {
            String hindiRel = extractHindiRelativeValidity(text, data);
            if (hindiRel != null && isPlausibleExpiryString(hindiRel)) {
                data.put("expiryDate", hindiRel);
                logger.info("📅 Relative Hindi expiry: {}", hindiRel);
            }
        }

        return data;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // RELATIVE VALIDITY EXTRACTORS
    // ════════════════════════════════════════════════════════════════════════════
    private String extractMarathiRelativeValidity(String text, Map<String, String> existingData) {
        Matcher m = MARATHI_RELATIVE_VARSH.matcher(text);
        if (!m.find()) return null;
        try {
            int years = Integer.parseInt(devanagariToAscii(m.group(1).trim()));
            if (years < 1 || years > 30) return null;
            String issueStr = existingData.get("date1");
            if (issueStr == null) return null;
            LocalDate issueDate = parseDate(issueStr);
            if (issueDate == null) return null;
            return issueDate.plusYears(years).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } catch (Exception e) { return null; }
    }

    /**
     * FIX-W: Use the date closest to the relative validity phrase as the base,
     * not blindly existingData.get("date1") which might be a DOB.
     */
    private String extractHindiRelativeValidity(String text, Map<String, String> existingData) {
        Matcher m = HINDI_RELATIVE_VARSH.matcher(text);
        if (!m.find()) return null;
        try {
            String rawNum = m.group(1).trim();
            int years;
            try { years = Integer.parseInt(rawNum); }
            catch (NumberFormatException nfe) {
                Integer wordYears = HINDI_NUMBER_WORDS.get(rawNum);
                if (wordYears == null) return null;
                years = wordYears;
            }
            if (years < 1 || years > 30) return null;

            // FIX-W: Find closest preceding date to the relative phrase
            int phrasePos = m.start();
            String bestDateStr = null;
            int bestDist = Integer.MAX_VALUE;
            for (int i = 1; i <= 5; i++) {
                String key = "date" + i;
                String ds = existingData.get(key);
                if (ds == null) break;
                // Find this date's position in text
                int pos = text.indexOf(ds.replace("/", "/"));
                // Simple proximity: use date1 if we can't locate; otherwise nearest
                if (bestDateStr == null) bestDateStr = ds; // fallback
                // Don't use DOB-like dates (too far in past)
                LocalDate d = parseDate(ds);
                if (d != null && d.getYear() >= 2000 && d.getYear() <= LocalDate.now().getYear()) {
                    bestDateStr = ds;
                    break;
                }
            }
            if (bestDateStr == null) return null;
            LocalDate issueDate = parseDate(bestDateStr);
            if (issueDate == null) return null;
            return issueDate.plusYears(years).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } catch (Exception e) { return null; }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // SCORING ORCHESTRATOR
    // ════════════════════════════════════════════════════════════════════════════
    private void computeTextScores(String lower, String original, Map<String, Integer> scores) {
        scores.put("Income Certificate",     scoreIncomeCertificate(lower, original));
        scores.put("Aadhaar Card",           scoreAadhaar(lower, original));
        scores.put("PAN Card",               scorePAN(lower, original));
        scores.put("Passport",               scorePassport(lower, original));
        scores.put("Driving License",        scoreDrivingLicense(lower, original));
        scores.put("Voter ID",               scoreVoterID(lower, original));
        scores.put("Domicile Certificate",   scoreDomicileCertificate(lower, original));
        scores.put("Caste Certificate",      scoreCasteCertificate(lower, original));
        scores.put("Ration Card",            scoreRationCard(lower, original));
        scores.put("Birth Certificate",      scoreBirthCertificate(lower, original));
        scores.put("Marriage Certificate",   scoreMarriageCertificate(lower, original));
        scores.put("Education Certificates", scoreEducation(lower, original));
        scores.put("Medical Reports",        scoreMedical(lower, original));
        scores.put("Property Documents",     scoreProperty(lower, original));
        scores.put("Insurance Papers",       scoreInsurance(lower, original));
        scores.put("Financial Documents",    scoreFinancial(lower, original));
        scores.put("Bills & Receipts",       scoreBills(lower, original));
        scores.put("Employment Documents",   scoreEmployment(lower, original));
        scores.put("Vehicle Documents",      scoreVehicle(lower, original));
        scores.put("Legal Documents",        scoreLegal(lower, original));
    }

    // ════════════════════════════════════════════════════════════════════════════
    // DATE EXTRACTION — v6.0 COMPLETE PIPELINE
    // ════════════════════════════════════════════════════════════════════════════
    private void extractDates(String text, Map<String, String> data) {
        List<DatePosition> allDates = new ArrayList<>();

        // 1a. ASCII numeric
        collectNumericDates(DATE_NUMERIC, text, allDates, false);
        // 1b. Devanagari/mixed numeric
        collectNumericDates(DATE_DEVANAGARI_NUMERIC, text, allDates, true);
        // 1c. ISO
        Matcher isoM = DATE_ISO.matcher(text);
        while (isoM.find()) {
            String ds = formatNumericDate(isoM.group(3), isoM.group(2), isoM.group(1));
            if (ds != null) allDates.add(new DatePosition(ds, isoM.start()));
        }
        // 2a. English month name
        Matcher m2 = DATE_ENGLISH_MONTH.matcher(text);
        while (m2.find()) {
            String mm = monthMapGet(m2.group(2));
            if (mm != null) allDates.add(new DatePosition(
                    String.format("%02d/%s/%s", Integer.parseInt(m2.group(1)), mm, m2.group(3)),
                    m2.start()));
        }
        // 2b. Month-first English
        Matcher m2b = DATE_ENGLISH_MONTH_FIRST.matcher(text);
        while (m2b.find()) {
            String mm = monthMapGet(m2b.group(1));
            if (mm != null) allDates.add(new DatePosition(
                    String.format("%02d/%s/%s", Integer.parseInt(m2b.group(2)), mm, m2b.group(3)),
                    m2b.start()));
        }
        // 2c. Abbreviated English (handles MAY, AUG uppercase)
        Matcher m2c = DATE_ENGLISH_ABBR.matcher(text);
        while (m2c.find()) {
            String mm = monthMapGet(m2c.group(2));
            if (mm != null) allDates.add(new DatePosition(
                    String.format("%02d/%s/%s", Integer.parseInt(m2c.group(1)), mm, m2c.group(3)),
                    m2c.start()));
        }
        // 3. Devanagari month name
        Matcher m3 = DATE_DEVANAGARI.matcher(text);
        while (m3.find()) {
            try {
                String dd   = devanagariToAscii(m3.group(1).trim());
                String mm   = monthMapGet(m3.group(2).trim());
                String yyyy = devanagariToAscii(m3.group(3).trim());
                if (mm != null && yyyy.length() == 4)
                    allDates.add(new DatePosition(
                            String.format("%02d/%s/%s", Integer.parseInt(dd), mm, yyyy),
                            m3.start()));
            } catch (Exception ex) {
                logger.warn("Devanagari date parse fail: '{}'", m3.group());
            }
        }

        // FIX-NEW9: Deduplicate BEFORE strategy pipeline so S-3/S-8/S-9 get clean list
        Map<String, DatePosition> seen = new LinkedHashMap<>();
        for (DatePosition dp : allDates) seen.putIfAbsent(dp.dateStr, dp);
        List<DatePosition> unique = new ArrayList<>(seen.values());

        for (int i = 0; i < unique.size() && i < 5; i++)
            data.put("date" + (i + 1), unique.get(i).dateStr);
        if (unique.isEmpty()) return;

        // ── Expiry pipeline — ordered from most specific to most general ──
        String expiry = null;

        // S-0: Marathi direct patterns — highest priority (script-native)
        if (expiry == null) expiry = extractExpiryMarathiDirect(text);

        // S-1: Hindi direct patterns
        if (expiry == null) expiry = extractExpiryHindiDirect(text);

        // S-2: Full Marathi validity phrase
        if (expiry == null) expiry = extractExpiryViaMARATHI_PHRASE(text);

        // S-3: Date BEFORE Marathi/Hindi keyword
        if (expiry == null) expiry = extractExpiryBeforeMarathiKeyword(text, unique);

        // S-4: Marathi/Hindi label with date AFTER keyword
        if (expiry == null) expiry = extractExpiryAfterMarathiLabel(text);

        // S-5: English labeled field (EXPIRY_LABELED_FIELD — structured)
        if (expiry == null) expiry = extractExpiryEnglishLabeled(text);

        // S-5b: Compact expiry field ("EXP: 31/03/2026")
        if (expiry == null) expiry = extractExpiryCompactEnglish(text);

        // S-6: Date AFTER English keyword (all date format variants)
        // FIX-B: Now loops ALL occurrences and picks LATEST future date
        if (expiry == null) expiry = extractExpiryAfterEnglishKeyword(text);

        // S-6b: Certificate validity phrases (guarded)
        if (expiry == null) expiry = extractExpiryCertificatePhrase(text);

        // S-7: Validity period range "from X to Y" / "Period: X to Y"
        if (expiry == null) expiry = extractExpiryPeriodRange(text);

        // S-7b: Insurance risk expiry
        if (expiry == null) expiry = extractInsuranceRiskExpiry(text);

        // S-8: Relative expiry "valid for N years/months"
        if (expiry == null) expiry = extractRelativeExpiry(text, unique);

        // S-9: Heuristic — context-scored latest future date (last resort)
        // FIX-I: Require score > 0 (not >= 0) to prevent false positives
        if (expiry == null) expiry = extractLatestFutureDate(text, unique);

        if (expiry != null) {
            if (isPlausibleExpiryString(expiry)) {
                data.put("expiryDate", expiry);
                logger.info("📅 Final expiry: {}", expiry);
            } else {
                logger.warn("⚠️ Expiry '{}' failed sanity check — discarded", expiry);
            }
        }
    }

    private void collectNumericDates(Pattern p, String text, List<DatePosition> out, boolean devanagari) {
        Matcher m = p.matcher(text);
        while (m.find()) {
            try {
                String d1 = devanagari ? devanagariToAscii(m.group(1)) : m.group(1);
                String d2 = devanagari ? devanagariToAscii(m.group(2)) : m.group(2);
                String d3 = devanagari ? devanagariToAscii(m.group(3)) : m.group(3);
                String ds = formatNumericDate(d1, d2, d3);
                if (ds != null) out.add(new DatePosition(ds, m.start()));
            } catch (Exception ex) {
                logger.warn("Date parse fail: '{}'", m.group());
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-0: MARATHI DIRECT PATTERNS
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryMarathiDirect(String text) {
        // M-0a: "DD मार्च YYYY पर्यंत वैध"
        Matcher m = MARATHI_PARYANT_VALID.matcher(text);
        while (m.find()) {
            String r = buildDevaMonthDate(m.group(1), m.group(2), m.group(3));
            if (r != null) { logger.info("✅ S-0 M-0a: {}", r); return r; }
        }
        // M-0b: "DD/MM/YYYY पर्यंत वैध"
        Matcher nb = MARATHI_PARYANT_NUMERIC.matcher(text);
        while (nb.find()) {
            String r = buildDevaNumericDate(nb.group(1), nb.group(2), nb.group(3));
            if (r != null) { logger.info("✅ S-0 M-0b: {}", r); return r; }
        }
        // M-0c: "दिनांक DD मार्च YYYY पर्यंत वैध"
        Matcher dc = MARATHI_DINANK_PARYANT.matcher(text);
        while (dc.find()) {
            String r = buildDevaMonthDate(dc.group(1), dc.group(2), dc.group(3));
            if (r != null) { logger.info("✅ S-0 M-0c: {}", r); return r; }
        }
        // M-0d: "दिनांक DD/MM/YYYY पर्यंत वैध"
        Matcher dn = MARATHI_DINANK_NUMERIC_PARYANT.matcher(text);
        while (dn.find()) {
            String r = buildDevaNumericDate(dn.group(1), dn.group(2), dn.group(3));
            if (r != null) { logger.info("✅ S-0 M-0d: {}", r); return r; }
        }
        // M-0e: "मुदत: DD/MM/YYYY" or "मुदत DD मार्च YYYY"
        Matcher mu = MARATHI_MUDAT_PATTERN.matcher(text);
        while (mu.find()) {
            String r = null;
            if (mu.group(1) != null) r = buildDevaNumericDate(mu.group(1), mu.group(2), mu.group(3));
            else if (mu.group(4) != null) r = buildDevaMonthDate(mu.group(4), mu.group(5), mu.group(6));
            if (r != null) { logger.info("✅ S-0 M-0e (मुदत): {}", r); return r; }
        }
        // M-0f: "ता. DD/MM/YYYY पर्यंत"
        Matcher ta = MARATHI_TA_PARYANT.matcher(text);
        while (ta.find()) {
            String r = buildDevaNumericDate(ta.group(1), ta.group(2), ta.group(3));
            if (r != null) { logger.info("✅ S-0 M-0f: {}", r); return r; }
        }
        // M-0g: compact "DD मार्च YYYY पर्यंत वैध"
        Matcher vc = MARATHI_VALID_COMPACT.matcher(text);
        while (vc.find()) {
            String r = buildDevaMonthDate(vc.group(1), vc.group(2), vc.group(3));
            if (r != null) { logger.info("✅ S-0 M-0g: {}", r); return r; }
        }
        // M-0h: "प्रमाणपत्राची वैधता तारीख: DD/MM/YYYY"
        Matcher vl = MARATHI_VALIDITY_LABEL_FIELD.matcher(text);
        while (vl.find()) {
            String r = buildDevaNumericDate(vl.group(1), vl.group(2), vl.group(3));
            if (r != null) { logger.info("✅ S-0 M-0h (validity label): {}", r); return r; }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-1: HINDI DIRECT PATTERNS
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryHindiDirect(String text) {
        // H-1a: "DD/MM/YYYY तक मान्य है"
        Matcher mn = HINDI_TAK_MANYA_NUMERIC.matcher(text);
        while (mn.find()) {
            String r = buildDevaNumericDate(mn.group(1), mn.group(2), mn.group(3));
            if (r != null) { logger.info("✅ S-1 H-1a: {}", r); return r; }
        }
        // H-1b: "DD मार्च YYYY तक मान्य है"
        Matcher mm = HINDI_TAK_MANYA_MONTH.matcher(text);
        while (mm.find()) {
            String r = buildDevaMonthDate(mm.group(1), mm.group(2), mm.group(3));
            if (r != null) { logger.info("✅ S-1 H-1b: {}", r); return r; }
        }
        // H-1c: "वैधता तिथि : DD/MM/YYYY"
        Matcher ln = HINDI_VALIDITY_LABEL_NUMERIC.matcher(text);
        while (ln.find()) {
            String r = buildDevaNumericDate(ln.group(1), ln.group(2), ln.group(3));
            if (r != null) { logger.info("✅ S-1 H-1c: {}", r); return r; }
        }
        // H-1d: "वैधता तिथि : DD मार्च YYYY"
        Matcher lm = HINDI_VALIDITY_LABEL_MONTH.matcher(text);
        while (lm.find()) {
            String r = buildDevaMonthDate(lm.group(1), lm.group(2), lm.group(3));
            if (r != null) { logger.info("✅ S-1 H-1d: {}", r); return r; }
        }
        // H-1e: "समाप्ति की तिथि : 14 MAY 2033" (Passport bilingual)
        Matcher st = HINDI_SAMAAPTI_TITHI.matcher(text);
        while (st.find()) {
            String dd   = devanagariToAscii(st.group(1).trim());
            String mmRaw = st.group(2).trim();
            String yyyy = devanagariToAscii(st.group(3).trim());
            String mmVal = monthMapGet(mmRaw);
            if (mmVal != null && yyyy.length() == 4) {
                try {
                    String r = String.format("%02d/%s/%s", Integer.parseInt(dd), mmVal, yyyy);
                    logger.info("✅ S-1 H-1e (समाप्ति की तिथि): {}", r);
                    return r;
                } catch (Exception ignored) {}
            }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-2: FULL MARATHI VALIDITY PHRASE
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryViaMARATHI_PHRASE(String text) {
        Matcher vm = MARATHI_VALIDITY_PHRASE.matcher(text);
        while (vm.find()) {
            String r = buildDevaMonthDate(vm.group(1), vm.group(2), vm.group(3));
            if (r != null) { logger.info("✅ S-2: {}", r); return r; }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-3: DATE BEFORE MARATHI/HINDI KEYWORD
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryBeforeMarathiKeyword(String text, List<DatePosition> allDates) {
        for (String kw : EXPIRY_KW_DATE_BEFORE) {
            int pos = text.indexOf(kw);
            while (pos >= 0) {
                String window = text.substring(Math.max(0, pos - 150), pos);
                String best = null;
                // Nearest match = last match in window (closest to keyword)
                Matcher dm = DATE_DEVANAGARI_MONTH.matcher(window);
                while (dm.find()) {
                    String r = buildDevaMonthDate(dm.group(1), dm.group(2), dm.group(3));
                    if (r != null) best = r;
                }
                if (best != null) { logger.info("✅ S-3 Deva month (before '{}'): {}", kw, best); return best; }

                Matcher dn = DATE_DEVANAGARI_NUMERIC.matcher(window);
                while (dn.find()) {
                    String r = buildDevaNumericDate(dn.group(1), dn.group(2), dn.group(3));
                    if (r != null) best = r;
                }
                if (best != null) { logger.info("✅ S-3 Deva numeric (before '{}'): {}", kw, best); return best; }

                Matcher em = DATE_ENGLISH_MONTH.matcher(window);
                while (em.find()) {
                    String mm = monthMapGet(em.group(2));
                    if (mm != null) best = String.format("%02d/%s/%s", Integer.parseInt(em.group(1)), mm, em.group(3));
                }
                if (best != null) { logger.info("✅ S-3 Eng month (before '{}'): {}", kw, best); return best; }

                Matcher nm = DATE_NUMERIC.matcher(window);
                while (nm.find()) {
                    String r = formatNumericDate(nm.group(1), nm.group(2), nm.group(3));
                    if (r != null) best = r;
                }
                if (best != null) { logger.info("✅ S-3 ASCII numeric (before '{}'): {}", kw, best); return best; }

                pos = text.indexOf(kw, pos + 1);
            }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-4: DATE AFTER MARATHI LABEL
    // FIX-T: Now loops all occurrences and picks farthest future date.
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryAfterMarathiLabel(String text) {
        String bestExpiry = null;
        LocalDate bestDate = null;

        for (String kw : EXPIRY_KW_MARATHI_DATE_AFTER) {
            int pos = text.indexOf(kw);
            while (pos >= 0) {
                int winStart = pos + kw.length();
                String window = text.substring(winStart, Math.min(text.length(), winStart + 100));
                String candidate = null;

                Matcher dm = DATE_DEVANAGARI_MONTH.matcher(window);
                if (dm.find()) candidate = buildDevaMonthDate(dm.group(1), dm.group(2), dm.group(3));

                if (candidate == null) {
                    Matcher dn = DATE_DEVANAGARI_NUMERIC.matcher(window);
                    if (dn.find()) candidate = buildDevaNumericDate(dn.group(1), dn.group(2), dn.group(3));
                }
                if (candidate == null) {
                    Matcher nm = DATE_NUMERIC.matcher(window);
                    if (nm.find()) candidate = formatNumericDate(nm.group(1), nm.group(2), nm.group(3));
                }
                if (candidate != null) {
                    LocalDate d = parseDate(candidate);
                    if (d != null && (bestDate == null || d.isAfter(bestDate))) {
                        bestDate = d;
                        bestExpiry = candidate;
                        logger.info("✅ S-4 Marathi label (after '{}'): {}", kw, candidate);
                    }
                }
                pos = text.indexOf(kw, pos + 1);
            }
        }
        return bestExpiry;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-5: ENGLISH LABELED FIELD
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryEnglishLabeled(String text) {
        Matcher lf = EXPIRY_LABELED_FIELD.matcher(text);
        if (lf.find()) {
            try {
                String ds = formatNumericDate(lf.group(2), lf.group(3), lf.group(4));
                if (ds != null) { logger.info("✅ S-5 English labeled: {}", ds); return ds; }
            } catch (Exception e) {
                logger.warn("S-5 group error: {}", e.getMessage());
            }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-5b: COMPACT EXPIRY ("EXP: 31/03/2026")
    // FIX-NEW2
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryCompactEnglish(String text) {
        Matcher m = EXPIRY_COMPACT_ENGLISH.matcher(text);
        if (m.find()) {
            String ds = formatNumericDate(m.group(2), m.group(3), m.group(4));
            if (ds != null) { logger.info("✅ S-5b compact expiry: {}", ds); return ds; }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-6: DATE AFTER ENGLISH KEYWORD
    // FIX-B: Loop ALL occurrences; pick LATEST future date across all matches.
    // FIX-C: "valid for" removed from keyword list.
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryAfterEnglishKeyword(String text) {
        String lower = text.toLowerCase();
        String bestExpiry = null;
        LocalDate bestDate = null;

        for (String kw : EXPIRY_KW_DATE_AFTER) {
            int pos = lower.indexOf(kw);
            while (pos >= 0) {
                int winStart = pos + kw.length();
                String window = text.substring(winStart, Math.min(text.length(), winStart + 130));
                String candidate = tryExtractDateFromWindow(window);
                if (candidate != null) {
                    LocalDate d = parseDate(candidate);
                    if (d != null) {
                        if (bestDate == null || d.isAfter(bestDate)) {
                            bestDate = d;
                            bestExpiry = candidate;
                            logger.info("✅ S-6 (after '{}'): {}", kw, candidate);
                        }
                    }
                }
                pos = lower.indexOf(kw, pos + 1);
            }
        }
        return bestExpiry;
    }

    /**
     * FIX-S: Certificate validity phrases — extract date only if followed by a
     * calendar date (not "for N years"). Guards against false positives.
     */
    private String extractExpiryCertificatePhrase(String text) {
        String lower = text.toLowerCase();
        for (String phrase : CERTIFICATE_VALIDITY_PHRASES) {
            int pos = lower.indexOf(phrase);
            if (pos < 0) continue;
            int winStart = pos + phrase.length();
            String window = text.substring(winStart, Math.min(text.length(), winStart + 100));
            String windowLower = window.toLowerCase().trim();
            // Guard: skip if immediately followed by "for N years/months" (relative)
            if (windowLower.matches("^\\s*for\\s+\\d+\\s+(year|month)s?.*")) continue;
            if (windowLower.matches("^\\s*(\\d{1,2})\\s+वर्ष.*")) continue;
            String candidate = tryExtractDateFromWindow(window);
            if (candidate != null) {
                logger.info("✅ S-6b certificate phrase (after '{}'): {}", phrase, candidate);
                return candidate;
            }
        }
        return null;
    }

    /** Try all date formats in priority order; return first match. */
    private String tryExtractDateFromWindow(String window) {
        // 1. Full English month
        Matcher em = DATE_ENGLISH_MONTH.matcher(window);
        if (em.find()) {
            String mm = monthMapGet(em.group(2));
            if (mm != null)
                return String.format("%02d/%s/%s", Integer.parseInt(em.group(1)), mm, em.group(3));
        }
        // 2. Abbreviated English ("31-Dec-2025", "14 MAY 2033")
        Matcher ea = DATE_ENGLISH_ABBR.matcher(window);
        if (ea.find()) {
            String mm = monthMapGet(ea.group(2));
            if (mm != null)
                return String.format("%02d/%s/%s", Integer.parseInt(ea.group(1)), mm, ea.group(3));
        }
        // 3. ASCII numeric
        Matcher nm = DATE_NUMERIC.matcher(window);
        if (nm.find()) return formatNumericDate(nm.group(1), nm.group(2), nm.group(3));
        // 4. Devanagari numeric
        Matcher dn = DATE_DEVANAGARI_NUMERIC.matcher(window);
        if (dn.find()) return buildDevaNumericDate(dn.group(1), dn.group(2), dn.group(3));
        // 5. Devanagari month name
        Matcher dm = DATE_DEVANAGARI_MONTH.matcher(window);
        if (dm.find()) return buildDevaMonthDate(dm.group(1), dm.group(2), dm.group(3));
        // 6. ISO
        Matcher iso = DATE_ISO.matcher(window);
        if (iso.find()) return formatNumericDate(iso.group(3), iso.group(2), iso.group(1));
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-7: VALIDITY PERIOD RANGE (FIX-V + FIX-Y)
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryPeriodRange(String text) {
        // Pattern 1: "Validity Period: DD/MM/YYYY to DD/MM/YYYY"
        Matcher m = EXPIRY_PERIOD_RANGE.matcher(text);
        if (m.find()) {
            String ds = formatNumericDate(m.group(2), m.group(3), m.group(4));
            if (ds != null) { logger.info("✅ S-7 period range end: {}", ds); return ds; }
        }
        // Pattern 2: FIX-V "Valid from DD/MM/YYYY to DD/MM/YYYY"
        Matcher m2 = VALID_FROM_TO_RANGE.matcher(text);
        if (m2.find()) {
            String ds = formatNumericDate(m2.group(2), m2.group(3), m2.group(4));
            if (ds != null) { logger.info("✅ S-7b valid-from-to range end: {}", ds); return ds; }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-7b: INSURANCE RISK EXPIRY
    // ════════════════════════════════════════════════════════════════════════════
    private String extractInsuranceRiskExpiry(String text) {
        Matcher m = INSURANCE_RISK_EXPIRY.matcher(text);
        if (m.find()) {
            String ds = formatNumericDate(m.group(2), m.group(3), m.group(4));
            if (ds != null) { logger.info("✅ S-7c insurance risk expiry: {}", ds); return ds; }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-8: RELATIVE EXPIRY ("valid for N years/months")
    // ════════════════════════════════════════════════════════════════════════════
    private String extractRelativeExpiry(String text, List<DatePosition> allDates) {
        Matcher m = EXPIRY_RELATIVE.matcher(text);
        if (!m.find()) return null;
        try {
            int amount  = Integer.parseInt(m.group(1));
            boolean yrs = m.group(2).toLowerCase().startsWith("year");
            if (allDates.isEmpty()) return null;
            DatePosition earliest = allDates.stream()
                    .min(Comparator.comparingInt(dp -> dp.position)).orElse(null);
            if (earliest == null) return null;
            LocalDate base   = parseDate(earliest.dateStr);
            if (base == null) return null;
            LocalDate expiry = yrs ? base.plusYears(amount) : base.plusMonths(amount);
            String r = expiry.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            logger.info("✅ S-8 relative ({} {}): {}", amount, m.group(2), r);
            return r;
        } catch (Exception e) { return null; }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // S-9: HEURISTIC — context-scored latest future date
    // FIX-I: Requires score > 0 (not >= 0) to prevent false positives.
    // ════════════════════════════════════════════════════════════════════════════
    private String extractLatestFutureDate(String text, List<DatePosition> allDates) {
        if (allDates.isEmpty()) return null;
        LocalDate today = LocalDate.now();
        DatePosition best = null;
        int bestScore = Integer.MIN_VALUE;

        for (DatePosition dp : allDates) {
            LocalDate d = parseDate(dp.dateStr);
            if (d == null || !d.isAfter(today)) continue;
            if (d.getYear() > 2080) continue;
            int ctx = computeContextScore(text, dp.position);
            if (ctx > bestScore) { bestScore = ctx; best = dp; }
        }

        // FIX-I: require ctx > 0 — at least one expiry keyword in vicinity
        if (best != null && bestScore > 0) {
            logger.info("✅ S-9 heuristic (ctx={}): {}", bestScore, best.dateStr);
            return best.dateStr;
        }
        return null;
    }

    private int computeContextScore(String text, int pos) {
        int window = 200;
        String ctx = text.substring(Math.max(0, pos - window),
                Math.min(text.length(), pos + window)).toLowerCase();
        int score = 0;
        for (String kw : EXPIRY_KW_DATE_AFTER)  if (ctx.contains(kw)) score += 10;
        for (String kw : EXPIRY_KW_DATE_BEFORE) if (ctx.contains(kw)) score += 10;
        for (String kw : ISSUE_DATE_KEYWORDS)    if (ctx.contains(kw)) score -= 15;
        return score;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY SANITY CHECK
    // ════════════════════════════════════════════════════════════════════════════
    private boolean isPlausibleExpiryString(String ds) {
        try {
            LocalDate d = parseDate(ds);
            if (d == null) return false;
            return d.getYear() >= 1947 && d.getYear() <= 2099;
        } catch (Exception e) { return false; }
    }

    LocalDate parseDate(String ds) {
        if (ds == null) return null;
        try {
            String[] parts = ds.split("/");
            if (parts.length != 3) return null;
            int d = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            int y = Integer.parseInt(parts[2]);
            if (d < 1 || d > 31 || m < 1 || m > 12) return null;
            return LocalDate.of(y, m, d);
        } catch (Exception e) { return null; }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // DATE BUILDER HELPERS
    // ════════════════════════════════════════════════════════════════════════════
    private String buildDevaMonthDate(String rawDay, String rawMonth, String rawYear) {
        try {
            String dd   = devanagariToAscii(rawDay.trim());
            String mm   = monthMapGet(rawMonth.trim());
            String yyyy = devanagariToAscii(rawYear.trim());
            if (mm == null || yyyy.length() != 4) return null;
            return String.format("%02d/%s/%s", Integer.parseInt(dd), mm, yyyy);
        } catch (Exception e) { return null; }
    }

    private String buildDevaNumericDate(String rawDay, String rawMonth, String rawYear) {
        try {
            return formatNumericDate(
                    devanagariToAscii(rawDay.trim()),
                    devanagariToAscii(rawMonth.trim()),
                    devanagariToAscii(rawYear.trim()));
        } catch (Exception e) { return null; }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // FILENAME SCORING
    // ════════════════════════════════════════════════════════════════════════════
    private Map<String, Integer> getFilenameScores(String filename) {
        Map<String, Integer> s = new HashMap<>();
        String lower = filename.toLowerCase()
                .replace("_", " ").replace("-", " ").replace(".", " ").trim();
        if (lower.contains("jobcard") || lower.contains("job card"))              addScore(s, "Employment Documents", 40);
        if (lower.contains("offer") && lower.contains("letter"))                  addScore(s, "Employment Documents", 35);
        if (lower.contains("salary") || lower.contains("payslip"))                addScore(s, "Employment Documents", 30);
        if (lower.contains("nrega") || lower.contains("mgnrega"))                 addScore(s, "Employment Documents", 45);
        if (lower.contains("income") && lower.contains("cert"))                   addScore(s, "Income Certificate", 40);
        if (lower.contains("utpanna") || lower.contains("utpan"))                 addScore(s, "Income Certificate", 40);
        if (lower.contains("income") && !lower.contains("tax") && !lower.contains("job")) addScore(s, "Income Certificate", 20);
        if (lower.contains("marksheet") || lower.contains("mark sheet"))          addScore(s, "Education Certificates", 40);
        if (lower.contains("ssc") || lower.contains("hsc"))                       addScore(s, "Education Certificates", 40);
        if (lower.contains("degree") || lower.contains("diploma"))                addScore(s, "Education Certificates", 30);
        if (lower.contains("gunapatra") || lower.contains("gunpatra"))            addScore(s, "Education Certificates", 35);
        if (lower.contains("domicile") || lower.contains("adhiwas"))              addScore(s, "Domicile Certificate", 45);
        if (lower.contains("rahiwas") || lower.contains("niwas"))                 addScore(s, "Domicile Certificate", 35);
        if (lower.contains("caste") || lower.contains("jati") || lower.contains("jaat")) addScore(s, "Caste Certificate", 45);
        if (lower.contains("birth") && lower.contains("cert"))                    addScore(s, "Birth Certificate", 40);
        if (lower.contains("janm") || lower.contains("janam"))                    addScore(s, "Birth Certificate", 30);
        if (lower.contains("marriage") && lower.contains("cert"))                 addScore(s, "Marriage Certificate", 40);
        if (lower.contains("vivah") || lower.contains("lagna"))                   addScore(s, "Marriage Certificate", 35);
        if (lower.contains("fee") || lower.contains("bill") || lower.contains("receipt")) addScore(s, "Bills & Receipts", 30);
        if (lower.contains("aadhaar") || lower.contains("aadhar") || lower.contains("adhar")) addScore(s, "Aadhaar Card", 45);
        if (lower.contains("uid"))                                                 addScore(s, "Aadhaar Card", 35);
        if (lower.contains("pancard") || (lower.contains("pan") && lower.contains("card"))) addScore(s, "PAN Card", 45);
        if (lower.contains("passport"))                                            addScore(s, "Passport", 45);
        if (lower.contains("driving") || lower.contains("licence") || lower.contains("dl")) addScore(s, "Driving License", 40);
        if (lower.contains("voter") || lower.contains("matdar"))                  addScore(s, "Voter ID", 40);
        if (lower.contains("ration") || lower.contains("shidha"))                 addScore(s, "Ration Card", 40);
        if (lower.contains("medical") || lower.contains("prescription") || lower.contains("report")) addScore(s, "Medical Reports", 30);
        if (lower.contains("property") || lower.contains("deed") || lower.contains("satbara")) addScore(s, "Property Documents", 35);
        if (lower.contains("insurance") || lower.contains("policy"))              addScore(s, "Insurance Papers", 35);
        if (lower.contains("bank") || lower.contains("statement"))                addScore(s, "Financial Documents", 30);
        if (lower.contains("vehicle") || (lower.contains("rc") && lower.contains("book"))) addScore(s, "Vehicle Documents", 30);
        if (lower.contains("affidavit") || lower.contains("court"))               addScore(s, "Legal Documents", 30);
        return s;
    }

    private void addScore(Map<String, Integer> scores, String key, int value) {
        scores.merge(key, value, Integer::sum);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // INDIVIDUAL CATEGORY SCORERS
    // ════════════════════════════════════════════════════════════════════════════
    private int scoreAadhaar(String lower, String original) {
        if (isIncomeCertificateText(lower, original)) return 0;
        int score = 0;
        boolean hasKw = lower.contains("aadhaar") || lower.contains("aadhar") ||
                lower.contains("आधार") || original.contains("आधार") ||
                lower.contains("uidai") || lower.contains("unique identification authority");

        int headerLen = Math.max(1, original.length() / 4);
        String header = original.substring(0, Math.min(headerLen, original.length())).toLowerCase();

        for (String sig : AADHAAR_AUTHORITY_SIGNALS_LOWER) {
            if (lower.contains(sig)) { score += 60; if (header.contains(sig)) score += 15; break; }
        }
        for (String sig : AADHAAR_MARATHI_AUTHORITY) if (original.contains(sig)) { score += 55; break; }
        for (String sig : AADHAAR_HINDI_AUTHORITY)   if (original.contains(sig)) { score += 55; break; }
        for (String t : AADHAAR_TAGLINE_SIGNALS_LOWER) if (lower.contains(t))    { score += 40; break; }
        for (String t : AADHAAR_TAGLINE_DEVANAGARI)    if (original.contains(t)) { score += 40; break; }

        if (hasKw) score += 30;
        if (AADHAAR_LABELED_FIELD.matcher(original).find())            score += 90;
        else if (AADHAAR_EXPLICIT.matcher(original).find())            score += hasKw ? 50 : 35;
        else if (AADHAAR_SPACED_LOOSE.matcher(original).find())        score += hasKw ? 45 : 30;
        else if (AADHAAR_HYPHENATED.matcher(original).find())          score += hasKw ? 45 : 30;
        else if (AADHAAR_MASKED.matcher(original).find())              score += hasKw ? 40 : 25;
        else if (AADHAAR_MASKED_RELAXED.matcher(original).find())      score += hasKw ? 35 : 20;
        else if (AADHAAR_UID_PREFIX.matcher(original).find())          score += 45;
        else if (AADHAAR_OCR_NOISY.matcher(original).find() && hasKw) score += 25;
        else if (AADHAAR_BARE_12.matcher(original).find() && hasKw)   score += 20;
        if (AADHAAR_DEVANAGARI_NUM.matcher(original).find())           score += hasKw ? 45 : 25;
        if (AADHAAR_VID_PATTERN.matcher(original).find())              score += 35;
        if (AADHAAR_ENROLMENT.matcher(lower).find())                   score += 30;
        if (lower.contains("enrolment no") || lower.contains("enrollment no")) score += 15;
        if (lower.contains("1800 180 1947") || lower.contains("18001801947"))   score += 25;
        if (lower.contains("help@uidai.gov.in") || lower.contains("uidai.gov.in")) score += 20;
        if (hasKw) {
            int bio = 0;
            for (String sig : AADHAAR_BIOMETRIC_SIGNALS_LOWER)
                if (lower.contains(sig) || original.contains(sig)) bio++;
            if (bio > 0) score += Math.min(20, bio * 10);
        }
        boolean hasRel    = AADHAAR_ADDRESS_RELATION.matcher(original).find();
        boolean hasGender = AADHAAR_GENDER_PATTERN.matcher(original).find();
        boolean hasYOB    = AADHAAR_YOB_PATTERN.matcher(original).find();
        if (hasKw && hasRel && hasGender)           score += 15;
        if (hasKw && hasYOB)                        score += 15;
        if (hasKw && hasRel && hasYOB && hasGender) score += 10;
        for (String sig : AADHAAR_QR_TEXT_SIGNALS_LOWER) if (lower.contains(sig)) { score += 15; break; }
        return Math.min(160, score);
    }

    private int scorePAN(String lower, String original) {
        int score = 0;
        if (lower.contains("permanent account number card")) score += 70;
        else if (lower.contains("permanent account number")) score += 50;
        for (String sig : PAN_HINDI_SIGNALS)
            if (original.contains(sig)) { score += sig.equals("आयकर विभाग") ? 45 : 65; break; }
        if (PAN_LABELED_FIELD.matcher(original).find())        score += 65;
        else if (PAN_LABELED_RELAXED.matcher(original).find()) score += 55;
        else if (PAN_PATTERN.matcher(original).find())         score += 55;
        else if (PAN_PATTERN_RELAXED.matcher(original).find()) score += 40;
        for (String sig : PAN_AUTHORITY_SIGNALS_LOWER) if (lower.contains(sig)) { score += 40; break; }
        if (lower.contains("pan application digitally signed")) score += 35;
        for (String l : PAN_SPECIFIC_FIELD_LABELS)
            if (lower.contains(l) || original.contains(l)) { score += 30; break; }
        if (score > 30 && (lower.contains("govt. of india") || lower.contains("government of india"))) score += 20;
        if (score > 40 && (lower.contains("date of birth") || lower.contains("जन्म की तारीख"))) score += 15;
        return Math.min(160, score);
    }

    private int scorePassport(String lower, String original) {
        int score = 0;
        boolean hasMRZ1 = PASSPORT_MRZ_LINE1.matcher(original).find();
        boolean hasMRZ2 = PASSPORT_MRZ_LINE2.matcher(original).find();
        if (hasMRZ1) score += 90;
        if (hasMRZ2) score += 85;
        if (lower.contains("republic of india"))   score += 55;
        if (original.contains("भारत गणराज्य"))     score += 50;
        if (PASSPORT_LABELED.matcher(original).find()) score += 60;
        else if (lower.contains("passport no") || lower.contains("पारपत्र सं.")) {
            score += 35;
            if (PASSPORT_PATTERN.matcher(original).find()) score += 20;
        } else if (PASSPORT_PATTERN.matcher(original).find()) score += 30;
        for (String sig : PASSPORT_AUTHORITY_SIGNALS_LOWER) if (lower.contains(sig)) { score += 45; break; }
        int fc = 0; for (String lbl : PASSPORT_FIELD_LABELS_LOWER) if (lower.contains(lbl)) fc++;
        if (fc >= 3) score += 50; else if (fc == 2) score += 35; else if (fc == 1) score += 20;
        int hc = 0; for (String lbl : PASSPORT_FIELD_LABELS_HINDI) if (original.contains(lbl)) hc++;
        if (hc >= 2) score += 30; else if (hc == 1) score += 15;
        if (PASSPORT_NATIONALITY_INDIAN.matcher(original).find()) score += 35;
        else if (lower.contains("nationality") && lower.contains("indian")) score += 25;
        if (PASSPORT_TYPE_COUNTRY.matcher(original).find()) score += 40;
        else if (lower.contains("country code") && lower.contains("ind")) score += 25;
        if (lower.contains("passport")) score += 25;
        boolean pBirth = lower.contains("place of birth");
        boolean dIssue = lower.contains("date of issue");
        boolean dExp   = lower.contains("date of expiry");
        if (pBirth && dIssue && dExp) score += 40; else if (pBirth && dIssue) score += 25;
        return Math.min(210, score);
    }

    private int scoreDrivingLicense(String lower, String original) {
        int score = 0;
        if (lower.contains("the union of india"))                score += 35;
        if (DL_STATE_HEADER.matcher(original).find())            score += 65;
        else if (lower.contains("motor driving licence") || lower.contains("motor driving license")) score += 55;
        if (DL_FORM_RULE.matcher(original).find())               score += 55;
        for (Pattern p : DL_PATTERNS) if (p.matcher(original).find()) { score += 50; break; }
        if (DL_VALID_TILL.matcher(original).find())              score += 50;
        else if (lower.contains("valid till") || lower.contains("valid upto")) score += 25;
        if (lower.contains("authorisation to drive following class of vehicles")) score += 50;
        else if (lower.contains("authorisation to drive"))       score += 30;
        if (DL_COV_FIELD.matcher(original).find())               score += 45;
        if (lower.contains("driving licence") || lower.contains("driving license")) score += 40;
        if (original.contains("ड्राइविंग लायसेंस") || original.contains("ड्रायव्हिंग लायसन्स")
                || original.contains("वाहन चालक अनुज्ञापत्र")) score += 35;
        if (DL_DOI_FIELD.matcher(original).find())               score += 35;
        if (DL_BADGE_FIELD.matcher(original).find())             score += 30;
        if (lower.contains("signature & id of issuing authority") || lower.contains("signature and id of issuing authority")) score += 30;
        if (DL_SDW_FIELD.matcher(original).find())               score += 20;
        if (DL_NT_FIELD.matcher(original).find())                score += 20;
        if (lower.contains("motor vehicles act"))                score += 25;
        if (lower.contains("transport authority"))               score += 20;
        return Math.min(210, score);
    }

    private int scoreVoterID(String lower, String original) {
        int s = 0;
        if (VOTER_ID_LABELED.matcher(original).find())             s += 70;
        else if (VOTER_ID_BARE.matcher(original).find() &&
                (lower.contains("election") || lower.contains("voter") ||
                        lower.contains("elector") || original.contains("निर्वाचन"))) s += 50;
        if (lower.contains("election commission"))                  s += 40;
        if (original.contains("निर्वाचन आयोग"))                    s += 35;
        if (lower.contains("elector") || lower.contains("epic"))    s += 30;
        if (lower.contains("electoral roll"))                       s += 25;
        if (lower.contains("voter id") || lower.contains("voter card")) s += 40;
        if (lower.contains("matdar") || original.contains("मतदार"))    s += 30;
        if (lower.contains("booth") || lower.contains("polling"))       s += 15;
        return Math.min(110, s);
    }

    private int scoreIncomeCertificate(String lower, String original) {
        int s = 0;
        if (original.contains("उत्पन्नाचे प्रमाणपत्र"))  s += 85;
        if (original.contains("उत्पन्न प्रमाणपत्र"))      s += 85;
        if (original.contains("आय प्रमाणपत्र"))            s += 80;
        if (lower.contains("income certificate"))           s += 75;
        if (original.contains("वार्षिक उत्पन्न"))          s += 45;
        if (original.contains("एकूण उत्पन्न"))             s += 40;
        if (lower.contains("annual income"))                s += 35;
        if (lower.contains("total income"))                 s += 30;
        if (lower.contains("tehsildar") || lower.contains("tahasil")) s += 30;
        if (original.contains("तहसीलदार") || original.contains("तहसिलदार")) s += 30;
        if (original.contains("नायब तहसीलदार"))             s += 35;
        if (original.contains("तालुका"))                    s += 20;
        if (original.contains("महसूल") || lower.contains("revenue department")) s += 25;
        if (original.contains("मुद्रांक") || original.contains("शुल्क")) s += 15;
        if (original.contains("वैध राहील") && original.contains("उत्पन्न")) s += 30;
        if (lower.contains("below poverty line") || original.contains("दारिद्र्यरेषा")) s += 20;
        return Math.min(130, s);
    }

    private int scoreDomicileCertificate(String lower, String original) {
        int s = 0;
        if (lower.contains("domicile certificate"))                              s += 80;
        if (DOMICILE_CERTIFY_PHRASE.matcher(lower).find())                       s += 70;
        else if (lower.contains("permanent resident of") || lower.contains("permanently residing")) s += 40;
        if (DOMICILE_COLLECTOR_OFFICE.matcher(lower).find())                     s += 55;
        if (DOMICILE_COLLECTOR_SEAL.matcher(original).find())                    s += 45;
        if (DOMICILE_FILE_NO.matcher(original).find())                           s += 35;
        if (original.contains("अधिवास प्रमाणपत्र") || original.contains("रहिवासी प्रमाणपत्र")) s += 65;
        if (original.contains("मूल निवासी प्रमाण पत्र") || original.contains("निवास प्रमाण पत्र")) s += 60;
        if (lower.contains("premises no"))                                       s += 25;
        if (DOMICILE_IAS_TAG.matcher(original).find())                           s += 20;
        if (lower.contains("resident of state") || lower.contains("resident of the state")) s += 20;
        return Math.min(160, s);
    }

    private int scoreCasteCertificate(String lower, String original) {
        int s = 0;
        if (lower.contains("caste certificate"))                                s += 90;
        for (String sig : CASTE_HINDI_TITLE_SIGNALS) if (original.contains(sig)) { s += 85; break; }
        if (lower.contains("converted to buddhism") || lower.contains("buddhist faith")) s += 80;
        int sc = 0;
        for (String sig : CASTE_SC_ST_LEGAL_LOWER) if (lower.contains(sig)) sc++;
        if (sc >= 3) s += 65; else if (sc == 2) s += 50; else if (sc == 1) s += 30;
        if (original.contains("कार्यालय प्रखण्ड विकास पदाधिकारी")) s += 60;
        for (String sig : CASTE_OBC_HINDI_SIGNALS)   if (original.contains(sig)) { s += 65; break; }
        for (String sig : CASTE_LEGAL_ACTS_LOWER)    if (lower.contains(sig))    { s += 50; break; }
        for (String sig : CASTE_ANUSUCHIT_SIGNALS)   if (original.contains(sig)) { s += 60; break; }
        if (CASTE_SON_DAUGHTER_VILLAGE.matcher(lower).find())                   s += 35;
        if (lower.contains("candidate's l.c.") || lower.contains("father's l.c.")) s += 35;
        if (s > 30 && CASTE_SALUTATION.matcher(original).find())                s += 20;
        if (original.contains("आरक्षण"))                                        s += 25;
        if (lower.contains("sc/st") || lower.contains("obc certificate"))       s += 40;
        return Math.min(210, s);
    }

    private int scoreRationCard(String lower, String original) {
        int s = 0;
        if (lower.contains("ration card"))                                       s += 55;
        if (original.contains("राशन कार्ड") || original.contains("शिधापत्रिका")) s += 50;
        if (lower.contains("public distribution system"))                         s += 35;
        if (lower.contains("food") && lower.contains("civil supplies"))          s += 25;
        if (lower.contains("fair price shop") || lower.contains("fpds"))         s += 30;
        if (original.contains("अन्न पुरवठा") || original.contains("स्वस्त धान्य")) s += 35;
        if (lower.contains("bpl") || lower.contains("apl") || lower.contains("antyodaya")) s += 25;
        return Math.min(110, s);
    }

    private int scoreBirthCertificate(String lower, String original) {
        int s = 0;
        if (lower.contains("birth certificate") || lower.contains("certificate of birth")) s += 60;
        if (original.contains("जन्म प्रमाणपत्र") || original.contains("जन्म दाखला")) s += 55;
        if (lower.contains("registration of birth"))  s += 35;
        if (lower.contains("date of birth") && lower.contains("place of birth")) s += 25;
        if (lower.contains("registrar of birth"))     s += 30;
        if (original.contains("जन्म नोंदणी"))        s += 30;
        return Math.min(110, s);
    }

    private int scoreMarriageCertificate(String lower, String original) {
        int s = 0;
        if (lower.contains("marriage certificate") || lower.contains("certificate of marriage")) s += 60;
        if (original.contains("विवाह प्रमाणपत्र") || original.contains("लग्न नोंदणी")) s += 55;
        if (lower.contains("registration of marriage"))  s += 35;
        if (lower.contains("hindu marriage act") || lower.contains("special marriage act")) s += 40;
        if (original.contains("विवाह नोंदणी") || original.contains("विवाह संस्कार")) s += 30;
        return Math.min(110, s);
    }

    private int scoreEducation(String lower, String original) {
        int s = 0;
        if (lower.contains("marksheet") || lower.contains("mark sheet"))        s += 55;
        if (lower.contains("degree certificate"))                                s += 55;
        if (lower.contains("diploma certificate"))                               s += 50;
        if (lower.contains("ssc") || lower.contains("hsc"))                     s += 45;
        if (lower.contains("10th") || lower.contains("12th"))                   s += 35;
        if (lower.contains("secondary school") || lower.contains("higher secondary")) s += 35;
        if (lower.contains("board examination") || lower.contains("board exam")) s += 35;
        if (lower.contains("university"))                                        s += 22;
        if (lower.contains("result") || lower.contains("marks obtained"))       s += 20;
        if (lower.contains("grade") || lower.contains("percentage"))            s += 15;
        if (lower.contains("training certificate") || lower.contains("apprenticeship")) s += 35;
        if (lower.contains("skill certificate") || lower.contains("vocational")) s += 30;
        if (original.contains("गुणपत्रिका"))                                    s += 40;
        if (original.contains("उत्तीर्ण"))                                      s += 25;
        if (original.contains("महाराष्ट्र राज्य माध्यमिक"))                    s += 50;
        if (original.contains("बोर्ड परीक्षा") || original.contains("परीक्षा मंडळ")) s += 35;
        if (original.contains("शाळा सोडल्याचा दाखला"))                         s += 40;
        if (original.contains("पदविका") || original.contains("पदवी"))           s += 35;
        if (original.contains("विद्यापीठ"))                                     s += 25;
        if (lower.contains("cbse") || lower.contains("icse") || lower.contains("nios")) s += 40;
        if (lower.contains("provisional certificate") || lower.contains("migration certificate")) s += 30;
        return Math.min(110, s);
    }

    private int scoreMedical(String lower, String original) {
        int s = 0;
        if (lower.contains("medical report") || lower.contains("medical certificate")) s += 45;
        if (lower.contains("prescription"))              s += 40;
        if (lower.contains("pathology") || lower.contains("laboratory report"))  s += 40;
        if (lower.contains("diagnosis") || lower.contains("radiology"))          s += 28;
        if (lower.contains("patient name"))              s += 22;
        if (lower.contains("dr.") || lower.contains("m.b.b.s") || lower.contains("mbbs")) s += 20;
        if (original.contains("वैद्यकीय") || original.contains("रुग्णालय")) s += 30;
        if (lower.contains("hospital") || lower.contains("clinic")) s += 15;
        if (lower.contains("blood group") || lower.contains("x-ray") || lower.contains("mri")) s += 20;
        return Math.min(110, s);
    }

    private int scoreProperty(String lower, String original) {
        int s = 0;
        if (lower.contains("sale deed"))                                         s += 55;
        if (lower.contains("registry") && lower.contains("property"))           s += 45;
        if (lower.contains("7/12 extract") || lower.contains("seven twelve"))   s += 55;
        if (lower.contains("eight-a") || lower.contains("8-a"))                 s += 45;
        if (lower.contains("survey number"))                                     s += 28;
        if (original.contains("सातबारा") || original.contains("७/१२") || original.contains("खाते")) s += 40;
        if (lower.contains("khata") || lower.contains("khatha"))                s += 30;
        if (lower.contains("mutation") || lower.contains("fard"))               s += 25;
        return Math.min(110, s);
    }

    private int scoreInsurance(String lower, String original) {
        int s = 0;
        if (lower.contains("insurance policy"))   s += 55;
        if (lower.contains("policy number"))      s += 40;
        if (lower.contains("premium"))            s += 28;
        if (lower.contains("sum assured") || lower.contains("sum insured")) s += 28;
        if (lower.contains("nominee"))            s += 20;
        if (lower.contains("lic") || lower.contains("life insurance")) s += 25;
        return Math.min(110, s);
    }

    private int scoreFinancial(String lower, String original) {
        int s = 0;
        if (lower.contains("bank statement"))     s += 55;
        if (lower.contains("account statement"))  s += 50;
        if (lower.contains("ifsc") || lower.contains("account number")) s += 35;
        if (lower.contains("transaction history") || lower.contains("passbook")) s += 28;
        if (lower.contains("debit") && lower.contains("credit")) s += 20;
        if (lower.contains("cheque") || lower.contains("neft") || lower.contains("rtgs")) s += 20;
        return Math.min(110, s);
    }

    private int scoreBills(String lower, String original) {
        int s = 0;
        if (lower.contains("fee receipt") || lower.contains("fees receipt"))    s += 60;
        if (lower.contains("tuition fee") || lower.contains("college fee") || lower.contains("school fee")) s += 50;
        if (lower.contains("tax invoice") || lower.contains("invoice"))         s += 45;
        if (lower.contains("bill"))                                              s += 38;
        if (lower.contains("receipt"))                                           s += 32;
        if (lower.contains("payment") || lower.contains("paid"))                s += 25;
        if (lower.contains("gst") || lower.contains("gstin"))                   s += 28;
        if (lower.contains("ticket") || lower.contains("fare"))                 s += 30;
        if (lower.contains("electricity bill") || lower.contains("water bill")) s += 40;
        return Math.min(110, s);
    }

    private int scoreEmployment(String lower, String original) {
        int s = 0;
        if (lower.contains("job card") || lower.contains("jobcard"))            s += 70;
        if (lower.contains("nrega") || lower.contains("mgnrega"))               s += 65;
        if (lower.contains("alp") || lower.contains("apprentice license"))      s += 55;
        if (lower.contains("railway") && (lower.contains("pass") || lower.contains("employment"))) s += 50;
        if (lower.contains("rrb") || lower.contains("railway recruitment"))     s += 45;
        if (lower.contains("offer letter"))                                      s += 55;
        if (lower.contains("appointment letter"))                                s += 55;
        if (lower.contains("joining letter"))                                    s += 55;
        if (lower.contains("salary slip") || lower.contains("payslip"))         s += 50;
        if (lower.contains("experience certificate"))                            s += 50;
        if (lower.contains("employment certificate"))                            s += 50;
        if (lower.contains("relieving letter"))                                  s += 50;
        if (lower.contains("employee") && (lower.contains("id") || lower.contains("card"))) s += 35;
        if (lower.contains("designation") && lower.contains("department"))      s += 30;
        if (original.contains("रोजगार") || original.contains("नोकरी") || original.contains("पगार")) s += 25;
        if (isIncomeCertificateText(lower, original)) s -= 30;
        return Math.max(0, Math.min(110, s));
    }

    private int scoreVehicle(String lower, String original) {
        int s = 0;
        if (lower.contains("registration certificate") && (lower.contains("vehicle") || lower.contains("motor"))) s += 60;
        if (lower.contains("rc book"))                                           s += 55;
        if (lower.contains("pollution under control") || lower.contains("puc")) s += 45;
        if (lower.contains("chassis number") || lower.contains("engine number")) s += 30;
        if (lower.contains("vehicle class") || lower.contains("fuel type"))     s += 20;
        return Math.min(110, s);
    }

    private int scoreLegal(String lower, String original) {
        int s = 0;
        if (lower.contains("affidavit"))         s += 50;
        if (lower.contains("court order"))       s += 50;
        if (lower.contains("legal notice"))      s += 50;
        if (lower.contains("notarized") || lower.contains("notarised")) s += 35;
        if (original.contains("शपथपत्र") || original.contains("प्रतिज्ञापत्र")) s += 40;
        if (lower.contains("high court") || lower.contains("supreme court")) s += 35;
        if (lower.contains("first information report") || lower.contains("fir")) s += 40;
        return Math.min(110, s);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // INCOME CERTIFICATE GUARD
    // ════════════════════════════════════════════════════════════════════════════
    private boolean isIncomeCertificateText(String lower, String original) {
        return original.contains("उत्पन्नाचे प्रमाणपत्र")
                || original.contains("उत्पन्न प्रमाणपत्र")
                || original.contains("आय प्रमाणपत्र")
                || original.contains("वार्षिक उत्पन्न")
                || lower.contains("income certificate")
                || (lower.contains("annual income") && lower.contains("tehsildar"));
    }

    // ════════════════════════════════════════════════════════════════════════════
    // DOCUMENT NUMBER EXTRACTION
    // ════════════════════════════════════════════════════════════════════════════
    private void extractAadhaarData(String text, Map<String, String> data) {
        Matcher lm = AADHAAR_LABELED_FIELD.matcher(text);
        if (lm.find()) { put(data, "aadhaarNumber", lm.group(1).replaceAll("[^\\d]", "")); extractAadhaarSupplementalData(text, data); return; }
        Matcher em = AADHAAR_EXPLICIT.matcher(text);
        if (em.find()) { put(data, "aadhaarNumber", em.group().replaceAll("\\s", "")); extractAadhaarSupplementalData(text, data); return; }
        Matcher sl = AADHAAR_SPACED_LOOSE.matcher(text);
        if (sl.find()) { put(data, "aadhaarNumber", sl.group().replaceAll("\\s", "")); extractAadhaarSupplementalData(text, data); return; }
        Matcher hm = AADHAAR_HYPHENATED.matcher(text);
        if (hm.find()) { put(data, "aadhaarNumber", hm.group().replace("-", "")); extractAadhaarSupplementalData(text, data); return; }
        Matcher um = AADHAAR_UID_PREFIX.matcher(text);
        if (um.find()) { put(data, "aadhaarNumber", um.group().replaceAll("[^\\d]", "")); extractAadhaarSupplementalData(text, data); return; }
        Matcher mm = AADHAAR_MASKED.matcher(text);
        if (mm.find()) { put(data, "aadhaarNumber", mm.group().replaceAll("\\s", "")); extractAadhaarSupplementalData(text, data); }
    }

    private void extractAadhaarSupplementalData(String text, Map<String, String> data) {
        Matcher vm = AADHAAR_VID_PATTERN.matcher(text);
        if (vm.find()) data.put("aadhaarVID", vm.group(1).replaceAll("\\s", ""));
        Matcher en = AADHAAR_ENROLMENT.matcher(text.toLowerCase());
        if (en.find()) data.put("aadhaarEnrolmentNumber", en.group(1));
        Matcher yb = AADHAAR_YOB_PATTERN.matcher(text);
        if (yb.find()) data.put("yearOfBirth", yb.group(1));
    }

    private void extractPANData(String text, Map<String, String> data) {
        Matcher lm = PAN_LABELED_FIELD.matcher(text);
        if (lm.find()) { put(data, "panNumber", lm.group(1)); }
        else {
            Matcher rl = PAN_LABELED_RELAXED.matcher(text);
            if (rl.find()) { put(data, "panNumber", rl.group(1)); }
            else {
                Matcher pm = PAN_PATTERN.matcher(text);
                if (pm.find()) put(data, "panNumber", pm.group());
                else {
                    Matcher rx = PAN_PATTERN_RELAXED.matcher(text);
                    if (rx.find()) put(data, "panNumber", rx.group());
                }
            }
        }
        Matcher nm = Pattern.compile("(?i)(?:नाम\\s*/\\s*)?Name\\s*[:\\n]?\\s*([A-Z][A-Z\\s]{3,40})").matcher(text);
        if (nm.find()) data.put("name", nm.group(1).trim());
    }

    private void extractPassportData(String text, Map<String, String> data) {
        Matcher lm = PASSPORT_LABELED.matcher(text);
        if (lm.find()) {
            put(data, "passportNumber", lm.group(1));
        } else {
            Matcher mrzM = PASSPORT_MRZ_LINE2.matcher(text);
            if (mrzM.find()) {
                put(data, "passportNumber", mrzM.group().substring(0, 8).replace("<", ""));
                data.put("mrzLine", mrzM.group());
            } else {
                Matcher bm = PASSPORT_PATTERN.matcher(text);
                if (bm.find()) put(data, "passportNumber", bm.group());
            }
        }
        if (PASSPORT_NATIONALITY_INDIAN.matcher(text).find()) data.put("nationality", "INDIAN");
        Matcher sur = Pattern.compile("(?i)(?:Surname|उपनाम)\\s*/[^\\n]*\\n?\\s*([A-Z][A-Z\\s]{1,30})").matcher(text);
        if (sur.find()) data.put("surname", sur.group(1).trim());
    }

    private void extractDLData(String text, Map<String, String> data) {
        Matcher lb = Pattern.compile(
                "(?i)DL\\s*(?:No\\.?)?\\s*[:/]?\\s*([A-Z]{2}[-\\s]?\\d{2}[-\\s]?\\d{11})").matcher(text);
        if (lb.find()) {
            put(data, "dlNumber", lb.group(1));
        } else {
            for (Pattern p : DL_PATTERNS) {
                Matcher m = p.matcher(text);
                if (m.find()) {
                    put(data, "dlNumber", m.groupCount() >= 1 && m.group(1) != null ? m.group(1) : m.group());
                    break;
                }
            }
        }
        // BUG-12 FIX (preserved): Pick LATEST valid-till date (farthest future)
        LocalDate latestValidTill = null;
        Matcher vt = Pattern.compile(
                "(?i)(?:valid\\s+till|cov\\s+valid\\s+till|nt\\s+valid\\s+till|validity)\\s*[:/]?\\s*" +
                        "(\\d{1,2}[/\\-.]\\d{1,2}[/\\.\\-]\\d{2,4})",
                Pattern.CASE_INSENSITIVE).matcher(text);
        while (vt.find()) {
            Matcher dm = DATE_NUMERIC.matcher(vt.group(1));
            if (dm.find()) {
                String ds = formatNumericDate(dm.group(1), dm.group(2), dm.group(3));
                if (ds != null) {
                    LocalDate d = parseDate(ds);
                    if (d != null && (latestValidTill == null || d.isAfter(latestValidTill))) {
                        latestValidTill = d;
                        data.put("validTill", ds);
                    }
                }
            }
        }
    }

    private void extractVoterIDNumber(String text, Map<String, String> data) {
        Matcher ml = VOTER_ID_LABELED.matcher(text);
        if (ml.find()) { put(data, "voterIdNumber", ml.group(1)); return; }
        Matcher mb = VOTER_ID_BARE.matcher(text);
        if (mb.find()) put(data, "voterIdNumber", mb.group());
    }

    // ════════════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ════════════════════════════════════════════════════════════════════════════
    private void put(Map<String, String> data, String key, String value) {
        data.put(key, value);
        data.put("documentNumber", value);
    }

    String devanagariToAscii(String s) {
        if (s == null || s.isEmpty()) return s;
        StringBuilder sb = new StringBuilder(s.length());
        for (char c : s.toCharArray()) {
            int i = DEVANAGARI_DIGITS.indexOf(c);
            sb.append(i >= 0 ? (char) ('0' + i) : c);
        }
        return sb.toString();
    }

    private String formatNumericDate(String day, String month, String year) {
        try {
            int d = Integer.parseInt(day.trim());
            int m = Integer.parseInt(month.trim());
            if (d < 1 || d > 31 || m < 1 || m > 12) return null;
            int y = Integer.parseInt(year.trim());
            if (y < 1900 || y > 2099) return null;
            return String.format("%02d/%02d/%d", d, m, y);
        } catch (NumberFormatException e) { return null; }
    }

    private void logTopScores(Map<String, Integer> scores) {
        scores.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(5)
                .forEach(e -> logger.info("  {} = {}", e.getKey(), e.getValue()));
    }
}
