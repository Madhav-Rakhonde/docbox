package com.docbox.enums;

/**
 * Permission levels for document access
 * This is the CORE of DocBox's access control system
 */
public enum PermissionLevel {
    NO_ACCESS(0),           // Document completely hidden
    VIEW_ONLY(1),           // Can view but not download/share
    VIEW_DOWNLOAD(2),       // Can view and download but not share
    VIEW_DOWNLOAD_SHARE(3), // Can view, download, and share
    FULL_ACCESS(4);         // Complete control (automatic for own documents)

    private final int level;

    PermissionLevel(int level) {
        this.level = level;
    }

    public int getLevel() {
        return level;
    }

    /**
     * Check if this permission level is sufficient for a required level
     */
    public boolean isSufficientFor(PermissionLevel required) {
        return this.level >= required.level;
    }

    /**
     * Check if user can view document
     */
    public boolean canView() {
        return this.level >= VIEW_ONLY.level;
    }

    /**
     * Check if user can download document
     */
    public boolean canDownload() {
        return this.level >= VIEW_DOWNLOAD.level;
    }

    /**
     * Check if user can share document
     */
    public boolean canShare() {
        return this.level >= VIEW_DOWNLOAD_SHARE.level;
    }

    /**
     * Check if user has full access
     */
    public boolean hasFullAccess() {
        return this == FULL_ACCESS;
    }
}