package com.docbox.enums;

/**
 * User roles in DocBox system
 * PRIMARY_ACCOUNT: Full control, can add family members and set permissions
 * SUB_ACCOUNT: Family member with login, permission-based access
 * PROFILE_ONLY: Just a profile for document tagging, cannot login
 */
public enum UserRole {
    PRIMARY_ACCOUNT,
    SUB_ACCOUNT,
    PROFILE_ONLY
}