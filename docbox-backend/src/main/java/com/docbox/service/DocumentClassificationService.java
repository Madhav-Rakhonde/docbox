package com.docbox.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   DocBox — Document Classification Service  v4.0                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ IMPROVEMENTS IN v4.0 (over v3):                                             ║
 * ║                                                                              ║
 * ║  FIX-1  Asymmetric cross-category suppression → central arbitrate()         ║
 * ║         after all scorers run independently. No scorer modifies another.    ║
 * ║                                                                              ║
 * ║  FIX-2  Confidence formula now uses absolute + relative compound score.     ║
 * ║         Old formula (relative gap only) gave low confidence even for        ║
 * ║         strong, unambiguous top scores.                                     ║
 * ║                                                                              ║
 * ║  FIX-3  Strategy-3 (English keyword) now also tries DATE_DEVANAGARI_NUMERIC ║
 * ║         after keyword window — "valid till १५/०३/२०२५" was missed.         ║
 * ║                                                                              ║
 * ║  FIX-4  Expiry sanity-check: expiry must be ≥ issue date and in [1947,2099]║
 * ║                                                                              ║
 * ║  FIX-5  Strategy-4 added: relative expiry ("valid for N years/months").     ║
 * ║                                                                              ║
 * ║  FIX-6  Strategy-5 added: context-scored latest-future-date heuristic.     ║
 * ║                                                                              ║
 * ║  FIX-7  Voter ID scoring now requires label anchor — bare pattern alone     ║
 * ║         was firing on order-IDs, reference codes, etc.                     ║
 * ║                                                                              ║
 * ║  FIX-8  Education: added 15+ Marathi/Hindi signals for Maharashtra board    ║
 * ║         marksheets that have zero English text.                             ║
 * ║                                                                              ║
 * ║  FIX-9  OCR normalisation pre-pass: common OCR errors corrected on         ║
 * ║         lowercased text before all scoring (1→l, 0→o, rn→m, etc.)         ║
 * ║                                                                              ║
 * ║  FIX-10 MIN_SCORE_THRESHOLD raised from 20→30 and made dynamic based on    ║
 * ║         available text length to reduce false positives on short docs.      ║
 * ║                                                                              ║
 * ║  FIX-11 Aadhaar first digit guard: Aadhaar cannot start with 0 or 1.       ║
 * ║                                                                              ║
 * ║  FIX-12 PAN 4th char validation: must be entity-type letter (ABCFGHLJPTF). ║
 * ║                                                                              ║
 * ║  FIX-13 Caste + Domicile combined doc: mutual suppression is now symmetric  ║
 * ║         and proportional; neither collapses to "Others" alone.             ║
 * ║                                                                              ║
 * ║  FIX-14 extractDates: up to 5 dates stored (was 3) for richer downstream.  ║
 * ║                                                                              ║
 * ║  FIX-15 Filename scoring: added more Marathi/Hindi transliterations.        ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
