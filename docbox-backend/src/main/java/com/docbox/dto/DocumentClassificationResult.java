package com.docbox.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * ✅ Structured classification result with full debugging info
 */
public class DocumentClassificationResult {
    private String category;
    private int confidence;
    private List<String> matchedKeywords;
    private boolean newCategoryCreated;
    private String debugInfo;
    private int topScore;
    private String secondBestCategory;
    private int secondBestScore;

    public DocumentClassificationResult() {
        this.matchedKeywords = new ArrayList<>();
        this.newCategoryCreated = false;
    }


    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public int getConfidence() { return confidence; }
    public void setConfidence(int confidence) { this.confidence = confidence; }

    public List<String> getMatchedKeywords() { return matchedKeywords; }
    public void setMatchedKeywords(List<String> keywords) { this.matchedKeywords = keywords; }
    public void addMatchedKeyword(String keyword) { this.matchedKeywords.add(keyword); }

    public boolean isNewCategoryCreated() { return newCategoryCreated; }
    public void setNewCategoryCreated(boolean created) { this.newCategoryCreated = created; }

    public String getDebugInfo() { return debugInfo; }
    public void setDebugInfo(String debugInfo) { this.debugInfo = debugInfo; }

    public int getTopScore() { return topScore; }
    public void setTopScore(int score) { this.topScore = score; }

    public String getSecondBestCategory() { return secondBestCategory; }
    public void setSecondBestCategory(String cat) { this.secondBestCategory = cat; }

    public int getSecondBestScore() { return secondBestScore; }
    public void setSecondBestScore(int score) { this.secondBestScore = score; }

    @Override
    public String toString() {
        return String.format("Classification{category='%s', confidence=%d, keywords=%s, newCategory=%b}",
                category, confidence, matchedKeywords, newCategoryCreated);
    }
}