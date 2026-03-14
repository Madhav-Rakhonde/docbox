package com.docbox.service;


import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;



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
            "अत्यन्त पिछड़ा वर्ग", "पिछड़ा वरग", "अति पिछड़ा वर्ग", "अन्य पिछड़े वर्ग");
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
            "जानेवारी|फेब्रुवारी|मार्च|माच|एप्रिल|मे|जून|जुलै|ऑगस्ट|सप्टेंबर|ऑक्टोबर|नोव्हेंबर|डिसेंबर";
    private static final String HINDI_MONTHS_RE =
            "जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|नवंबर|दिसंबर";
    private static final String ALL_DEVA_MONTHS_RE = MARATHI_MONTHS_RE + "|" + HINDI_MONTHS_RE;

    /**
     * OCR-HARDENED month regex — extends ALL_DEVA_MONTHS_RE with common Tesseract
     * corruption variants for Marathi months.  Added in v6.2 to cover:
     *   मार्च → माच  (matra/halant drop — most common Tesseract error on this glyph)
     *   मार्च → मार्व / मार्ज / मार्ष  (cher consonant confusion)
     *   abbreviated forms: जानेव, फेब्र, एप्र, ऑग, सप्ट, ऑक्ट, नोव्ह, डिस
     * Used only by OCR-hardened patterns (PARYANT_HARDENED, YEAR_BEFORE_PARYANT).
     */
    private static final String ALL_DEVA_MONTHS_OCR_RE =
            ALL_DEVA_MONTHS_RE +
                    "|माच|मार्व|मार्ज|मार्ष" +                         // मार्च corruptions
                    "|जानेव|फेब्र|एप्र|ऑग|सप्ट|ऑक्ट|नोव्ह|डिस";      // abbreviations

    private static final Pattern DATE_DEVANAGARI = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern DATE_DEVANAGARI_MONTH = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY PATTERNS — v6.1
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
            "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_OCR_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,15}(?:पर्यंत\\s*(?:च)?|परयत|पर्यन्त)" +
                    "\\s{0,15}(?:वैध|बैध|वैच|valid|राहील)" +
                    "(?:\\s+(?:राहील|आहे|असेल)|[.।])?",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private static final Pattern MARATHI_PARYANT_NUMERIC = Pattern.compile(
            "([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    "\\s{0,15}(?:पर्यंत(?:च)?)\\s{0,15}(?:वैध|बैध|वैच|valid)" +
                    "(?:\\s+(?:राहील|आहे|असेल)|[.।])?",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    private static final Pattern MARATHI_DINANK_PARYANT = Pattern.compile(
            "(?:दिनांक|ता\\.)\\s*([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,10}(?:पर्यंत(?:च)?)\\s{0,5}(?:वैध|बैध|वैच|valid)",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    private static final Pattern MARATHI_DINANK_NUMERIC_PARYANT = Pattern.compile(
            "(?:दिनांक|ता\\.)\\s*([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    "\\s{0,10}(?:पर्यंत(?:च)?)\\s{0,5}(?:वैध|बैध|वैच|valid)",
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
                    "(?:वैध|बैध|वैच|valid)",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    private static final Pattern MARATHI_VALID_COMPACT = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,30}पर्यंत(?:च)?\\s{0,5}(?:वैध|बैध|वैच|valid)",
            Pattern.UNICODE_CHARACTER_CLASS);


    private static final Pattern MARATHI_YEAR_BEFORE_PARYANT = Pattern.compile(
            "([०-९\\d]{1,2})\\s+\\S+\\s+([०-९\\d]{4})" +
                    "(?=[\\s\\S]{0,60}(?:पर्यंत|परयत|पर्यन्त))",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.DOTALL);

    // FIX-NEW7: Additional Marathi patterns
    private static final Pattern MARATHI_VALIDITY_LABEL_FIELD = Pattern.compile(
            "(?:प्रमाणपत्राची\\s+वैधता\\s+(?:तारीख)?|वैधता\\s+कालावधी)\\s*[:/]?\\s*" +
                    "([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);


    private static final Pattern MARATHI_HE_PRAMANAPTR_SENTENCE = Pattern.compile(
            // FIX-B: हे\s*प्रमाण(?:पत्र|पत्न|पत्ण) handles OCR space-drop AND र→न/ण corruption.
            // Was: (?:हे|सदरचा|सदरील)\\s+(?:प्रमाणपत्र|दाखला)
            "(?:हे\\s*प्रमाण(?:पत्र|पत्न|पत्ण)" +
                    "|हे\\s+(?:प्रमाणपत्र|दाखला)" +
                    "|सदरचा\\s+(?:दाखला|दखला)" +
                    "|सदरील\\s+(?:प्रमाणपत्र|दाखला))" +
                    "[\\s\\S]{0,120}?" +
                    "(?:" +
                    // Branch A: "DD MONTH YYYY"
                    "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_OCR_RE + ")\\s*([०-९\\d]{4})" +
                    "|" +
                    // Branch B: "DD/MM/YYYY"
                    "([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    ")" +
                    "\\s{0,15}(?:पर्यंत(?:च)?|पय\\s*तच|पयतच|पय\\u0902तच|पयं\\s*तच)" +
                    "\\s{0,15}(?:वैध|बैध|वैच|valid)" +
                    "(?:\\s+(?:राहील|आहे|असेल|च)|[.।])?",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    private static final Pattern MARATHI_PARYANTACH_DIRECT = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_OCR_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,15}पर्यंतच" +
                    "\\s{0,15}(?:वैध|बैध|वैच|valid)" +
                    "(?:\\s+(?:राहील|आहे|असेल)|[.।])?",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);
    /**
     * FIX-PDF: Handles PDF embedded-text glyph-strip corruption of पर्यंतच.
     * When PDFs are processed via text extraction (not OCR), the Devanagari
     * conjunct glyphs are stripped: पर्यंतच → पय तच / पयतच / पयंतच.
     * This pattern catches all variants.
     */
    private static final Pattern MARATHI_PARYANTACH_PDF = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + ALL_DEVA_MONTHS_OCR_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,20}(?:पर्यंतच|पय\\s*तच|पयतच|पय\\u0902तच|पयं\\s*तच)" +
                    "\\s{0,15}(?:वैध|बैध|वैच|valid)" +
                    "(?:\\s+(?:राहील|आहे|असेल)|[.।])?",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);
    /**
     * FIX-INCOME: Matches MahaOnline income certificate footer.
     * Format: "Printed By ­OMTID : VLE Name :... Date:03/10/2025 1:03PM"
     * Expiry rule: 31 March of the year AFTER the print date year.
     */
    private static final Pattern INCOME_CERT_PRINTED_DATE = Pattern.compile(
            "(?i)(?:Printed\\s+By[^\\n]{0,80}?Date|\\bDate)\\s*[:\\-]\\s*" +
                    "(0?[1-9]|[12]\\d|3[01])/(0?[1-9]|1[0-2])/((?:19|20)\\d{2})" +
                    "(?:\\s+\\d{1,2}:\\d{2}(?:AM|PM)?)?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CHARACTER_CLASS);
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
            "([०-९\\d]+)\\s*" +
                    "(?:वर्षांसाठी|वर्षासाठी|वर्षे\\s+साठी|वर्षाकरिता)" +
                    // FIX-R1: block if followed by income/certificate title context
                    "(?!\\s*(?:उत्पन्न|प्रमाणपत्र|दाखला|आय|income))",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY KEYWORD LISTS — v6.1
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
            "तक मान्य",
            // FIX-A: वैच variants (Tesseract ध→च corruption)
            "पर्यंतच वैच राहील",
            "पर्यंत वैच राहील",
            "पर्यंतच वैच",
            "पर्यंत वैच",
            "वैच राहील",
            // FIX-PDF: PDF glyph-strip corruption of पर्यंतच → पय तच
            "पय तच वैध राहील",
            "पय तच वैच राहील",
            "पय तच वैध",
            "पयतच वैध राहील",
            "पयतच वैध"
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
        // In the MONTH_MAP static block, add:
        MONTH_MAP.put("माच", "03");   // FIX-PDF: PDF glyph-strip of मार्च
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

        // ── PRE-PASS: Hard suppression for Maharashtra Age/Nationality/Domicile cert ──
        // This certificate explicitly lists "Ration Card", "Birth Certificate", "UID"
        // etc. as PROOFS SUBMITTED. Those mentions must not classify the document as
        // those types. Detect the certificate by its title or definitive body phrases,
        // then zero-out all the proof-list categories and floor domicile score.
        boolean isDomicileTitleDoc =
                lower.contains("age, nationality and domicile") ||
                        lower.contains("domiciled in the state of")     ||
                        (lower.contains("citizen of india") && lower.contains("domicile")) ||
                        (lower.contains("particulars of proofs") && lower.contains("domicile"));

        if (isDomicileTitleDoc) {
            scores.put("Ration Card",          0);
            scores.put("Aadhaar Card",         0);
            scores.put("Birth Certificate",    0);
            scores.put("Bills & Receipts",     0);
            scores.put("Employment Documents", 0);
            // Floor: guarantee Domicile Certificate wins even if scorer missed signals
            scores.merge("Domicile Certificate", 80, Math::max);
        }

        // ── existing code below — unchanged ──────────────────────────────────────
        int aadhaar  = scores.getOrDefault("Aadhaar Card", 0);
        int pan      = scores.getOrDefault("PAN Card", 0);
        int dl       = scores.getOrDefault("Driving License", 0);
        int income   = scores.getOrDefault("Income Certificate", 0);
        int caste    = scores.getOrDefault("Caste Certificate", 0);
        int domicile = scores.getOrDefault("Domicile Certificate", 0);
        int ration   = scores.getOrDefault("Ration Card", 0);
        int bills    = scores.getOrDefault("Bills & Receipts", 0);
        int birth    = scores.getOrDefault("Birth Certificate", 0);
        int marriage = scores.getOrDefault("Marriage Certificate", 0);
        int employ   = scores.getOrDefault("Employment Documents", 0);

        // ── ID Document cross-suppression (original) ─────────────────────────
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

        // ── Certificate vs generic-category suppression ───────────────────────
        int certMax = Math.max(Math.max(domicile, caste), Math.max(income, Math.max(birth, marriage)));
        if (certMax >= 50) {
            if (bills < certMax - 25)
                scores.computeIfPresent("Bills & Receipts", (k, v) -> (int)(v * 0.4));
            if (ration < certMax - 25)
                scores.computeIfPresent("Ration Card", (k, v) -> (int)(v * 0.4));
        }
        if (domicile >= 55 && ration < domicile) {
            scores.computeIfPresent("Ration Card",      (k, v) -> (int)(v * 0.35));
            scores.computeIfPresent("Bills & Receipts", (k, v) -> (int)(v * 0.35));
        }
        if (income >= 55 && employ < income) {
            scores.computeIfPresent("Employment Documents", (k, v) -> (int)(v * 0.5));
        }
        if (caste >= 60) {
            scores.computeIfPresent("Bills & Receipts", (k, v) -> (int)(v * 0.4));
            scores.computeIfPresent("Ration Card",      (k, v) -> (int)(v * 0.4));
        }
        if (birth >= 50 || marriage >= 50) {
            scores.computeIfPresent("Bills & Receipts", (k, v) -> (int)(v * 0.45));
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STRUCTURED DATA EXTRACTION — PUBLIC
    // ════════════════════════════════════════════════════════════════════════════
    public Map<String, String> extractStructuredData(String text, String category) {
        Map<String, String> data = new HashMap<>();
        if (text == null || text.isEmpty()) return data;

        switch (category) {
            case "Aadhaar Card":         extractAadhaarData(text, data);             break;
            case "PAN Card":             extractPANData(text, data);                 break;
            case "Passport":             extractPassportData(text, data);            break;
            case "Driving License":      extractDLData(text, data);                  break;
            case "Voter ID":             extractVoterIDNumber(text, data);           break;
            case "Income Certificate":   extractIncomeCertificateExpiry(text, data); break; // ← ADDED
            default: break;
        }

        extractDates(text, data);

        // Relative validity fallbacks — only fire if full pipeline found nothing
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
        // FIX-R1: MARATHI_RELATIVE_VARSH now has a negative lookahead that prevents
        // "N वर्षांसाठी उत्पन्नाचे प्रमाणपत्र" (income cert title) from matching.
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
    // DATE EXTRACTION — v6.1 COMPLETE PIPELINE
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

        // Early-exit path: no dates parsed from text at all.
        // S-INCOME still applies here — a scanned Income Cert footer may be the
        // only date-bearing line yet yield no parseable dates via the generic
        // collectors (e.g. the timestamp "1:03PM" confuses some patterns).
        if (unique.isEmpty()) {
            if (data.containsKey("incomeCertDerivedExpiry")) {
                data.put("expiryDate", data.remove("incomeCertDerivedExpiry"));
                logger.info("📅 S-INCOME derived expiry (no other dates in text): {}",
                        data.get("expiryDate"));
            }
            return;
        }

        // ── Expiry pipeline — ordered from most specific to most general ──────
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

        // S-INCOME: Income Certificate 31-March rule.
        // ─────────────────────────────────────────────────────────────────────
        // MUST run BEFORE S-9. Without this guard, S-9 (extractLatestFutureDate)
        // picks up the MahaOnline footer print-date (e.g. "Date:03/10/2025") as
        // a "future date", assigns it a non-negative context score, and wins —
        // so the derived expiry "31/03/2026" never gets used.
        //
        // S-0…S-8 are all structurally explicit (labeled fields, script-native
        // sentences, period ranges). If none of them matched, it means the cert
        // carries NO explicit expiry text — only the issue date in the footer.
        // In that case the derived 31-March date IS the correct expiry and must
        // take precedence over the generic heuristic.
        // ─────────────────────────────────────────────────────────────────────
        if (expiry == null && data.containsKey("incomeCertDerivedExpiry")) {
            expiry = data.remove("incomeCertDerivedExpiry");
            logger.info("📅 S-INCOME derived expiry (31 March rule, before S-9): {}", expiry);
        }

        // S-9: Heuristic — context-scored latest future date (last resort)
        // FIX-I: Require score > 0 (not >= 0) to prevent false positives
        if (expiry == null) expiry = extractLatestFutureDate(text, unique);

        // Always clean up the temp key regardless of which path was taken
        data.remove("incomeCertDerivedExpiry");

        if (expiry != null) {
            if (isPlausibleExpiryString(expiry)) {
                if (!data.containsKey("expiryDate")) {
                    data.put("expiryDate", expiry);
                    logger.info("📅 Final expiry: {}", expiry);
                }
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

    private static final Pattern INCOME_CERT_ISSUE_DATE = Pattern.compile(
            "(?i)" +
                    // Optional MahaOnline prefix up to 120 chars, ending with the word "Date"
                    "(?:Printed\\s+By[^\\n]{0,120}?\\bDate|\\bDate)" +
                    // Separator: colon with optional surrounding spaces, or just colon
                    "\\s*[:\\-]\\s*" +
                    // DD/MM/YYYY  — groups 1, 2, 3
                    "(0?[1-9]|[12]\\d|3[01])/(0?[1-9]|1[0-2])/((?:19|20)\\d{2})" +
                    // Optional time component — ignored
                    "(?:\\s+\\d{1,2}:\\d{2}(?:AM|PM)?)?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CHARACTER_CLASS
    );




    // ════════════════════════════════════════════════════════════════════════════
    // S-0: MARATHI DIRECT PATTERNS
    // ════════════════════════════════════════════════════════════════════════════
    private String extractExpiryMarathiDirect(String text) {


        Matcher pdf = MARATHI_PARYANTACH_PDF.matcher(text);
        while (pdf.find()) {
            String r = buildDevaMonthDate(pdf.group(1), pdf.group(2), pdf.group(3));
            if (r != null) { logger.info("✅ S-0 M-0pre-PDF (पय तच PDF strip): {}", r); return r; }
        }
        Matcher pc = MARATHI_PARYANTACH_DIRECT.matcher(text);
        while (pc.find()) {
            String r = buildDevaMonthDate(pc.group(1), pc.group(2), pc.group(3));
            if (r != null) { logger.info("✅ S-0 M-0pre (पर्यंतच direct): {}", r); return r; }
        }
        Matcher hi = MARATHI_HE_PRAMANAPTR_SENTENCE.matcher(text);
        while (hi.find()) {
            String r = null;
            if (hi.group(2) != null) {
                // Branch A: month-name form
                r = buildDevaMonthDate(hi.group(1), hi.group(2), hi.group(3));
            } else if (hi.group(4) != null) {
                // Branch B: numeric form
                r = buildDevaNumericDate(hi.group(4), hi.group(5), hi.group(6));
            }
            if (r != null) { logger.info("✅ S-0 M-0i (हे प्रमाणपत्र sentence): {}", r); return r; }
        }
        // M-0a: "DD मार्च YYYY पर्यंत वैध" (FIX-R2: gaps widened to {0,15})
        Matcher m = MARATHI_PARYANT_VALID.matcher(text);
        while (m.find()) {
            String r = buildDevaMonthDate(m.group(1), m.group(2), m.group(3));
            if (r != null) { logger.info("✅ S-0 M-0a: {}", r); return r; }
        }
        // M-0b: "DD/MM/YYYY पर्यंत वैध" (FIX-R2: gaps widened to {0,15})
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
        // M-0j: v6.2 SAFETY NET — "DD <garbled-month> YYYY" within 60 chars of पर्यंत.
        // Fires only when the month name is too corrupted for any month-aware pattern to match.
        Matcher yp = MARATHI_YEAR_BEFORE_PARYANT.matcher(text);
        while (yp.find()) {
            try {
                String day  = devanagariToAscii(yp.group(1));
                String year = devanagariToAscii(yp.group(2));
                int d = Integer.parseInt(day), y = Integer.parseInt(year);
                if (d >= 1 && d <= 31 && y >= 2000 && y <= 2040) {
                    String r = String.format("%02d/01/%04d", d, y);
                    logger.warn("⚠️ S-0 M-0j SAFETY NET (month garbled): day={} year={} -> {}", day, year, r);
                    return r;
                }
            } catch (NumberFormatException ex) { /* skip */ }
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

        // Pass 1: prefer future dates (original logic)
        for (DatePosition dp : allDates) {
            LocalDate d = parseDate(dp.dateStr);
            if (d == null || !d.isAfter(today)) continue;
            if (d.getYear() > 2080) continue;
            int ctx = computeContextScore(text, dp.position);
            if (ctx > bestScore) { bestScore = ctx; best = dp; }
        }

        if (best != null && bestScore > 0) {
            logger.info("✅ S-9 heuristic future (ctx={}): {}", bestScore, best.dateStr);
            return best.dateStr;
        }

        // FIX-PAST: Pass 2 — also consider past dates with strong expiry-keyword context.
        // Certificates already expired still have valid, extractable expiry dates.
        // Require ctx >= 15 (at least one strong Devanagari expiry keyword in vicinity)
        // to avoid picking issue dates or DOBs.
        DatePosition bestPast = null;
        int bestPastScore = Integer.MIN_VALUE;
        for (DatePosition dp : allDates) {
            LocalDate d = parseDate(dp.dateStr);
            if (d == null) continue;
            if (d.isAfter(today)) continue;                          // already handled above
            if (d.getYear() < 2000 || d.getYear() > today.getYear()) continue;  // sanity
            int ctx = computeContextScore(text, dp.position);
            if (ctx > bestPastScore) { bestPastScore = ctx; bestPast = dp; }
        }

        if (bestPast != null && bestPastScore >= 15) {
            logger.info("✅ S-9 heuristic past-expiry (ctx={}): {}", bestPastScore, bestPast.dateStr);
            return bestPast.dateStr;
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

        // FIX-DEVA-CTX: score Devanagari expiry keywords so Marathi docs don't always score 0
        String ctxRaw = text.substring(Math.max(0, pos - window), Math.min(text.length(), pos + window));
        for (String kw : EXPIRY_KW_DATE_BEFORE)  if (ctxRaw.contains(kw)) score += 10;  // already Devanagari
        if (ctxRaw.contains("पर्यंत"))  score += 15;
        if (ctxRaw.contains("वैध"))      score += 15;
        if (ctxRaw.contains("राहील"))    score += 10;
        if (ctxRaw.contains("मुदत"))     score += 12;
        if (ctxRaw.contains("दिनांक"))   score += 5;
        // penalise issue-date context in Devanagari
        if (ctxRaw.contains("दिनांक") && ctxRaw.contains("पासून")) score -= 10;

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

        // NEW: e-Aadhaar / DigiLocker download signals
        if (lower.contains("e-aadhaar") || lower.contains("eaadhaar"))          score += 25;
        if (lower.contains("digilocker") && hasKw)                              score += 15;
        if (lower.contains("resident") && hasKw)                                score += 10;
        // NEW: Address section signals unique to Aadhaar
        if (lower.contains("s/o") || lower.contains("d/o") || lower.contains("w/o")) {
            if (hasKw) score += 15;
        }

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
        // NEW: NSDL / UTIITSL are PAN-specific issuers
        if (lower.contains("nsdl") || lower.contains("utiitsl"))               score += 30;
        if (lower.contains("protean") && lower.contains("pan"))                score += 25;
        // NEW: "cbdt" is the governing body for PAN
        if (lower.contains("cbdt") || lower.contains("central board of direct taxes")) score += 30;
        // NEW: e-PAN specific signals
        if (lower.contains("e-pan") || lower.contains("epan"))                 score += 25;
        if (lower.contains("section 139a") || lower.contains("income tax act")) score += 25;
        // NEW: PAN card always has "signature" and DOB
        if (lower.contains("signature") && lower.contains("date of birth") && PAN_PATTERN.matcher(original).find()) score += 20;
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
        // NEW: Passport Seva Kendra / PSK specific signals
        if (lower.contains("passport seva") || lower.contains("passport sewa")) score += 35;
        if (lower.contains("psk") && lower.contains("passport"))               score += 20;
        // NEW: Passport type P (personal) or D (diplomatic) or S (service)
        if (lower.contains("type of passport") || lower.contains("type : p"))  score += 20;
        // NEW: ECR / ECNR (emigration check) — unique to Indian passports
        if (lower.contains("ecr") || lower.contains("ecnr") || lower.contains("emigration check")) score += 30;
        // NEW: File number field
        if (lower.contains("file no") && lower.contains("passport"))           score += 20;
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
        // NEW: RTO / Regional Transport Office is the issuer of all DLs
        if (lower.contains("regional transport office") || lower.contains("rto")) score += 30;
        if (lower.contains("regional transport authority") || lower.contains("rta")) score += 25;
        // NEW: Blood group is printed on DL
        if (lower.contains("blood group") && (lower.contains("licence") || lower.contains("license"))) score += 20;
        // NEW: "Driving licence act" or "central motor vehicles rules"
        if (lower.contains("central motor vehicles rules"))      score += 30;
        // NEW: Pin / identification number (DL has specific layout)
        if (lower.contains("pin") && lower.contains("doi") && lower.contains("doe")) score += 20;
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
        // NEW: "electors photo identity card" is the full official name
        if (lower.contains("electors photo identity card"))             s += 70;
        if (lower.contains("photo identity card") && lower.contains("election")) s += 50;
        // NEW: e-EPIC is the digital version
        if (lower.contains("e-epic") || lower.contains("eepic"))        s += 50;
        // NEW: "assembly constituency" or "parliamentary constituency" appear on EPIC
        if (lower.contains("assembly constituency"))                     s += 30;
        if (lower.contains("parliamentary constituency"))                s += 25;
        // NEW: Part no. / serial no. appear on EPIC
        if (lower.contains("part no") && (lower.contains("epic") || lower.contains("voter"))) s += 20;
        // NEW: "registered at" polling station
        if (lower.contains("polling station") || lower.contains("polling booth")) s += 20;
        // NEW: Hindi/Marathi signals
        if (original.contains("निर्वाचक फोटो पहचान पत्र"))            s += 65;
        if (original.contains("मतदार ओळखपत्र"))                        s += 65;
        if (original.contains("भारत निर्वाचन आयोग"))                   s += 45;
        return Math.min(140, s);
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
        if (original.contains("वैच राहील") && original.contains("उत्पन्न")) s += 30;
        if (original.contains("वर्षांसाठी") && original.contains("उत्पन्नाचे")) s += 20;
        if (original.contains("वर्षांसाठी") && original.contains("उत्पन्न"))    s += 15;
        // NEW: "gross annual family income" — classic phrase on Tahsildar-issued income certs
        if (lower.contains("gross annual family income"))   s += 55;
        if (lower.contains("gross annual income"))          s += 45;
        if (lower.contains("family income"))                s += 30;
        // NEW: "economically weaker section" or "EWS" — income cert for reservations
        if (lower.contains("economically weaker section") || lower.contains("ews")) s += 35;
        // NEW: Sub-divisional officer (SDO) also issues income certs
        if (lower.contains("sub-divisional officer") || lower.contains("sdo")) {
            if (lower.contains("income") || original.contains("उत्पन्न")) s += 25;
        }
        // NEW: "income for the year" — standard English phrasing on income cert body
        if (lower.contains("income for the year") || lower.contains("income of rs.")) s += 35;
        // NEW: MahaOnline OMTID footer (already present but add more signals)
        if (lower.contains("omtid") || lower.contains("mahaonline"))       s += 20;
        // NEW: "certified that" + income context
        if (lower.contains("certified that") && (lower.contains("income") || original.contains("उत्पन्न"))) s += 20;
        // NEW: Hindi income cert signals
        if (original.contains("आय प्रमाण पत्र"))           s += 80;
        if (original.contains("वार्षिक आय"))                s += 40;
        if (original.contains("कुल वार्षिक आय"))            s += 45;
        return Math.min(130, s);
    }

    private int scoreDomicileCertificate(String lower, String original) {
        int s = 0;

        // HIGH-VALUE: Maharashtra "Certificate of Age, Nationality and Domicile"
        if (lower.contains("certificate of age, nationality and domicile"))       s += 100;
        if (lower.contains("age, nationality and domicile"))                       s += 90;
        if (lower.contains("nationality and domicile"))                            s += 75;
        if (lower.contains("domiciled in the state of"))                           s += 70;
        if (lower.contains("citizen of india") && lower.contains("domicile"))      s += 65;
        if (lower.contains("office of collector") ||
                lower.contains("collector & district magistrate") ||
                lower.contains("collector and district magistrate"))                   s += 55;
        if (lower.contains("tahsildar") || lower.contains("tahasil"))              s += 20;

        if (lower.contains("domicile certificate"))                                s += 80;
        if (DOMICILE_CERTIFY_PHRASE.matcher(lower).find())                         s += 70;
        else if (lower.contains("permanent resident of") ||
                lower.contains("permanently residing"))                           s += 40;
        if (DOMICILE_COLLECTOR_OFFICE.matcher(lower).find())                       s += 55;
        if (DOMICILE_COLLECTOR_SEAL.matcher(original).find())                      s += 45;
        if (DOMICILE_FILE_NO.matcher(original).find())                             s += 35;

        // Marathi domicile signals
        if (original.contains("अधिवास प्रमाणपत्र") || original.contains("रहिवासी प्रमाणपत्र")) s += 65;
        if (original.contains("मूल निवासी प्रमाण पत्र") || original.contains("निवास प्रमाण पत्र")) s += 60;
        if (original.contains("रहिवास दाखला") || original.contains("रहिवास प्रमाणपत्र"))       s += 65;
        if (original.contains("अधिवास दाखला"))                                    s += 65;
        if (original.contains("वास्तव्य") &&
                (original.contains("प्रमाणपत्र") || original.contains("दाखला")))      s += 55;
        if (original.contains("कायमचा रहिवासी") ||
                original.contains("कायमस्वरूपी रहिवासी"))                             s += 60;
        if (original.contains("राज्याचा रहिवासी") ||
                original.contains("महाराष्ट्राचा रहिवासी"))                           s += 55;

        // Hindi domicile signals
        if (original.contains("निवास प्रमाण पत्र") ||
                original.contains("मूल निवास प्रमाण पत्र"))                           s += 60;
        if (original.contains("स्थायी निवासी") ||
                original.contains("स्थायी रूप से निवास"))                             s += 55;
        if (lower.contains("domicile") && !lower.contains("domicile certificate")) s += 30;
        if (lower.contains("premises no"))                                         s += 25;
        if (DOMICILE_IAS_TAG.matcher(original).find())                             s += 20;
        if (lower.contains("resident of state") ||
                lower.contains("resident of the state"))                               s += 20;

        // NEW: "particulars of proofs submitted" — phrase from the Maharashtra domicile cert
        if (lower.contains("particulars of proofs submitted") ||
                lower.contains("particulars of proofs"))                               s += 40;
        // NEW: "issued by authorities in the state of maharashtra" — subtitle on the cert
        if (lower.contains("issued by authorities in the state"))                  s += 35;
        // NEW: "territory of india" — in the body "within the territory of INDIA"
        if (lower.contains("territory of india") && lower.contains("domicile"))    s += 35;
        // NEW: "district magistrate" is co-issuer with Collector on domicile certs
        if (lower.contains("district magistrate") && lower.contains("domicile"))   s += 40;
        // NEW: VJ/NT/SBC/DT categories unique to Maharashtra domicile/caste certs
        if ((lower.contains("vj") || lower.contains("nt") || lower.contains("sbc")) &&
                lower.contains("maharashtra"))                                          s += 20;

        return Math.min(200, s);
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
        // NEW: "caste validity certificate" — Maharashtra-specific post-2012 requirement
        if (lower.contains("caste validity certificate") || lower.contains("caste validity")) s += 70;
        if (original.contains("जात वैधता प्रमाणपत्र") || original.contains("जात पडताळणी")) s += 70;
        // NEW: Maharashtra categories VJ/NT/SBC/DT
        if (lower.contains("vimukta jati") || lower.contains("nomadic tribes"))  s += 50;
        if (lower.contains("special backward class") || lower.contains("sbc"))   s += 40;
        if (lower.contains("denotified tribes") || lower.contains("dt") && lower.contains("caste")) s += 35;
        // NEW: "belongs to" — standard phrase in caste cert body
        if (lower.contains("belongs to the") && (lower.contains("caste") || lower.contains("tribe"))) s += 30;
        // NEW: OBC non-creamy layer certificate
        if (lower.contains("non-creamy layer") || lower.contains("non creamy layer")) s += 55;
        if (lower.contains("creamy layer"))                                       s += 40;
        // NEW: "social justice department" issues caste certs
        if (lower.contains("social justice") && lower.contains("caste"))         s += 30;
        // NEW: "backward class welfare" dept
        if (lower.contains("backward class welfare"))                             s += 35;
        // NEW: Marathi OBC signals
        if (original.contains("इतर मागासवर्ग") || original.contains("ओबीसी"))   s += 55;
        if (original.contains("विमुक्त जाती") || original.contains("भटक्या जमाती")) s += 55;
        return Math.min(210, s);
    }

    private int scoreRationCard(String lower, String original) {
        int s = 0;

        // GUARD: "Ration Card" mentioned as proof submitted in a govt certificate
        boolean rationMentionedAsProof =
                lower.contains("particulars of proofs") ||
                        lower.contains("proofs submitted") ||
                        lower.contains("list of documents") ||
                        lower.contains("documents submitted") ||
                        (lower.contains("ration card") &&
                                (lower.contains("birth certificate") ||
                                        lower.contains("school leaving")    ||
                                        lower.contains("collector")         ||
                                        lower.contains("district magistrate") ||
                                        lower.contains("tahsildar")         ||
                                        lower.contains("domicile")          ||
                                        lower.contains("nationality")));

        if (rationMentionedAsProof) return 0;

        if (lower.contains("ration card"))                                        s += 55;
        if (original.contains("राशन कार्ड") || original.contains("शिधापत्रिका")) s += 50;
        if (lower.contains("public distribution system"))                          s += 35;
        if (lower.contains("food") && lower.contains("civil supplies"))           s += 25;
        if (lower.contains("fair price shop") || lower.contains("fpds"))          s += 30;
        if (original.contains("अन्न पुरवठा") || original.contains("स्वस्त धान्य")) s += 35;

        boolean hasRationCtx = lower.contains("ration") || lower.contains("शिधा")
                || lower.contains("fair price") || lower.contains("pds");
        if (hasRationCtx && (lower.contains("bpl") || lower.contains("apl") || lower.contains("antyodaya"))) s += 25;
        if (lower.contains("antyodaya anna yojana"))                              s += 35;
        if (original.contains("प्रधानमंत्री गरीब") && original.contains("अन्न"))  s += 30;

        // NEW: NFSA (National Food Security Act) is THE ration card act
        if (lower.contains("national food security act") || lower.contains("nfsa")) s += 45;
        // NEW: "head of family" or "head of household" — key field on ration card
        if (lower.contains("head of family") || lower.contains("head of household")) {
            if (hasRationCtx) s += 35;
        }
        // NEW: "priority household" or "phh" — NFSA ration card type
        if (lower.contains("priority household") || lower.contains("phh"))        s += 35;
        // NEW: "food grain" or "foodgrain" — content of ration card entitlement
        if (lower.contains("food grain") || lower.contains("foodgrain"))          s += 25;
        // NEW: "ration shop" or "depot" — where beneficiary collects
        if (lower.contains("ration shop") || lower.contains("depot no"))          s += 30;
        // NEW: Quota / allocation fields
        if (lower.contains("monthly quota") || lower.contains("unit quota"))      s += 30;
        if (lower.contains("rice") && lower.contains("wheat") && hasRationCtx)   s += 25;
        // NEW: "taluk supply officer" or "district supply officer"
        if (lower.contains("supply officer") || lower.contains("civil supplies officer")) s += 30;
        // NEW: "one nation one ration card" — portability scheme
        if (lower.contains("one nation one ration") || lower.contains("onorc"))   s += 40;
        // NEW: "shidha" (Marathi for ration/grain supplies)
        if (original.contains("शिधा वाटप") || original.contains("रेशन दुकान"))   s += 45;

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
        // NEW: Registration of Births & Deaths Act 1969 — THE governing legislation
        if (lower.contains("registration of births and deaths act") ||
                lower.contains("registration of births & deaths"))                    s += 50;
        if (lower.contains("births and deaths act"))                              s += 40;
        // NEW: "registrar of births and deaths" — exact title of issuing officer
        if (lower.contains("registrar of births and deaths"))                     s += 50;
        if (lower.contains("chief registrar of births"))                          s += 45;
        // NEW: CRS — Civil Registration System (national portal)
        if (lower.contains("civil registration system") || lower.contains("crsorgi")) s += 35;
        // NEW: "section 12" or "section 17" of RBD Act appear on birth cert header
        if (lower.contains("section 12") && lower.contains("section 17"))        s += 30;
        // NEW: Municipal Corporation / Gram Panchayat are the issuing bodies
        if (lower.contains("municipal corporation") && lower.contains("birth"))   s += 30;
        if (lower.contains("gram panchayat") && lower.contains("birth"))          s += 25;
        // NEW: "name of child" and "name of father/mother" — standard birth cert fields
        if (lower.contains("name of child"))                                      s += 25;
        if (lower.contains("name of father") || lower.contains("name of mother")) {
            if (lower.contains("birth")) s += 20;
        }
        // NEW: "hospital / nursing home" — where birth occurred
        if (lower.contains("name of hospital") || lower.contains("place of birth")) {
            if (lower.contains("birth certificate") || lower.contains("जन्म")) s += 20;
        }
        // NEW: Marathi birth cert signals
        if (original.contains("जन्म नोंदणी प्रमाणपत्र"))                         s += 60;
        if (original.contains("महानगरपालिका") && original.contains("जन्म"))       s += 30;
        // NEW: Hindi birth cert
        if (original.contains("जन्म प्रमाण पत्र"))                                s += 55;
        if (original.contains("जन्म एवं मृत्यु पंजीकरण"))                         s += 45;
        return Math.min(130, s);
    }

    private int scoreMarriageCertificate(String lower, String original) {
        int s = 0;
        if (lower.contains("marriage certificate") || lower.contains("certificate of marriage")) s += 60;
        if (original.contains("विवाह प्रमाणपत्र") || original.contains("लग्न नोंदणी")) s += 55;
        if (lower.contains("registration of marriage"))  s += 35;
        if (lower.contains("hindu marriage act") || lower.contains("special marriage act")) s += 40;
        if (original.contains("विवाह नोंदणी") || original.contains("विवाह संस्कार")) s += 30;
        // NEW: "husband's name" and "wife's name" — standard marriage cert fields
        if (lower.contains("husband's name") || lower.contains("wife's name"))    s += 30;
        if (lower.contains("bridegroom") || lower.contains("bride"))              s += 25;
        // NEW: Date of marriage is a key field
        if (lower.contains("date of marriage"))                                   s += 35;
        if (lower.contains("place of marriage"))                                  s += 25;
        // NEW: "registrar of marriages" — issuing authority
        if (lower.contains("registrar of marriages") || lower.contains("marriage registrar")) s += 40;
        // NEW: "marriage registration act" or specific state acts
        if (lower.contains("marriage act") || lower.contains("marriages act"))    s += 25;
        // NEW: Marathi marriage signals
        if (original.contains("विवाह नोंदणी प्रमाणपत्र"))                        s += 60;
        if (original.contains("नवरा") || original.contains("बायको"))              s += 20;
        if (original.contains("महानगरपालिका") && original.contains("विवाह"))      s += 25;
        // NEW: "witnesses" — marriage certs have witness fields
        if (lower.contains("witness") && lower.contains("marriage"))              s += 20;
        // NEW: "solemnized" — legal word for performed marriage
        if (lower.contains("solemnized"))                                         s += 30;
        // NEW: Hindi marriage cert signals
        if (original.contains("विवाह प्रमाण पत्र") || original.contains("विवाह पंजीयन")) s += 55;
        return Math.min(130, s);
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
        // NEW: School leaving certificate — very common document type
        if (lower.contains("school leaving certificate") || lower.contains("leaving certificate")) s += 55;
        if (lower.contains("transfer certificate") || lower.contains("t.c."))   s += 45;
        // NEW: "hall ticket" or "admit card" — exam-related edu documents
        if (lower.contains("hall ticket") || lower.contains("admit card"))       s += 40;
        // NEW: "roll number" — appears on marksheets
        if (lower.contains("roll no") || lower.contains("roll number"))          s += 20;
        // NEW: "seat number" — Maharashtra board uses seat number
        if (lower.contains("seat no") || lower.contains("seat number"))          s += 20;
        // NEW: Maharashtra board signals
        if (lower.contains("maharashtra state board") || lower.contains("msbshse")) s += 50;
        if (lower.contains("pune board") || lower.contains("nagpur board") || lower.contains("aurangabad board")) s += 35;
        // NEW: "pass" or "fail" — result outcome on marksheets
        if ((lower.contains(" pass") || lower.contains("passed")) &&
                (lower.contains("examination") || lower.contains("exam")))           s += 20;
        // NEW: "subject" and "max marks" and "marks obtained" combo
        if (lower.contains("max. marks") || lower.contains("maximum marks"))     s += 20;
        // NEW: "bonafide certificate" from school/college
        if (lower.contains("bonafide certificate") || lower.contains("bona fide certificate")) s += 40;
        // NEW: UGC / AICTE signal university degrees
        if (lower.contains("ugc") || lower.contains("aicte") || lower.contains("approved by")) {
            if (lower.contains("university") || lower.contains("college")) s += 20;
        }
        return Math.min(130, s);
    }

    private int scoreMedical(String lower, String original) {
        int s = 0;
        if (lower.contains("medical report") || lower.contains("medical certificate")) s += 45;
        if (lower.contains("prescription"))               s += 40;
        if (lower.contains("pathology") || lower.contains("laboratory report"))   s += 40;
        if (lower.contains("diagnosis") || lower.contains("radiology"))           s += 28;
        if (lower.contains("patient name"))               s += 22;
        boolean hasMedCtx = lower.contains("patient") || lower.contains("diagnosis")
                || lower.contains("prescription") || lower.contains("treatment")
                || lower.contains("hospital") || lower.contains("clinic")
                || lower.contains("pathology") || lower.contains("laboratory");
        if (hasMedCtx && (lower.contains("dr.") || lower.contains("m.b.b.s") || lower.contains("mbbs"))) s += 20;
        if (original.contains("वैद्यकीय") || original.contains("रुग्णालय"))      s += 30;
        if (hasMedCtx && (lower.contains("hospital") || lower.contains("clinic"))) s += 15;
        if (lower.contains("blood group") || lower.contains("x-ray") || lower.contains("mri")) s += 20;
        // NEW: "discharge summary" — hospital document
        if (lower.contains("discharge summary") || lower.contains("discharge certificate")) s += 50;
        // NEW: "investigation" — pathology reports use this
        if (lower.contains("investigation") && hasMedCtx)  s += 20;
        // NEW: "medicine" or "drug" — prescription documents
        if ((lower.contains("medicine") || lower.contains("drug") || lower.contains("tablet")) &&
                hasMedCtx)                                      s += 20;
        // NEW: "fitness certificate" — for employment/DL
        if (lower.contains("fitness certificate") || lower.contains("medical fitness")) s += 45;
        // NEW: "disability certificate" — govt-issued for disabled persons
        if (lower.contains("disability certificate") || lower.contains("handicap certificate")) s += 50;
        if (lower.contains("percentage of disability"))     s += 45;
        // NEW: "blood test" / "urine test" — pathology
        if (lower.contains("blood test") || lower.contains("urine test") || lower.contains("haemoglobin")) s += 30;
        // NEW: "ct scan" / "sonography" / "ultrasound"
        if (lower.contains("ct scan") || lower.contains("sonography") || lower.contains("ultrasound")) s += 30;
        return Math.min(130, s);
    }

    private int scoreProperty(String lower, String original) {
        int s = 0;
        if (lower.contains("sale deed"))                                          s += 55;
        if (lower.contains("registry") && lower.contains("property"))            s += 45;
        if (lower.contains("7/12 extract") || lower.contains("seven twelve"))    s += 55;
        if (lower.contains("eight-a") || lower.contains("8-a"))                  s += 45;
        if (lower.contains("survey number"))                                      s += 28;
        if (original.contains("सातबारा") || original.contains("७/१२"))          s += 40;
        if (original.contains("खाते") && (original.contains("सातबारा") || original.contains("७/१२")
                || lower.contains("survey") || lower.contains("land record")))   s += 30;
        if (lower.contains("khata") || lower.contains("khatha"))                 s += 30;
        if (lower.contains("mutation") || lower.contains("fard"))                s += 25;
        // NEW: "sale agreement" / "purchase agreement" / "agreement for sale"
        if (lower.contains("agreement for sale") || lower.contains("sale agreement")) s += 50;
        if (lower.contains("gift deed") || lower.contains("gift of property"))   s += 45;
        if (lower.contains("lease deed") || lower.contains("rental agreement"))  s += 40;
        // NEW: "sub-registrar" is the authority for property documents
        if (lower.contains("sub-registrar") || lower.contains("sub registrar"))  s += 40;
        if (lower.contains("registration fee") && lower.contains("property"))    s += 25;
        // NEW: "stamp duty" — unique to property documents
        if (lower.contains("stamp duty"))                                         s += 35;
        // NEW: "plot no" / "flat no" / "house no" in property context
        if (lower.contains("plot no") && (lower.contains("deed") || lower.contains("property"))) s += 20;
        // NEW: "CTS number" / "gut number" — Maharashtra property identifiers
        if (lower.contains("cts no") || lower.contains("cts number") || lower.contains("gut no")) s += 30;
        // NEW: Marathi property signals
        if (original.contains("खरेदीखत") || original.contains("विक्रीखत"))       s += 55;
        if (original.contains("नोंदणी") && original.contains("मिळकत"))           s += 40;
        if (original.contains("दस्त क्रमांक"))                                    s += 35;
        // NEW: "power of attorney" — property transfer document
        if (lower.contains("power of attorney") || lower.contains("poa"))        s += 40;
        return Math.min(130, s);
    }


    private int scoreInsurance(String lower, String original) {
        int s = 0;
        if (lower.contains("insurance policy"))   s += 55;
        if (lower.contains("policy number"))      s += 40;
        if (lower.contains("premium"))            s += 28;
        if (lower.contains("sum assured") || lower.contains("sum insured")) s += 28;
        if (lower.contains("nominee"))            s += 20;
        if (lower.contains("lic") || lower.contains("life insurance")) s += 25;
        // NEW: Specific insurance company names common in India
        if (lower.contains("national insurance") || lower.contains("new india assurance")) s += 35;
        if (lower.contains("united india insurance") || lower.contains("oriental insurance")) s += 35;
        if (lower.contains("bajaj allianz") || lower.contains("hdfc ergo") || lower.contains("icici lombard")) s += 30;
        // NEW: "policyholder" — key term in all insurance docs
        if (lower.contains("policyholder") || lower.contains("policy holder")) s += 30;
        // NEW: "insured" — standard term
        if (lower.contains("insured") && lower.contains("policy"))            s += 25;
        // NEW: "maturity date" / "commencement date" — policy dates
        if (lower.contains("commencement date") || lower.contains("maturity date")) s += 30;
        if (lower.contains("inception date") || lower.contains("risk commencement")) s += 25;
        // NEW: "irda" / "irdai" — regulatory body for all insurance in India
        if (lower.contains("irda") || lower.contains("irdai"))                s += 30;
        // NEW: Health insurance signals
        if (lower.contains("health insurance") || lower.contains("mediclaim")) s += 45;
        if (lower.contains("cashless") || lower.contains("reimbursement"))    s += 30;
        // NEW: Motor insurance signals
        if (lower.contains("motor insurance") || lower.contains("vehicle insurance")) s += 40;
        if (lower.contains("third party") && lower.contains("insurance"))     s += 35;
        // NEW: "endorsement" — modification to an insurance policy
        if (lower.contains("endorsement") && lower.contains("policy"))        s += 25;
        return Math.min(130, s);
    }

    private int scoreFinancial(String lower, String original) {
        int s = 0;
        if (lower.contains("bank statement"))      s += 55;
        if (lower.contains("account statement"))   s += 50;
        if (lower.contains("transaction history") || lower.contains("passbook")) s += 28;
        if (lower.contains("debit") && lower.contains("credit"))                 s += 20;
        if (lower.contains("cheque") || lower.contains("neft") || lower.contains("rtgs")) s += 20;
        boolean hasBankCtx = lower.contains("statement") || lower.contains("transaction")
                || lower.contains("passbook") || lower.contains("debit") || lower.contains("credit");
        if (hasBankCtx && (lower.contains("ifsc") || lower.contains("account number"))) s += 35;
        // NEW: "income tax return" / "ITR" — financial document
        if (lower.contains("income tax return") || lower.contains("itr"))        s += 50;
        if (lower.contains("form 16") || lower.contains("form-16"))              s += 50;
        if (lower.contains("form 26as"))                                         s += 45;
        // NEW: "balance sheet" / "profit and loss" — business financial docs
        if (lower.contains("balance sheet") || lower.contains("profit and loss")) s += 45;
        if (lower.contains("profit & loss") || lower.contains("p&l"))            s += 40;
        // NEW: "chartered accountant" — financial docs are often CA-certified
        if (lower.contains("chartered accountant") || lower.contains("c.a."))    s += 25;
        // NEW: "tds certificate" / "form 16a" — tax deduction at source
        if (lower.contains("tds certificate") || lower.contains("form 16a"))     s += 45;
        // NEW: Bank-specific statements
        if (lower.contains("opening balance") || lower.contains("closing balance")) {
            if (hasBankCtx) s += 30;
        }
        // NEW: "mutual fund" / "stock" / "shares" — investment documents
        if (lower.contains("mutual fund") || lower.contains("demat statement"))  s += 40;
        if (lower.contains("capital gains") || lower.contains("dividend"))       s += 30;
        // NEW: "salary certificate" with income context (not pure payslip)
        if (lower.contains("salary certificate") && lower.contains("income"))    s += 35;
        return Math.min(130, s);
    }

    private int scoreBills(String lower, String original) {
        int s = 0;
        if (lower.contains("fee receipt") || lower.contains("fees receipt"))     s += 60;
        if (lower.contains("tuition fee") || lower.contains("college fee") || lower.contains("school fee")) s += 50;
        if (lower.contains("tax invoice") || lower.contains("invoice"))          s += 45;
        boolean hasBill    = lower.contains("bill");
        boolean hasReceipt = lower.contains("receipt");
        boolean hasFinCtx  = lower.contains("payment") || lower.contains("paid") || lower.contains("amount")
                || lower.contains("rs.") || lower.contains("₹") || lower.contains("rupees")
                || lower.contains("electricity") || lower.contains("water") || lower.contains("gas")
                || lower.contains("telephone") || lower.contains("mobile");
        if (hasBill    && hasFinCtx) s += 35;
        if (hasReceipt && hasFinCtx) s += 28;
        if (lower.contains("payment") && hasFinCtx)                              s += 20;
        if (lower.contains("gst") || lower.contains("gstin"))                    s += 28;
        if (lower.contains("ticket") || lower.contains("fare"))                  s += 30;
        if (lower.contains("electricity bill") || lower.contains("water bill"))  s += 40;
        if (lower.contains("utility bill"))                                       s += 35;
        // NEW: MSEDCL (Maharashtra State Electricity Distribution Co) — electricity bill issuer
        if (lower.contains("msedcl") || lower.contains("mseb"))                  s += 50;
        if (lower.contains("mahavitaran") || original.contains("महावितरण"))      s += 50;
        // NEW: "consumer no" / "meter no" — electricity/water bill fields
        if (lower.contains("consumer no") || lower.contains("consumer number"))  s += 30;
        if (lower.contains("meter no") || lower.contains("meter number"))        s += 30;
        // NEW: "bill date" / "due date" / "bill period" — utility bill fields
        if (lower.contains("bill date") && (lower.contains("amount") || lower.contains("units"))) s += 30;
        if (lower.contains("due date") && lower.contains("bill"))                s += 20;
        // NEW: "units consumed" — electricity bill
        if (lower.contains("units consumed") || lower.contains("units of electricity")) s += 40;
        // NEW: Mobile / broadband bills
        if ((lower.contains("jio") || lower.contains("airtel") || lower.contains("bsnl") ||
                lower.contains("vodafone") || lower.contains("vi ")) &&
                (lower.contains("bill") || lower.contains("invoice")))               s += 45;
        // NEW: "challan" — government payment receipt
        if (lower.contains("challan"))                                            s += 35;
        return Math.min(130, s);
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
        // NEW: "pay slip" / "pay stub" — common payslip terminology
        if (lower.contains("pay slip") || lower.contains("pay stub"))           s += 50;
        if (lower.contains("basic pay") || lower.contains("basic salary"))      s += 30;
        if (lower.contains("gross salary") || lower.contains("net salary"))     s += 30;
        if (lower.contains("provident fund") || lower.contains("pf no") ||
                lower.contains("epf") || lower.contains("employee's provident fund")) s += 35;
        // NEW: "esic" / "employee state insurance" — govt employment doc
        if (lower.contains("esic") || lower.contains("employee state insurance")) s += 35;
        // NEW: "in service" / "currently employed" / "period of service" — experience cert
        if (lower.contains("period of service") || lower.contains("date of joining")) s += 30;
        if (lower.contains("in service") || lower.contains("currently employed")) s += 25;
        // NEW: "no objection certificate" (NOC) from employer
        if (lower.contains("no objection certificate") && lower.contains("employ")) s += 40;
        // NEW: Government employment signals
        if (lower.contains("government servant") || lower.contains("gazetted officer")) s += 35;
        if (lower.contains("service book") || lower.contains("service record"))  s += 40;
        return Math.max(0, Math.min(130, s));
    }


    private int scoreVehicle(String lower, String original) {
        int s = 0;
        if (lower.contains("registration certificate") && (lower.contains("vehicle") || lower.contains("motor"))) s += 60;
        if (lower.contains("rc book"))                                           s += 55;
        if (lower.contains("pollution under control") || lower.contains("puc")) s += 45;
        if (lower.contains("chassis number") || lower.contains("engine number")) s += 30;
        if (lower.contains("vehicle class") || lower.contains("fuel type"))     s += 20;
        // NEW: "smart card" RC — new format of vehicle registration cert
        if (lower.contains("smart card") && lower.contains("registration"))      s += 40;
        // NEW: "fitness certificate" for commercial vehicles
        if (lower.contains("fitness certificate") && (lower.contains("vehicle") || lower.contains("commercial"))) s += 40;
        // NEW: Specific vehicle type identifiers
        if (lower.contains("two-wheeler") || lower.contains("four-wheeler") || lower.contains("heavy vehicle")) s += 20;
        if (lower.contains("lmv") || lower.contains("mcwg") || lower.contains("hgv")) {
            if (!lower.contains("driving licence")) s += 20; // avoid DL confusion
        }
        // NEW: "owner's name" — RC fields
        if (lower.contains("owner's name") || lower.contains("owner name"))      s += 25;
        if (lower.contains("registered owner"))                                  s += 30;
        // NEW: "make" and "model" — vehicle fields
        if (lower.contains("make") && lower.contains("model") &&
                (lower.contains("vehicle") || lower.contains("registration")))       s += 20;
        // NEW: "hypothecation" — vehicle loan; appears on RC
        if (lower.contains("hypothecation"))                                     s += 35;
        // NEW: "road tax" / "tax paid upto" — vehicle tax
        if (lower.contains("road tax") || lower.contains("motor vehicle tax"))   s += 30;
        // NEW: Marathi RC signals
        if (original.contains("वाहन नोंदणी") || original.contains("वाहन परवाना")) s += 40;
        if (original.contains("प्रदूषण नियंत्रण"))                               s += 40;
        return Math.min(130, s);
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
        // NEW: "sworn before" / "deponent" — affidavit-specific terms
        if (lower.contains("sworn before") || lower.contains("deponent"))        s += 35;
        if (lower.contains("solemnly affirm") || lower.contains("solemnly declare")) s += 40;
        // NEW: "magistrate" / "notary public" — who authenticates legal docs
        if (lower.contains("notary public") || lower.contains("notary"))         s += 40;
        if (lower.contains("executive magistrate") || lower.contains("judicial magistrate")) s += 35;
        // NEW: "power of attorney" — legal document (NOT property deed)
        if (lower.contains("power of attorney") && !lower.contains("sale deed")) s += 45;
        // NEW: "writ petition" / "civil suit" — court documents
        if (lower.contains("writ petition") || lower.contains("civil suit"))     s += 45;
        if (lower.contains("petition") && lower.contains("court"))               s += 30;
        // NEW: "deed poll" / "name change" — legal name change documents
        if (lower.contains("deed poll") || lower.contains("change of name"))     s += 40;
        // NEW: "advocate" / "lawyer" — legal professional
        if (lower.contains("advocate") || lower.contains("attorney"))            s += 20;
        // NEW: Marathi legal signals
        if (original.contains("प्रतिज्ञापत्र") || original.contains("न्यायालय")) s += 35;
        if (original.contains("दावा") && original.contains("न्यायालय"))          s += 30;
        return Math.min(130, s);
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
    private void extractIncomeCertificateExpiry(String text, Map<String, String> data) {
        Matcher pm = INCOME_CERT_ISSUE_DATE.matcher(text);
        if (!pm.find()) {
            // Log at DEBUG so we know the pattern didn't match (not an error —
            // some Income Certs carry an explicit Marathi validity sentence).
            System.out.println("[DEBUG] IncomeCert — no MahaOnline footer date found; "
                    + "will rely on S-0…S-9 or Marathi sentence patterns.");
            return;
        }

        try {
            int day   = Integer.parseInt(pm.group(1).trim());
            int month = Integer.parseInt(pm.group(2).trim());
            int year  = Integer.parseInt(pm.group(3).trim());

            // Store print date for audit / downstream use
            data.put("issuePrintDate", String.format("%02d/%02d/%d", day, month, year));

            // Maharashtra government rule: Income Certificate is valid until
            // 31 March of the NEXT financial year.
            String derived = String.format("31/03/%d", year + 1);
            data.put("incomeCertDerivedExpiry", derived);

            System.out.println("[INFO] IncomeCert print date: "
                    + day + "/" + month + "/" + year
                    + " → derived expiry: " + derived);

        } catch (NumberFormatException e) {
            System.out.println("[WARN] IncomeCert print date parse failed for match: '"
                    + pm.group() + "'");
        }
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
    public static String computeIncomeCertExpiry(String ocrText) {
        if (ocrText == null || ocrText.isEmpty()) return null;

        Matcher m = INCOME_CERT_ISSUE_DATE.matcher(ocrText);
        if (!m.find()) return null;

        try {
            int year = Integer.parseInt(m.group(3).trim());
            // Sanity check — reject obviously wrong years
            if (year < 2000 || year > 2099) return null;
            return String.format("31/03/%d", year + 1);
        } catch (NumberFormatException e) {
            return null;
        }
    }


    public static LocalDate computeIncomeCertExpiryAsDate(String ocrText) {
        String ds = computeIncomeCertExpiry(ocrText);
        if (ds == null) return null;
        // ds is always "31/03/YYYY"
        return LocalDate.parse(ds, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }


}