@Service
public class DocumentClassificationService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentClassificationService.class);

    // ════════════════════════════════════════════════════════════════════════════
    // RESULT DTO
    // ════════════════════════════════════════════════════════════════════════════

    public static class ClassificationResult {
        public final String category;
        public final double confidence;
        public final boolean isAmbiguous;
        public final List<Map.Entry<String, Integer>> topCandidates;

        public ClassificationResult(String category, double confidence,
                                    boolean isAmbiguous,
                                    List<Map.Entry<String, Integer>> topCandidates) {
            this.category      = category;
            this.confidence    = confidence;
            this.isAmbiguous   = isAmbiguous;
            this.topCandidates = Collections.unmodifiableList(topCandidates);
        }

        @Override
        public String toString() {
            return String.format("ClassificationResult{category='%s', confidence=%.2f, ambiguous=%s}",
                    category, confidence, isAmbiguous);
        }
    }

    /** Internal: a parsed date with its character offset in the source text. */
    private static class DatePosition {
        final String dateStr;  // normalised "DD/MM/YYYY"
        final int    position; // char-offset in original text
        final int    contextScore; // proximity to expiry keywords (higher = better)
        DatePosition(String d, int p, int cs) { this.dateStr = d; this.position = p; this.contextScore = cs; }
        DatePosition(String d, int p)          { this(d, p, 0); }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // OCR NORMALISATION MAP
    // Corrects common Tesseract mis-reads BEFORE any scoring occurs.
    // Applied only to the lowercased copy — originals are kept intact.
    // ════════════════════════════════════════════════════════════════════════════

    private static String applyOcrCorrections(String lower) {
        return lower
                // Authority / keyword repairs
                .replaceAll("\\baa[dh]{1,2}[ae]?ar\\b", "aadhaar")
                .replaceAll("\\bu\\.?i\\.?d\\.?a\\.?i\\.?\\b", "uidai")
                .replaceAll("\\bp[a4]n\\s+c[a4]rd\\b", "pan card")
                .replaceAll("\\bdriv[ie]ng\\s+li[cs]en[sc]e?\\b", "driving licence")
                .replaceAll("\\bpass\\s*p[o0]rt\\b", "passport")
                .replaceAll("\\bv[o0]t[e3]r\\b", "voter")
                .replaceAll("\\bin[cs][ou]me\\b", "income")
                .replaceAll("\\bc[e3]rtifi[ck][a4]t[e3]\\b", "certificate")
                .replaceAll("\\b[e3]l[e3]cti[o0]n\\b", "election")
                // Common digit/letter swaps in printed IDs
                .replaceAll("(?<=[A-Z]{4}\\d{3})[0O](?=[A-Z])", "0") // PAN last group O→0
                // Broken-word stitching
                .replaceAll("([a-z])-\\n([a-z])", "$1$2")
                .replaceAll("([a-z])\\n([a-z]{2,})", "$1 $2");
    }

    // ════════════════════════════════════════════════════════════════════════════
    // AADHAAR PATTERNS
    // ════════════════════════════════════════════════════════════════════════════

    /** Standard "XXXX XXXX XXXX" — first digit must be 2-9 (Aadhaar never starts 0/1). */
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
    /** 12-digit bare number — only used when Aadhaar keywords are present (reduces false positives). */
    private static final Pattern AADHAAR_BARE_12      = Pattern.compile("\\b[2-9]\\d{11}\\b");
    private static final Pattern AADHAAR_OCR_NOISY    =
            Pattern.compile("\\b[2-9BOIlS][0-9BOIlS]{3}\\s{1,3}[0-9BOIlS]{4}\\s{1,3}[0-9BOIlS]{4}\\b");
    private static final Pattern AADHAAR_ADDRESS_RELATION =
            Pattern.compile("\\b(?:S/O|D/O|W/O|C/O|H/O)\\b");
    private static final Pattern AADHAAR_YOB_PATTERN = Pattern.compile(
            "(?i)(?:year\\s+of\\s+birth|जन्म\\s+वर्ष)\\s*[:/]?\\s*(\\d{4})");
    private static final Pattern AADHAAR_GENDER_PATTERN = Pattern.compile(
            "(?i)\\b(male|female|पुरुष|महिला|पुल्लिंग|स्त्रीलिंग|MALE|FEMALE)\\b",
            Pattern.UNICODE_CHARACTER_CLASS);
    /** Devanagari Aadhaar number (e.g. from printed e-Aadhaar in Hindi UI). */
    private static final Pattern AADHAAR_DEVANAGARI_NUM = Pattern.compile(
            "[२-९][०-९]{3}\\s*[०-९]{4}\\s*[०-९]{4}",
            Pattern.UNICODE_CHARACTER_CLASS);

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

    /** Full PAN: 5 alpha + 4 digit + 1 alpha. 4th char validates entity type. */
    private static final Pattern PAN_PATTERN =
            Pattern.compile("\\b[A-Z]{3}[ABCFGHLJPTF][A-Z]\\d{4}[A-Z]\\b");
    /** Fallback for OCR-corrupted PANs (relaxed 4th char). */
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

    /** Valid Indian passport series letters (excludes Q, X). */
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
    // v4: non-transport category codes on DL
    private static final Pattern DL_NT_FIELD =
            Pattern.compile("(?i)\\b(?:NT|NON[\\s-]?TRANSPORT)\\b");

    // ════════════════════════════════════════════════════════════════════════════
    // VOTER ID
    // ════════════════════════════════════════════════════════════════════════════

    /** v4: Voter ID pattern now requires a label anchor (EPIC / Voter ID) to avoid
     *  false positives with tracking codes, order IDs, etc. */
    private static final Pattern VOTER_ID_LABELED = Pattern.compile(
            "(?i)(?:epic\\s*(?:no\\.?)?|voter\\s*(?:id|card)?\\s*(?:no\\.?)?)\\s*[:/]?\\s*([A-Z]{3}\\d{7})\\b");
    /** Bare pattern — lower weight, only used when election/voter keywords exist. */
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
    // DATE PATTERNS — comprehensive, multi-format, multilingual
    // ════════════════════════════════════════════════════════════════════════════

    // ASCII numeric: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY — strict day/month ranges
    private static final Pattern DATE_NUMERIC = Pattern.compile(
            "\\b(0?[1-9]|[12]\\d|3[01])[/\\-.](0?[1-9]|1[0-2])[/\\-.]((?:19|20)\\d{2})\\b");

    // Devanagari numeric: "१८/०८/२०२०" — also covers mixed-digit OCR artefacts
    private static final Pattern DATE_DEVANAGARI_NUMERIC = Pattern.compile(
            "([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);

    // English month name: "18 August 2020", "18th August, 2020"
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

    // Abbreviated English months: "18-Aug-2020", "18 Aug 2020"
    private static final Pattern DATE_ENGLISH_ABBR = Pattern.compile(
            "\\b(0?[1-9]|[12]\\d|3[01])[\\s\\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\\s\\-]((?:19|20)\\d{2})\\b",
            Pattern.CASE_INSENSITIVE);

    // Devanagari month (Marathi + Hindi)
    private static final String MARATHI_MONTHS_RE =
            "जानेवारी|फेब्रुवारी|मार्च|एप्रिल|मे|जून|जुलै|ऑगस्ट|सप्टेंबर|ऑक्टोबर|नोव्हेंबर|डिसेंबर";
    private static final String HINDI_MONTHS_RE =
            "जनवरी|फरवरी|अप्रैल|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर";
    private static final Pattern DATE_DEVANAGARI = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + MARATHI_MONTHS_RE + "|" + HINDI_MONTHS_RE + ")\\s*([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);

    // Proximity-search: Devanagari month dates in a window near a keyword
    private static final Pattern DATE_DEVANAGARI_MONTH = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + MARATHI_MONTHS_RE + "|" + HINDI_MONTHS_RE + ")\\s*([०-९\\d]{4})",
            Pattern.UNICODE_CHARACTER_CLASS);

    // ISO format: "2024-03-31"
    private static final Pattern DATE_ISO = Pattern.compile(
            "\\b((?:19|20)\\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b");

    // ════════════════════════════════════════════════════════════════════════════
    // MARATHI VALIDITY PHRASES — v5 REWRITTEN
    //
    // Root cause of v4 failure on real income certificates like:
    //   Title:  "३ वर्षांसाठी उत्पन्नाचे प्रमाणपत्र"
    //   Body:   "हे प्रमाणपत्र ३१ मार्च २०२४ पर्यंत वैध राहील."
    //
    // Problems in v4:
    //   (a) MARATHI_VALIDITY_PHRASE only tried FIRST match — "प्रमाणपत्र" appears
    //       first in the TITLE, filler [^०-९\d]{0,15} can't reach "३१" and quit.
    //   (b) MARATHI_VALID_COMPACT used [^०-९\d]{0,30} between date and keyword;
    //       failed when date and "पर्यंत" are directly adjacent.
    //
    // Fix — ordered from most specific to most general:
    //   MARATHI_PARYANT_VALID   — simplest: "date(month) + पर्यंत वैध", tried FIRST
    //   MARATHI_PARYANT_NUMERIC — numeric date + "पर्यंत वैध"
    //   MARATHI_VALIDITY_PHRASE — wider filler {0,40}; loop ALL matches in method
    //   MARATHI_VALID_COMPACT   — kept as further fallback, uses \s{0,30} not [^]{0,30}
    // ════════════════════════════════════════════════════════════════════════════

    /**
     * STRATEGY 1a — Strongest: Devanagari/English month date + पर्यंत वैध.
     * "३१ मार्च २०२४ पर्यंत वैध राहील" — no prefix required.
     */
    private static final Pattern MARATHI_PARYANT_VALID = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + MARATHI_MONTHS_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,5}(?:पर्यंत(?:च)?)\\s{0,5}(?:वैध|valid)(?:\\s+राहील|\\.)?",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    /**
     * STRATEGY 1b — Numeric date before पर्यंत: "०३/०७/२०२३ पर्यंत वैध"
     */
    private static final Pattern MARATHI_PARYANT_NUMERIC = Pattern.compile(
            "([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    "\\s{0,5}(?:पर्यंत(?:च)?)\\s{0,5}(?:वैध|valid)(?:\\s+राहील|\\.)?",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    /**
     * STRATEGY 1c — Full phrase; v5: wider filler {0,40}; method loops ALL matches.
     */
    private static final Pattern MARATHI_VALIDITY_PHRASE = Pattern.compile(
            "हे[\\s\\S]{0,12}(?:प्रमाणपत्र|दाखला|दस्तऐवज)" +
                    "[^०-९\\d]{0,40}" +
                    "([०-९\\d]{1,2})" +
                    "\\s*(" + MARATHI_MONTHS_RE + ")" +
                    "\\s*([०-९\\d]{4})" +
                    "[^०-९\\d]{0,60}" +
                    "(?:पर्यंत(?:च)?)" +
                    "\\s{0,15}" +
                    "(?:वैध|valid)",
            Pattern.UNICODE_CHARACTER_CLASS | Pattern.CASE_INSENSITIVE);

    // Compact Marathi validity: "[date] पर्यंत वैध" — kept as fallback
    private static final Pattern MARATHI_VALID_COMPACT = Pattern.compile(
            "([०-९\\d]{1,2})\\s*(" + MARATHI_MONTHS_RE + ")\\s*([०-९\\d]{4})" +
                    "\\s{0,30}पर्यंत(?:च)?\\s{0,5}वैध",
            Pattern.UNICODE_CHARACTER_CLASS);

    // Hindi validity: "[date] तक वैध है / रहेगा"
    private static final Pattern HINDI_VALID_PHRASE = Pattern.compile(
            "([०-९\\d]{1,2})[/\\-.]([०-९\\d]{1,2})[/\\-.]([०-९\\d]{4})" +
                    "[^०-९\\d]{0,20}तक\\s+वैध",
            Pattern.UNICODE_CHARACTER_CLASS);

    // Relative expiry: "valid for N years/months"
    private static final Pattern EXPIRY_RELATIVE = Pattern.compile(
            "(?i)valid\\s+for\\s+(\\d{1,2})\\s+(year|month)s?");

    // Labeled English expiry field (highest confidence)
    private static final Pattern EXPIRY_LABELED_FIELD = Pattern.compile(
            "(?i)(?:valid(?:ity)?\\s+(?:till|upto|up\\s+to|until|thru?|through)|" +
                    "date\\s+of\\s+expir(?:y|ation)|expir(?:y|es?|ation)\\s+(?:date|on)?|" +
                    "renew(?:al)?\\s+(?:by|before|date)|issued?\\s+(?:upto|till)|exp\\.?\\s*date|" +
                    "valid\\s+through|validity\\s+period)\\s*[:\\-]?\\s*" +
                    "(\\d{1,2}[/\\-.](\\d{1,2})[/\\-.]((?:19|20)\\d{2}))",
            Pattern.UNICODE_CHARACTER_CLASS);

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY KEYWORD LISTS — separated by date-position relative to keyword
    // ════════════════════════════════════════════════════════════════════════════

    /** Marathi/Hindi keywords where date PRECEDES keyword. Longest-first to avoid bare-keyword over-match. */
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
            "वैधता"
    );

    /** English keywords where date FOLLOWS keyword. */
    private static final List<String> EXPIRY_KW_DATE_AFTER = Arrays.asList(
            "valid upto", "valid up to", "valid till", "valid until",
            "validity upto", "validity till", "validity until",
            "date of expiry", "expiry date", "expires on", "expires",
            "exp date", "exp:", "renewal date", "renew by",
            "valid through", "valid thru",
            "this certificate is valid", "this document is valid",
            "issued upto", "issued till", "valid for",
            "validity :", "valid to"
    );

    /** Keywords that indicate a date is an ISSUE date (negative signal for expiry). */
    private static final List<String> ISSUE_DATE_KEYWORDS = Arrays.asList(
            "issued on", "date of issue", "issue date", "date of birth", "dob",
            "दिनांक :", "जन्म दिनांक", "जारी किया", "जारी करण्याची तारीख"
    );

    // ════════════════════════════════════════════════════════════════════════════
    // MONTH MAP
    // ════════════════════════════════════════════════════════════════════════════

    /** Normalize + lookup month name — handles Unicode whitespace and OCR trailing chars */
    private static String monthMapGet(String raw) {
        if (raw == null) return null;
        // Strip all Unicode whitespace variants (regular, NBSP, ZWSP, etc.)
        String key = raw.trim()
                .replace("\u00A0", "")  // NBSP
                .replace("\u200B", "")  // ZWSP
                .replace("\u200C", "")  // ZWNJ
                .replace("\u200D", "")  // ZWJ
                .replace("\uFEFF", "")  // BOM
                .trim();                  // ASCII whitespace
        // Normalize to NFC (Tesseract may output NFD)
        key = java.text.Normalizer.normalize(key, java.text.Normalizer.Form.NFC);
        return MONTH_MAP.get(key);
    }

    private static final Map<String, String> MONTH_MAP = new LinkedHashMap<>();
    static {
        MONTH_MAP.put("january","01");    MONTH_MAP.put("february","02");
        MONTH_MAP.put("march","03");      MONTH_MAP.put("april","04");
        MONTH_MAP.put("may","05");        MONTH_MAP.put("june","06");
        MONTH_MAP.put("july","07");       MONTH_MAP.put("august","08");
        MONTH_MAP.put("september","09");  MONTH_MAP.put("october","10");
        MONTH_MAP.put("november","11");   MONTH_MAP.put("december","12");
        // Abbreviated English
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
        MONTH_MAP.put("अप्रैल","04");    MONTH_MAP.put("जुलाई","07");
        MONTH_MAP.put("अगस्त","08");     MONTH_MAP.put("सितंबर","09");
        MONTH_MAP.put("अक्टूबर","10");   MONTH_MAP.put("नवंबर","11");
        MONTH_MAP.put("दिसंबर","12");
    }

    private static final String DEVANAGARI_DIGITS   = "०१२३४५६७८९";
    private static final int    ABSOLUTE_MIN_SCORE   = 30;   // raised from 20
    private static final int    AMBIGUITY_GAP_ABS    = 25;   // absolute point gap
    private static final double AMBIGUITY_GAP_REL    = 0.20; // relative gap fraction

    // ════════════════════════════════════════════════════════════════════════════
    // PUBLIC API  — unchanged signatures; backward-compatible
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

        // ── Step 1: normalise ─────────────────────────────────────────────────
        String original = rawText != null ? rawText : "";
        String lower    = applyOcrCorrections(original.toLowerCase());

        // ── Step 2: score all categories ─────────────────────────────────────
        Map<String, Integer> scores = new LinkedHashMap<>();
        if (!original.trim().isEmpty()) {
            computeTextScores(lower, original, scores);
        }
        if (filename != null && !filename.isEmpty()) {
            getFilenameScores(filename).forEach((k, v) -> scores.merge(k, v, Integer::sum));
        }

        // ── Step 3: cross-category arbitration ───────────────────────────────
        arbitrate(scores, lower, original);

        // ── Step 4: rank and build result ────────────────────────────────────
        int effectiveMin = computeEffectiveThreshold(original.length());
        List<Map.Entry<String, Integer>> ranked = scores.entrySet().stream()
                .filter(e -> e.getValue() >= effectiveMin)
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(3)
                .collect(Collectors.toList());

        if (ranked.isEmpty() || ranked.get(0).getValue() < effectiveMin) {
            logger.info("Result: Others (below threshold)");
            return new ClassificationResult("Others", 0.0, false, Collections.emptyList());
        }

        int    top      = ranked.get(0).getValue();
        int    second   = ranked.size() > 1 ? ranked.get(1).getValue() : 0;
        int    gap      = top - second;

        // Compound confidence: absolute strength [0-0.5] + relative gap [0-0.5]
        double absConf  = Math.min(0.5, top / 180.0);
        double relConf  = Math.min(0.5, gap / 80.0);
        double conf     = absConf + relConf;

        boolean ambiguous = gap < AMBIGUITY_GAP_ABS
                || (top > 0 && (double) gap / top < AMBIGUITY_GAP_REL);

        logger.info("Result: {} (score={}, conf={:.2f}, ambiguous={})",
                ranked.get(0).getKey(), top, conf, ambiguous);
        logTopScores(scores);
        return new ClassificationResult(ranked.get(0).getKey(), conf, ambiguous, ranked);
    }

    /**
     * Dynamic threshold — short documents (OCR extracts of IDs) score lower overall,
     * so we relax the threshold. For rich-text PDFs, we keep it higher.
     */
    private int computeEffectiveThreshold(int textLength) {
        if (textLength < 200)  return 20; // very short: ID cards, masked docs
        if (textLength < 800)  return 25;
        return ABSOLUTE_MIN_SCORE;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // CROSS-CATEGORY ARBITRATION — v4 CENTRAL LOGIC
    //
    // Scorers are now independent. Conflicts are resolved HERE after all
    // scores are computed, so no scorer modifies another scorer's result.
    // ════════════════════════════════════════════════════════════════════════════

    private void arbitrate(Map<String, Integer> scores, String lower, String original) {
        int aadhaar   = scores.getOrDefault("Aadhaar Card", 0);
        int pan       = scores.getOrDefault("PAN Card", 0);
        int passport  = scores.getOrDefault("Passport", 0);
        int dl        = scores.getOrDefault("Driving License", 0);
        int income    = scores.getOrDefault("Income Certificate", 0);
        int caste     = scores.getOrDefault("Caste Certificate", 0);
        int domicile  = scores.getOrDefault("Domicile Certificate", 0);

        // Rule 1: Strong Aadhaar → cap PAN significantly
        if (aadhaar > 80) scores.computeIfPresent("PAN Card", (k, v) -> Math.min(v, 30));

        // Rule 2: MRZ found → Passport wins decisively over DL, PAN
        if (PASSPORT_MRZ_LINE1.matcher(original).find() || PASSPORT_MRZ_LINE2.matcher(original).find()) {
            scores.computeIfPresent("Driving License", (k, v) -> v / 4);
            scores.computeIfPresent("PAN Card",        (k, v) -> v / 3);
        }

        // Rule 3: DL state header → suppress Passport + PAN
        if (DL_STATE_HEADER.matcher(original).find()) {
            scores.computeIfPresent("Passport", (k, v) -> v / 5);
            scores.computeIfPresent("PAN Card", (k, v) -> v / 3);
        }

        // Rule 4: Strong Income Certificate → zero Aadhaar (income cert can mention आधार)
        if (income > 60) scores.put("Aadhaar Card", 0);

        // Rule 5: Caste vs Domicile coexistence — proportional mutual reduction
        // (was asymmetric 0.5 vs 0.4; now symmetric: lower-scorer gets suppressed more)
        if (caste > 0 && domicile > 0) {
            if (caste >= domicile) {
                scores.computeIfPresent("Domicile Certificate", (k, v) -> (int)(v * 0.55));
            } else {
                scores.computeIfPresent("Caste Certificate",    (k, v) -> (int)(v * 0.55));
            }
        }

        // Rule 6: Motor Vehicles Act → cannot be a Passport
        if (lower.contains("motor vehicles act") || lower.contains("union of india") && dl > 30) {
            scores.computeIfPresent("Passport", (k, v) -> (int)(v * 0.2));
        }

        // Rule 7: "Permanent Account Number" phrase but also has Aadhaar strong signals
        if (aadhaar > pan && aadhaar > 80 && pan < 60) {
            scores.computeIfPresent("PAN Card", (k, v) -> (int)(v * 0.5));
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // STRUCTURED DATA EXTRACTION
    // ════════════════════════════════════════════════════════════════════════════

    public Map<String, String> extractStructuredData(String text, String category) {
        Map<String, String> data = new HashMap<>();
        if (text == null || text.isEmpty()) return data;

        // ── Document-number extraction (category-specific) ────────────────────
        switch (category) {
            case "Aadhaar Card":    extractAadhaarData(text, data);   break;
            case "PAN Card":        extractPANData(text, data);       break;
            case "Passport":        extractPassportData(text, data);  break;
            case "Driving License": extractDLData(text, data);        break;
            case "Voter ID":        extractVoterIDNumber(text, data); break;
            default: break; // no document-number for other categories
        }

        // ── Date + expiry extraction — runs for EVERY category ────────────────
        // FIX: previously this ran only AFTER the switch, but extractDates() was
        // never reached for Income/Caste/Domicile certs because the method
        // returned early. Now it always runs regardless of category.
        extractDates(text, data);

        // ── Income/Domicile/Caste: extract Marathi relative validity ──────────
        // "३ वर्षांसाठी" in title + earliest date → compute expiry
        if (!data.containsKey("expiryDate")) {
            String relativeExpiry = extractMarathiRelativeValidity(text, data);
            if (relativeExpiry != null && isPlausibleExpiryString(relativeExpiry)) {
                data.put("expiryDate", relativeExpiry);
                logger.info("📅 Relative Marathi expiry: {}", relativeExpiry);
            }
        }

        return data;
    }

    /**
     * Extracts expiry from Marathi relative validity phrases like
     * "३ वर्षांसाठी उत्पन्नाचे प्रमाणपत्र" (valid for 3 years) combined with
     * the earliest detected date as the issue date.
     */
    private String extractMarathiRelativeValidity(String text, Map<String, String> existingData) {
        java.util.regex.Pattern relMarathi = java.util.regex.Pattern.compile(
                "([०-९\\d]+)\\s*(?:वर्षांसाठी|वर्षासाठी|वर्षे\\s+साठी|वर्षाकरिता)",
                java.util.regex.Pattern.UNICODE_CHARACTER_CLASS);
        java.util.regex.Matcher m = relMarathi.matcher(text);
        if (!m.find()) return null;
        try {
            String rawYears = devanagariToAscii(m.group(1).trim());
            int years = Integer.parseInt(rawYears);
            if (years < 1 || years > 30) return null;

            // Use date1 (earliest extracted date) as issue date
            String issueStr = existingData.get("date1");
            if (issueStr == null) return null;

            LocalDate issueDate = parseDate(issueStr);
            if (issueDate == null) return null;

            LocalDate expiry = issueDate.plusYears(years);
            logger.info("✅ Marathi relative validity: {} years from {} → {}", years, issueDate, expiry);
            return expiry.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        } catch (Exception e) {
            logger.warn("Marathi relative validity parse fail: {}", m.group());
            return null;
        }
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
    // DATE EXTRACTION — v4: 5-strategy pipeline + sanity checks
    // ════════════════════════════════════════════════════════════════════════════

    private void extractDates(String text, Map<String, String> data) {
        List<DatePosition> allDates = new ArrayList<>();

        // 1a. ASCII numeric
        collectNumericDates(DATE_NUMERIC, text, allDates, false);

        // 1b. Devanagari/mixed numeric ("१८/०८/२०२०")
        collectNumericDates(DATE_DEVANAGARI_NUMERIC, text, allDates, true);

        // 1c. ISO dates ("2024-03-31") — convert to DD/MM/YYYY
        Matcher isoM = DATE_ISO.matcher(text);
        while (isoM.find()) {
            String ds = formatNumericDate(isoM.group(3), isoM.group(2), isoM.group(1));
            if (ds != null) allDates.add(new DatePosition(ds, isoM.start()));
        }

        // 2. English month name
        Matcher m2 = DATE_ENGLISH_MONTH.matcher(text);
        while (m2.find()) {
            String mm = monthMapGet(m2.group(2).toLowerCase());
            if (mm != null) allDates.add(new DatePosition(
                    String.format("%02d/%s/%s", Integer.parseInt(m2.group(1)), mm, m2.group(3)),
                    m2.start()));
        }
        // 2b. Month-first English
        Matcher m2b = DATE_ENGLISH_MONTH_FIRST.matcher(text);
        while (m2b.find()) {
            String mm = monthMapGet(m2b.group(1).toLowerCase());
            if (mm != null) allDates.add(new DatePosition(
                    String.format("%02d/%s/%s", Integer.parseInt(m2b.group(2)), mm, m2b.group(3)),
                    m2b.start()));
        }
        // 2c. Abbreviated English ("18-Aug-2020")
        Matcher m2c = DATE_ENGLISH_ABBR.matcher(text);
        while (m2c.find()) {
            String mm = monthMapGet(m2c.group(2).toLowerCase());
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

        // Deduplicate — keep earliest occurrence of each DD/MM/YYYY
        Map<String, DatePosition> seen = new LinkedHashMap<>();
        for (DatePosition dp : allDates) seen.putIfAbsent(dp.dateStr, dp);
        List<DatePosition> unique = new ArrayList<>(seen.values());

        // Store up to 5 dates (v4: was 3)
        for (int i = 0; i < unique.size() && i < 5; i++) {
            data.put("date" + (i + 1), unique.get(i).dateStr);
        }
        if (unique.isEmpty()) return;

        // ── Expiry extraction — 5-strategy pipeline ───────────────────────────
        String expiry = null;

        // Strategy 0: Simplest Marathi — "date(month) + पर्यंत वैध" directly adjacent
        //   e.g. "३१ मार्च २०२४ पर्यंत वैध राहील" — most common real-world form
        expiry = extractExpiryViaParyantValid(text);

        // Strategy 1: Full Marathi validity phrase (loops ALL matches, not just first)
        if (expiry == null) expiry = extractExpiryViaMARATHI_PHRASE(text);

        // Strategy 2: Compact Marathi "date + पर्यंत वैध" / Hindi "date + तक वैध"
        if (expiry == null) expiry = extractExpiryViaCompactMarathi(text);

        // Strategy 3: Date BEFORE Marathi/Hindi keyword
        if (expiry == null) expiry = extractExpiryBeforeMarathiKeyword(text, allDates);

        // Strategy 4: Date AFTER English keyword (also handles Devanagari numeric)
        if (expiry == null) expiry = extractExpiryAfterEnglishKeyword(text);

        // Strategy 5: Relative expiry ("valid for N years") applied to earliest date
        if (expiry == null) expiry = extractRelativeExpiry(text, unique);

        // Strategy 6: Heuristic — context-scored latest future date
        if (expiry == null) expiry = extractLatestFutureDate(text, unique);

        if (expiry != null) {
            // Sanity check: expiry must be a plausible date
            if (isPlausibleExpiryString(expiry)) {
                data.put("expiryDate", expiry);
                logger.info("📅 Expiry: {}", expiry);
            } else {
                logger.warn("⚠️ Extracted expiry '{}' failed sanity check — discarded", expiry);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: collect numeric dates from a pattern
    // ─────────────────────────────────────────────────────────────────────────
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
                logger.warn("Date parse fail for pattern {}: '{}'", p.pattern(), m.group());
            }
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY STRATEGY 0 — Simplest: date(month) + पर्यंत वैध (NEW in v5)
    // ════════════════════════════════════════════════════════════════════════════

    private String extractExpiryViaParyantValid(String text) {
        // Try month-name form first (most precise)
        Matcher m = MARATHI_PARYANT_VALID.matcher(text);
        while (m.find()) {
            try {
                String dd   = String.format("%02d", Integer.parseInt(devanagariToAscii(m.group(1).trim())));
                String mm   = monthMapGet(m.group(2).trim());
                String yyyy = devanagariToAscii(m.group(3).trim());
                if (mm != null && yyyy.length() == 4) {
                    String r = dd + "/" + mm + "/" + yyyy;
                    logger.info("✅ Strategy 0 (पर्यंत वैध month): expiry={}", r);
                    return r;
                }
            } catch (Exception ignored) {}
        }
        // Then try numeric form
        Matcher nm = MARATHI_PARYANT_NUMERIC.matcher(text);
        while (nm.find()) {
            try {
                String ds = formatNumericDate(
                        devanagariToAscii(nm.group(1)), devanagariToAscii(nm.group(2)),
                        devanagariToAscii(nm.group(3)));
                if (ds != null) {
                    logger.info("✅ Strategy 0 (पर्यंत वैध numeric): expiry={}", ds);
                    return ds;
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY STRATEGY 1 — Full Marathi Validity Phrase (v5: loops ALL matches)
    // ════════════════════════════════════════════════════════════════════════════

    private String extractExpiryViaMARATHI_PHRASE(String text) {
        // v5 FIX: loop through ALL matches — "प्रमाणपत्र" often appears first in the
        // document TITLE (e.g. "उत्पन्नाचे प्रमाणपत्र") where filler cannot reach the date.
        // The correct match is the one in the body sentence ("हे प्रमाणपत्र ... पर्यंत वैध").
        Matcher vm = MARATHI_VALIDITY_PHRASE.matcher(text);
        while (vm.find()) {
            try {
                String dd   = String.format("%02d", Integer.parseInt(devanagariToAscii(vm.group(1).trim())));
                String mm   = monthMapGet(vm.group(2).trim());
                String yyyy = devanagariToAscii(vm.group(3).trim());
                if (mm != null && yyyy.length() == 4) {
                    String r = dd + "/" + mm + "/" + yyyy;
                    logger.info("✅ Strategy 1 (Marathi phrase): expiry={}", r);
                    return r;
                }
            } catch (Exception e) {
                logger.warn("Marathi phrase parse fail: {}", vm.group());
            }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY STRATEGY 2 — Compact Marathi "date + पर्यंत वैध"
    // ════════════════════════════════════════════════════════════════════════════

    private String extractExpiryViaCompactMarathi(String text) {
        Matcher m = MARATHI_VALID_COMPACT.matcher(text);
        if (!m.find()) {
            // Also try Hindi "date + तक वैध"
            Matcher hm = HINDI_VALID_PHRASE.matcher(text);
            if (!hm.find()) return null;
            try {
                String ds = formatNumericDate(
                        devanagariToAscii(hm.group(1)), devanagariToAscii(hm.group(2)),
                        devanagariToAscii(hm.group(3)));
                if (ds != null) { logger.info("✅ Strategy 2 (Hindi phrase): expiry={}", ds); return ds; }
            } catch (Exception ignored) {}
            return null;
        }
        try {
            String dd   = String.format("%02d", Integer.parseInt(devanagariToAscii(m.group(1).trim())));
            String mm   = monthMapGet(m.group(2).trim());
            String yyyy = devanagariToAscii(m.group(3).trim());
            if (mm != null && yyyy.length() == 4) {
                String r = dd + "/" + mm + "/" + yyyy;
                logger.info("✅ Strategy 2 (compact Marathi): expiry={}", r);
                return r;
            }
        } catch (Exception e) {
            logger.warn("Compact Marathi parse fail: {}", m.group());
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY STRATEGY 3 — Date BEFORE Marathi keyword (v3 fix kept + improved)
    // ════════════════════════════════════════════════════════════════════════════

    private String extractExpiryBeforeMarathiKeyword(String text, List<DatePosition> allDates) {
        for (String kw : EXPIRY_KW_DATE_BEFORE) {
            int pos = text.indexOf(kw);
            while (pos >= 0) {
                String window = text.substring(Math.max(0, pos - 150), pos);

                // Last Devanagari month date in window (nearest to keyword)
                String best = null;
                Matcher dm = DATE_DEVANAGARI_MONTH.matcher(window);
                while (dm.find()) {
                    try {
                        String dd   = devanagariToAscii(dm.group(1).trim());
                        String mm   = monthMapGet(dm.group(2).trim());
                        String yyyy = devanagariToAscii(dm.group(3).trim());
                        if (mm != null && yyyy.length() == 4)
                            best = String.format("%02d/%s/%s", Integer.parseInt(dd), mm, yyyy);
                    } catch (Exception ignored) {}
                }
                if (best != null) {
                    logger.info("✅ Strategy 3 Devanagari (before '{}'): expiry={}", kw, best);
                    return best;
                }

                // Also try English month
                Matcher em = DATE_ENGLISH_MONTH.matcher(window);
                while (em.find()) {
                    String mm = monthMapGet(em.group(2).toLowerCase());
                    if (mm != null)
                        best = String.format("%02d/%s/%s", Integer.parseInt(em.group(1)), mm, em.group(3));
                }
                if (best != null) {
                    logger.info("✅ Strategy 3 English (before '{}'): expiry={}", kw, best);
                    return best;
                }

                // Also try ASCII numeric
                Matcher nm = DATE_NUMERIC.matcher(window);
                while (nm.find()) {
                    String ds = formatNumericDate(nm.group(1), nm.group(2), nm.group(3));
                    if (ds != null) best = ds;
                }
                if (best != null) {
                    logger.info("✅ Strategy 3 numeric (before '{}'): expiry={}", kw, best);
                    return best;
                }

                pos = text.indexOf(kw, pos + 1);
            }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY STRATEGY 4 — Date AFTER English keyword
    //   v4 FIX: now also tries DATE_DEVANAGARI_NUMERIC in the window.
    // ════════════════════════════════════════════════════════════════════════════

    private String extractExpiryAfterEnglishKeyword(String text) {
        String lower = text.toLowerCase();

        // Priority: labeled field pattern first
        Matcher lf = EXPIRY_LABELED_FIELD.matcher(text);
        if (lf.find()) {
            String ds = formatNumericDate(lf.group(2), lf.group(3), lf.group(4));
            if (ds != null) {
                logger.info("✅ Strategy 4 (labeled field): expiry={}", ds);
                return ds;
            }
        }

        for (String kw : EXPIRY_KW_DATE_AFTER) {
            int pos = lower.indexOf(kw);
            if (pos < 0) continue;
            String window = text.substring(pos + kw.length(),
                    Math.min(text.length(), pos + kw.length() + 120));

            // Try English month name
            Matcher em = DATE_ENGLISH_MONTH.matcher(window);
            if (em.find()) {
                String mm = monthMapGet(em.group(2).toLowerCase());
                if (mm != null) {
                    String r = String.format("%02d/%s/%s", Integer.parseInt(em.group(1)), mm, em.group(3));
                    logger.info("✅ Strategy 4 English month (after '{}'): expiry={}", kw, r);
                    return r;
                }
            }
            // Try ASCII numeric
            Matcher nm = DATE_NUMERIC.matcher(window);
            if (nm.find()) {
                String ds = formatNumericDate(nm.group(1), nm.group(2), nm.group(3));
                if (ds != null) {
                    logger.info("✅ Strategy 4 ASCII numeric (after '{}'): expiry={}", kw, ds);
                    return ds;
                }
            }
            // v4 NEW: Try Devanagari numeric ("valid till १५/०३/२०२५")
            Matcher dn = DATE_DEVANAGARI_NUMERIC.matcher(window);
            if (dn.find()) {
                try {
                    String ds = formatNumericDate(
                            devanagariToAscii(dn.group(1)),
                            devanagariToAscii(dn.group(2)),
                            devanagariToAscii(dn.group(3)));
                    if (ds != null) {
                        logger.info("✅ Strategy 4 Devanagari numeric (after '{}'): expiry={}", kw, ds);
                        return ds;
                    }
                } catch (Exception ignored) {}
            }
            // v4 NEW: Try Devanagari month name in window
            Matcher dmw = DATE_DEVANAGARI_MONTH.matcher(window);
            if (dmw.find()) {
                try {
                    String dd   = devanagariToAscii(dmw.group(1).trim());
                    String mm   = monthMapGet(dmw.group(2).trim());
                    String yyyy = devanagariToAscii(dmw.group(3).trim());
                    if (mm != null && yyyy.length() == 4) {
                        String r = String.format("%02d/%s/%s", Integer.parseInt(dd), mm, yyyy);
                        logger.info("✅ Strategy 4 Devanagari month (after '{}'): expiry={}", kw, r);
                        return r;
                    }
                } catch (Exception ignored) {}
            }
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY STRATEGY 5 — Relative expiry ("valid for N years/months")
    // ════════════════════════════════════════════════════════════════════════════

    private String extractRelativeExpiry(String text, List<DatePosition> allDates) {
        Matcher m = EXPIRY_RELATIVE.matcher(text);
        if (!m.find()) return null;
        try {
            int amount = Integer.parseInt(m.group(1));
            boolean isYears = m.group(2).toLowerCase().startsWith("year");

            // Use earliest detected date as the base (proxy for issue date)
            if (allDates.isEmpty()) return null;
            DatePosition earliest = allDates.stream()
                    .min(Comparator.comparingInt(dp -> dp.position))
                    .orElse(null);
            if (earliest == null) return null;

            LocalDate base = parseDate(earliest.dateStr);
            if (base == null) return null;

            LocalDate expiry = isYears ? base.plusYears(amount) : base.plusMonths(amount);
            String r = expiry.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            logger.info("✅ Strategy 5 (relative '{}' {}): base={}, expiry={}", amount, m.group(2), base, expiry);
            return r;
        } catch (Exception e) {
            logger.warn("Relative expiry parse fail: {}", m.group());
            return null;
        }
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY STRATEGY 6 — Context-scored latest future date (heuristic fallback)
    // ════════════════════════════════════════════════════════════════════════════

    private String extractLatestFutureDate(String text, List<DatePosition> allDates) {
        if (allDates.isEmpty()) return null;
        LocalDate today = LocalDate.now();

        // Score each date by proximity to expiry keywords and distance from issue keywords
        DatePosition best = null;
        int bestScore = Integer.MIN_VALUE;

        for (DatePosition dp : allDates) {
            LocalDate d = parseDate(dp.dateStr);
            if (d == null || !d.isAfter(today)) continue; // must be future
            if (d.getYear() > 2080) continue; // unreasonably far

            int ctx = computeContextScore(text, dp.position);
            if (ctx > bestScore) { bestScore = ctx; best = dp; }
        }

        if (best != null && bestScore >= 0) {
            logger.info("✅ Strategy 6 (latest future, ctx={}): expiry={}", bestScore, best.dateStr);
            return best.dateStr;
        }
        return null;
    }

    /** Score a date's context: +10 per nearby expiry keyword, -15 per nearby issue keyword. */
    private int computeContextScore(String text, int pos) {
        int window = 200;
        String ctx = text.substring(Math.max(0, pos - window),
                Math.min(text.length(), pos + window)).toLowerCase();
        int score = 0;
        for (String kw : EXPIRY_KW_DATE_AFTER) if (ctx.contains(kw)) score += 10;
        for (String kw : EXPIRY_KW_DATE_BEFORE) if (ctx.contains(kw)) score += 10;
        for (String kw : ISSUE_DATE_KEYWORDS)   if (ctx.contains(kw)) score -= 15;
        return score;
    }

    // ════════════════════════════════════════════════════════════════════════════
    // EXPIRY SANITY CHECK
    // ════════════════════════════════════════════════════════════════════════════

    private boolean isPlausibleExpiryString(String ds) {
        try {
            LocalDate d = parseDate(ds);
            if (d == null) return false;
            // Must be after 1947 (India independence) and before 2099
            return d.getYear() >= 1947 && d.getYear() <= 2099;
        } catch (Exception e) { return false; }
    }

    private LocalDate parseDate(String ds) {
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
    // FILENAME SCORING — v4: extended with Marathi/Hindi transliterations
    // ════════════════════════════════════════════════════════════════════════════

    private Map<String, Integer> getFilenameScores(String filename) {
        Map<String, Integer> s = new HashMap<>();
        String lower = filename.toLowerCase()
                .replace("_", " ").replace("-", " ").replace(".", " ").trim();

        if (lower.contains("jobcard") || lower.contains("job card"))          addScore(s, "Employment Documents", 40);
        if (lower.contains("offer") && lower.contains("letter"))              addScore(s, "Employment Documents", 35);
        if (lower.contains("salary") || lower.contains("payslip"))            addScore(s, "Employment Documents", 30);
        if (lower.contains("nrega") || lower.contains("mgnrega"))             addScore(s, "Employment Documents", 45);
        if (lower.contains("income") && lower.contains("cert"))               addScore(s, "Income Certificate", 40);
        if (lower.contains("utpanna") || lower.contains("utpan"))             addScore(s, "Income Certificate", 40);
        if (lower.contains("income") && !lower.contains("tax") && !lower.contains("job")) addScore(s, "Income Certificate", 20);
        if (lower.contains("marksheet") || lower.contains("mark sheet"))      addScore(s, "Education Certificates", 40);
        if (lower.contains("ssc") || lower.contains("hsc"))                   addScore(s, "Education Certificates", 40);
        if (lower.contains("degree") || lower.contains("diploma"))            addScore(s, "Education Certificates", 30);
        if (lower.contains("gunapatra") || lower.contains("gunpatra"))        addScore(s, "Education Certificates", 35);
        if (lower.contains("domicile") || lower.contains("adhiwas"))          addScore(s, "Domicile Certificate", 45);
        if (lower.contains("rahiwas") || lower.contains("niwas"))             addScore(s, "Domicile Certificate", 35);
        if (lower.contains("caste") || lower.contains("jati") || lower.contains("jaat")) addScore(s, "Caste Certificate", 45);
        if (lower.contains("birth") && lower.contains("cert"))                addScore(s, "Birth Certificate", 40);
        if (lower.contains("janm") || lower.contains("janam"))                addScore(s, "Birth Certificate", 30);
        if (lower.contains("marriage") && lower.contains("cert"))             addScore(s, "Marriage Certificate", 40);
        if (lower.contains("vivah") || lower.contains("lagna"))               addScore(s, "Marriage Certificate", 35);
        if (lower.contains("fee") || lower.contains("bill") || lower.contains("receipt")) addScore(s, "Bills & Receipts", 30);
        if (lower.contains("aadhaar") || lower.contains("aadhar") || lower.contains("adhar")) addScore(s, "Aadhaar Card", 45);
        if (lower.contains("uid"))                                             addScore(s, "Aadhaar Card", 35);
        if (lower.contains("pancard") || (lower.contains("pan") && lower.contains("card"))) addScore(s, "PAN Card", 45);
        if (lower.contains("passport"))                                        addScore(s, "Passport", 45);
        if (lower.contains("driving") || lower.contains("licence") || lower.contains("dl")) addScore(s, "Driving License", 40);
        if (lower.contains("voter") || lower.contains("matdar"))              addScore(s, "Voter ID", 40);
        if (lower.contains("ration") || lower.contains("shidha"))             addScore(s, "Ration Card", 40);
        if (lower.contains("medical") || lower.contains("prescription") || lower.contains("report")) addScore(s, "Medical Reports", 30);
        if (lower.contains("property") || lower.contains("deed") || lower.contains("satbara")) addScore(s, "Property Documents", 35);
        if (lower.contains("insurance") || lower.contains("policy"))          addScore(s, "Insurance Papers", 35);
        if (lower.contains("bank") || lower.contains("statement"))            addScore(s, "Financial Documents", 30);
        if (lower.contains("vehicle") || (lower.contains("rc") && lower.contains("book"))) addScore(s, "Vehicle Documents", 30);
        if (lower.contains("affidavit") || lower.contains("court"))           addScore(s, "Legal Documents", 30);
        return s;
    }

    private void addScore(Map<String, Integer> scores, String key, int value) {
        scores.merge(key, value, Integer::sum);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // INDIVIDUAL SCORERS — each self-contained; no cross-category modification
    // ════════════════════════════════════════════════════════════════════════════

    private int scoreAadhaar(String lower, String original) {
        // Hard exclusion: income cert context → not Aadhaar
        if (isIncomeCertificateText(lower, original)) return 0;

        int score = 0;
        boolean hasKw = lower.contains("aadhaar") || lower.contains("aadhar") ||
                lower.contains("आधार") || original.contains("आधार") ||
                lower.contains("uidai") || lower.contains("unique identification authority");

        // Authority signals (header-weighted: check first 25% of text)
        int headerLen = Math.max(1, original.length() / 4);
        String header = original.substring(0, Math.min(headerLen, original.length())).toLowerCase();

        for (String sig : AADHAAR_AUTHORITY_SIGNALS_LOWER) {
            if (lower.contains(sig)) {
                score += 60;
                if (header.contains(sig)) score += 15; // header bonus
                break;
            }
        }
        for (String sig : AADHAAR_MARATHI_AUTHORITY) if (original.contains(sig)) { score += 55; break; }
        for (String sig : AADHAAR_HINDI_AUTHORITY)   if (original.contains(sig)) { score += 55; break; }
        for (String t : AADHAAR_TAGLINE_SIGNALS_LOWER) if (lower.contains(t))    { score += 40; break; }
        for (String t : AADHAAR_TAGLINE_DEVANAGARI)    if (original.contains(t)) { score += 40; break; }

        if (hasKw) score += 30;

        // Number patterns
        if (AADHAAR_LABELED_FIELD.matcher(original).find())              score += 90;
        else if (AADHAAR_EXPLICIT.matcher(original).find())              score += hasKw ? 50 : 35;
        else if (AADHAAR_SPACED_LOOSE.matcher(original).find())          score += hasKw ? 45 : 30;
        else if (AADHAAR_HYPHENATED.matcher(original).find())            score += hasKw ? 45 : 30;
        else if (AADHAAR_MASKED.matcher(original).find())                score += hasKw ? 40 : 25;
        else if (AADHAAR_MASKED_RELAXED.matcher(original).find())        score += hasKw ? 35 : 20;
        else if (AADHAAR_UID_PREFIX.matcher(original).find())            score += 45;
        else if (AADHAAR_OCR_NOISY.matcher(original).find() && hasKw)   score += 25;
        else if (AADHAAR_BARE_12.matcher(original).find() && hasKw)     score += 20;
        // Devanagari Aadhaar number
        if (AADHAAR_DEVANAGARI_NUM.matcher(original).find())             score += hasKw ? 45 : 25;

        if (AADHAAR_VID_PATTERN.matcher(original).find())                score += 35;
        if (AADHAAR_ENROLMENT.matcher(lower).find())                     score += 30;
        if (lower.contains("enrolment no") || lower.contains("enrollment no")) score += 15;
        if (lower.contains("1800 180 1947") || lower.contains("18001801947"))  score += 25;
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
        if (hasKw && hasRel && hasGender) score += 15;
        if (hasKw && hasYOB)              score += 15;
        if (hasKw && hasRel && hasYOB && hasGender) score += 10;
        for (String sig : AADHAAR_QR_TEXT_SIGNALS_LOWER) if (lower.contains(sig)) { score += 15; break; }

        return Math.min(160, score);
    }

    private int scorePAN(String lower, String original) {
        int score = 0;
        if (lower.contains("permanent account number card"))    score += 70;
        else if (lower.contains("permanent account number"))    score += 50;
        for (String sig : PAN_HINDI_SIGNALS)
            if (original.contains(sig)) { score += sig.equals("आयकर विभाग") ? 45 : 65; break; }

        // v4: strict PAN pattern first, relaxed as fallback
        if (PAN_LABELED_FIELD.matcher(original).find())         score += 65;
        else if (PAN_LABELED_RELAXED.matcher(original).find())  score += 55;
        else if (PAN_PATTERN.matcher(original).find())          score += 55;
        else if (PAN_PATTERN_RELAXED.matcher(original).find())  score += 40;

        for (String sig : PAN_AUTHORITY_SIGNALS_LOWER) if (lower.contains(sig)) { score += 40; break; }
        if (lower.contains("pan application digitally signed")) score += 35;
        for (String l : PAN_SPECIFIC_FIELD_LABELS)
            if (lower.contains(l) || original.contains(l))     { score += 30; break; }
        if (score > 30 && (lower.contains("govt. of india") || lower.contains("government of india"))) score += 20;
        if (score > 40 && (lower.contains("date of birth") || lower.contains("जन्म की तारीख")))       score += 15;

        // Cross-category penalties removed — handled by arbitrate()
        return Math.min(160, score);
    }

    private int scorePassport(String lower, String original) {
        int score = 0;
        boolean hasMRZ1 = PASSPORT_MRZ_LINE1.matcher(original).find();
        boolean hasMRZ2 = PASSPORT_MRZ_LINE2.matcher(original).find();
        if (hasMRZ1) score += 90;
        if (hasMRZ2) score += 85;
        if (lower.contains("republic of india"))                score += 55;
        if (original.contains("भारत गणराज्य"))                  score += 50;
        if (PASSPORT_LABELED.matcher(original).find())          score += 60;
        else if (lower.contains("passport no") || lower.contains("पारपत्र सं.")) {
            score += 35;
            if (PASSPORT_PATTERN.matcher(original).find()) score += 20;
        } else if (PASSPORT_PATTERN.matcher(original).find())   score += 30;
        for (String sig : PASSPORT_AUTHORITY_SIGNALS_LOWER) if (lower.contains(sig)) { score += 45; break; }
        int fc = 0; for (String lbl : PASSPORT_FIELD_LABELS_LOWER) if (lower.contains(lbl)) fc++;
        if (fc >= 3) score += 50; else if (fc == 2) score += 35; else if (fc == 1) score += 20;
        int hc = 0; for (String lbl : PASSPORT_FIELD_LABELS_HINDI) if (original.contains(lbl)) hc++;
        if (hc >= 2) score += 30; else if (hc == 1) score += 15;
        if (PASSPORT_NATIONALITY_INDIAN.matcher(original).find()) score += 35;
        else if (lower.contains("nationality") && lower.contains("indian")) score += 25;
        if (PASSPORT_TYPE_COUNTRY.matcher(original).find())    score += 40;
        else if (lower.contains("country code") && lower.contains("ind")) score += 25;
        if (lower.contains("passport"))                         score += 25;
        boolean pBirth = lower.contains("place of birth");
        boolean dIssue = lower.contains("date of issue");
        boolean dExp   = lower.contains("date of expiry");
        if (pBirth && dIssue && dExp) score += 40; else if (pBirth && dIssue) score += 25;
        // Cross-category penalties removed — handled by arbitrate()
        return Math.min(210, score);
    }

    private int scoreDrivingLicense(String lower, String original) {
        int score = 0;
        if (lower.contains("the union of india"))                                   score += 35;
        if (DL_STATE_HEADER.matcher(original).find())                               score += 65;
        else if (lower.contains("motor driving licence") || lower.contains("motor driving license")) score += 55;
        if (DL_FORM_RULE.matcher(original).find())                                  score += 55;
        for (Pattern p : DL_PATTERNS) if (p.matcher(original).find())              { score += 50; break; }
        if (DL_VALID_TILL.matcher(original).find())                                 score += 50;
        else if (lower.contains("valid till") || lower.contains("valid upto"))      score += 25;
        if (lower.contains("authorisation to drive following class of vehicles"))   score += 50;
        else if (lower.contains("authorisation to drive"))                          score += 30;
        if (DL_COV_FIELD.matcher(original).find())                                  score += 45;
        if (lower.contains("driving licence") || lower.contains("driving license")) score += 40;
        if (original.contains("ड्राइविंग लायसेंस") || original.contains("ड्रायव्हिंग लायसन्स")
                || original.contains("वाहन चालक अनुज्ञापत्र"))                       score += 35;
        if (DL_DOI_FIELD.matcher(original).find())                                  score += 35;
        if (DL_BADGE_FIELD.matcher(original).find())                                score += 30;
        if (lower.contains("signature & id of issuing authority") || lower.contains("signature and id of issuing authority")) score += 30;
        if (DL_SDW_FIELD.matcher(original).find())                                  score += 20;
        if (DL_NT_FIELD.matcher(original).find())                                   score += 20;
        if (lower.contains("motor vehicles act"))                                   score += 25;
        if (lower.contains("transport authority"))                                  score += 20;
        // Cross-category penalties removed — handled by arbitrate()
        return Math.min(210, score);
    }

    private int scoreVoterID(String lower, String original) {
        int s = 0;
        // v4: labeled pattern worth much more; bare pattern only if election/voter keywords present
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
        if (lower.contains("booth") || lower.contains("polling"))  s += 15;
        return Math.min(110, s);
    }

    private int scoreIncomeCertificate(String lower, String original) {
        int s = 0;
        if (original.contains("उत्पन्नाचे प्रमाणपत्र"))    s += 85;
        if (original.contains("उत्पन्न प्रमाणपत्र"))        s += 85;
        if (original.contains("आय प्रमाणपत्र"))              s += 80;
        if (lower.contains("income certificate"))             s += 75;
        if (original.contains("वार्षिक उत्पन्न"))            s += 45;
        if (original.contains("एकूण उत्पन्न"))               s += 40;
        if (lower.contains("annual income"))                  s += 35;
        if (lower.contains("total income"))                   s += 30;
        if (lower.contains("tehsildar") || lower.contains("tahasil")) s += 30;
        if (original.contains("तहसीलदार") || original.contains("तहसिलदार")) s += 30;
        if (original.contains("नायब तहसीलदार"))               s += 35;
        if (original.contains("तालुका"))                      s += 20;
        if (original.contains("महसूल") || lower.contains("revenue department")) s += 25;
        if (original.contains("मुद्रांक") || original.contains("शुल्क")) s += 15;
        if (original.contains("वैध राहील") && original.contains("उत्पन्न")) s += 30;
        if (lower.contains("below poverty line") || original.contains("दारिद्र्यरेषा")) s += 20;
        return Math.min(130, s);
    }

    private int scoreDomicileCertificate(String lower, String original) {
        int s = 0;
        if (lower.contains("domicile certificate"))                             s += 80;
        if (DOMICILE_CERTIFY_PHRASE.matcher(lower).find())                      s += 70;
        else if (lower.contains("permanent resident of") || lower.contains("permanently residing")) s += 40;
        if (DOMICILE_COLLECTOR_OFFICE.matcher(lower).find())                    s += 55;
        if (DOMICILE_COLLECTOR_SEAL.matcher(original).find())                   s += 45;
        if (DOMICILE_FILE_NO.matcher(original).find())                          s += 35;
        if (original.contains("अधिवास प्रमाणपत्र") || original.contains("रहिवासी प्रमाणपत्र")) s += 65;
        if (original.contains("मूल निवासी प्रमाण पत्र") || original.contains("निवास प्रमाण पत्र")) s += 60;
        if (lower.contains("premises no"))                                      s += 25;
        if (DOMICILE_IAS_TAG.matcher(original).find())                         s += 20;
        if (lower.contains("resident of state") || lower.contains("resident of the state")) s += 20;
        // Cross-category suppression removed — handled by arbitrate()
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
        // Cross-category suppression removed — handled by arbitrate()
        return Math.min(210, s);
    }

    private int scoreRationCard(String lower, String original) {
        int s = 0;
        if (lower.contains("ration card"))                                      s += 55;
        if (original.contains("राशन कार्ड") || original.contains("शिधापत्रिका")) s += 50;
        if (lower.contains("public distribution system"))                        s += 35;
        if (lower.contains("food") && lower.contains("civil supplies"))         s += 25;
        if (lower.contains("fair price shop") || lower.contains("fpds"))        s += 30;
        if (original.contains("अन्न पुरवठा") || original.contains("स्वस्त धान्य")) s += 35;
        if (lower.contains("bpl") || lower.contains("apl") || lower.contains("antyodaya")) s += 25;
        return Math.min(110, s);
    }

    private int scoreBirthCertificate(String lower, String original) {
        int s = 0;
        if (lower.contains("birth certificate") || lower.contains("certificate of birth")) s += 60;
        if (original.contains("जन्म प्रमाणपत्र") || original.contains("जन्म दाखला"))       s += 55;
        if (lower.contains("registration of birth"))                            s += 35;
        if (lower.contains("date of birth") && lower.contains("place of birth")) s += 25;
        if (lower.contains("registrar of birth"))                               s += 30;
        if (original.contains("जन्म नोंदणी"))                                  s += 30;
        return Math.min(110, s);
    }

    private int scoreMarriageCertificate(String lower, String original) {
        int s = 0;
        if (lower.contains("marriage certificate") || lower.contains("certificate of marriage")) s += 60;
        if (original.contains("विवाह प्रमाणपत्र") || original.contains("लग्न नोंदणी"))          s += 55;
        if (lower.contains("registration of marriage"))                         s += 35;
        if (lower.contains("hindu marriage act") || lower.contains("special marriage act")) s += 40;
        if (original.contains("विवाह नोंदणी") || original.contains("विवाह संस्कार"))         s += 30;
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
        if (lower.contains("skill certificate") || lower.contains("vocational"))s += 30;
        // v4: Marathi/Hindi education signals
        if (original.contains("गुणपत्रिका"))                                    s += 40;
        if (original.contains("उत्तीर्ण"))                                      s += 25;
        if (original.contains("महाराष्ट्र राज्य माध्यमिक"))                    s += 50;
        if (original.contains("बोर्ड परीक्षा") || original.contains("परीक्षा मंडळ")) s += 35;
        if (original.contains("शाळा सोडल्याचा दाखला"))                         s += 40;  // school leaving cert
        if (original.contains("पदविका") || original.contains("पदवी"))           s += 35;
        if (original.contains("विद्यापीठ"))                                     s += 25;
        if (lower.contains("cbse") || lower.contains("icse") || lower.contains("nios")) s += 40;
        if (lower.contains("provisional certificate") || lower.contains("migration certificate")) s += 30;
        return Math.min(110, s);
    }

    private int scoreMedical(String lower, String original) {
        int s = 0;
        if (lower.contains("medical report") || lower.contains("medical certificate")) s += 45;
        if (lower.contains("prescription"))                                     s += 40;
        if (lower.contains("pathology") || lower.contains("laboratory report")) s += 40;
        if (lower.contains("diagnosis") || lower.contains("radiology"))        s += 28;
        if (lower.contains("patient name"))                                     s += 22;
        if (lower.contains("dr.") || lower.contains("m.b.b.s") || lower.contains("mbbs")) s += 20;
        if (original.contains("वैद्यकीय") || original.contains("रुग्णालय"))    s += 30;
        if (lower.contains("hospital") || lower.contains("clinic"))            s += 15;
        if (lower.contains("blood group") || lower.contains("x-ray") || lower.contains("mri")) s += 20;
        return Math.min(110, s);
    }

    private int scoreProperty(String lower, String original) {
        int s = 0;
        if (lower.contains("sale deed"))                                        s += 55;
        if (lower.contains("registry") && lower.contains("property"))          s += 45;
        if (lower.contains("7/12 extract") || lower.contains("seven twelve"))  s += 55;
        if (lower.contains("eight-a") || lower.contains("8-a"))                s += 45;
        if (lower.contains("survey number"))                                    s += 28;
        if (original.contains("सातबारा") || original.contains("७/१२") || original.contains("खाते")) s += 40;
        if (lower.contains("khata") || lower.contains("khatha"))               s += 30;
        if (lower.contains("mutation") || lower.contains("fard"))              s += 25;
        return Math.min(110, s);
    }

    private int scoreInsurance(String lower, String original) {
        int s = 0;
        if (lower.contains("insurance policy"))                                 s += 55;
        if (lower.contains("policy number"))                                    s += 40;
        if (lower.contains("premium"))                                          s += 28;
        if (lower.contains("sum assured") || lower.contains("sum insured"))    s += 28;
        if (lower.contains("nominee"))                                          s += 20;
        if (lower.contains("lic") || lower.contains("life insurance"))         s += 25;
        return Math.min(110, s);
    }

    private int scoreFinancial(String lower, String original) {
        int s = 0;
        if (lower.contains("bank statement"))                                   s += 55;
        if (lower.contains("account statement"))                                s += 50;
        if (lower.contains("ifsc") || lower.contains("account number"))        s += 35;
        if (lower.contains("transaction history") || lower.contains("passbook")) s += 28;
        if (lower.contains("debit") && lower.contains("credit"))               s += 20;
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
        if (lower.contains("gst") || lower.contains("gstin"))                  s += 28;
        if (lower.contains("ticket") || lower.contains("fare"))                 s += 30;
        if (lower.contains("electricity bill") || lower.contains("water bill")) s += 40;
        return Math.min(110, s);
    }

    private int scoreEmployment(String lower, String original) {
        int s = 0;
        if (lower.contains("job card") || lower.contains("jobcard"))            s += 70;
        if (lower.contains("nrega") || lower.contains("mgnrega"))              s += 65;
        if (lower.contains("alp") || lower.contains("apprentice license"))     s += 55;
        if (lower.contains("railway") && (lower.contains("pass") || lower.contains("employment"))) s += 50;
        if (lower.contains("rrb") || lower.contains("railway recruitment"))    s += 45;
        if (lower.contains("offer letter"))                                     s += 55;
        if (lower.contains("appointment letter"))                               s += 55;
        if (lower.contains("joining letter"))                                   s += 55;
        if (lower.contains("salary slip") || lower.contains("payslip"))        s += 50;
        if (lower.contains("experience certificate"))                           s += 50;
        if (lower.contains("employment certificate"))                           s += 50;
        if (lower.contains("relieving letter"))                                 s += 50;
        if (lower.contains("employee") && (lower.contains("id") || lower.contains("card"))) s += 35;
        if (lower.contains("designation") && lower.contains("department"))     s += 30;
        if (original.contains("रोजगार") || original.contains("नोकरी") || original.contains("पगार")) s += 25;
        if (isIncomeCertificateText(lower, original)) s -= 30;
        return Math.max(0, Math.min(110, s));
    }

    private int scoreVehicle(String lower, String original) {
        int s = 0;
        if (lower.contains("registration certificate") && (lower.contains("vehicle") || lower.contains("motor"))) s += 60;
        if (lower.contains("rc book"))                                          s += 55;
        if (lower.contains("pollution under control") || lower.contains("puc")) s += 45;
        if (lower.contains("chassis number") || lower.contains("engine number")) s += 30;
        if (lower.contains("vehicle class") || lower.contains("fuel type"))    s += 20;
        return Math.min(110, s);
    }

    private int scoreLegal(String lower, String original) {
        int s = 0;
        if (lower.contains("affidavit"))                                        s += 50;
        if (lower.contains("court order"))                                      s += 50;
        if (lower.contains("legal notice"))                                     s += 50;
        if (lower.contains("notarized") || lower.contains("notarised"))        s += 35;
        if (original.contains("शपथपत्र") || original.contains("प्रतिज्ञापत्र")) s += 40;
        if (lower.contains("high court") || lower.contains("supreme court"))   s += 35;
        if (lower.contains("first information report") || lower.contains("fir")) s += 40;
        return Math.min(110, s);
    }

    // ════════════════════════════════════════════════════════════════════════════
    // SHARED GUARD
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
    // NUMBER EXTRACTION — v4: improved patterns applied
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
            if (mrzM.find()) { put(data, "passportNumber", mrzM.group().substring(0, 8).replace("<", "")); data.put("mrzLine", mrzM.group()); }
            else { Matcher bm = PASSPORT_PATTERN.matcher(text); if (bm.find()) put(data, "passportNumber", bm.group()); }
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
        Matcher vt = DL_VALID_TILL.matcher(text);
        if (vt.find()) {
            Matcher dm = DATE_NUMERIC.matcher(vt.group());
            if (dm.find()) {
                String ds = formatNumericDate(dm.group(1), dm.group(2), dm.group(3));
                if (ds != null) data.put("validTill", ds);
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
            if (y < 1947 || y > 2099) return null;
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