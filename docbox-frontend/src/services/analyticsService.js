import api, { endpoints } from './api';

/**
 * Unwrap the standard Spring response envelope:
 *   { success: true, data: <payload>, message: "..." }
 *
 * Returns the inner `data` payload directly so every caller works the same way.
 * If the server sends a non-enveloped response (raw array / object) it is
 * returned as-is so nothing breaks.
 */
const unwrap = (response) => {
  const body = response.data;

  // Enveloped: { success, data, ... }
  if (body && typeof body === 'object' && 'success' in body) {
    if (!body.success) {
      // Server returned success:false — treat as an error
      throw new Error(body.message || 'Request failed');
    }
    return body.data ?? body; // return inner data (fall back to full body if data is absent)
  }

  // Non-enveloped — return raw body
  return body;
};

/**
 * Consistent error handler — logs and re-throws so callers can .catch() if needed.
 * The global Axios interceptor in api.js already shows toast for 5xx / 401,
 * so here we only log to avoid double-toasting.
 */
const handleError = (context, error) => {
  console.error(`[analyticsService] ${context} failed:`, error?.response?.data?.message || error?.message);
  throw error;
};

const analyticsService = {
  /**
   * Dashboard overview stats
   * Returns: { totalDocuments, storageUsedBytes, storageLimitBytes,
   *            documentsExpiringSoon, totalFamilyMembers, ... }
   */
  getDashboardStats: async () => {
    try {
      const response = await api.get(endpoints.dashboardStats);
      return unwrap(response);
    } catch (error) {
      handleError('getDashboardStats', error);
    }
  },

  /**
   * Per-category document breakdown
   * Returns: { categoryCounts: [...], totalDocuments, ... }
   */
  getDocumentStats: async () => {
    try {
      const response = await api.get(endpoints.documentStats);
      return unwrap(response);
    } catch (error) {
      handleError('getDocumentStats', error);
    }
  },

  /**
   * Expiry insights — the data that powers ExpiryAlerts.
   *
   * Returns: {
   *   urgentDocuments:  Document[],   // expiring within 30 days
   *   expiredDocuments: Document[],   // already expired
   *   totalExpiringSoon: number,
   *   totalExpired: number,
   * }
   *
   * NOTE: The Dashboard's fetchExpiryData() normalizes key-name variants
   * (urgentDocuments / expiringSoon / urgent) so minor backend naming changes
   * are handled there — this method just needs to return the unwrapped payload.
   */
  getExpiryInsights: async () => {
    try {
      const response = await api.get(endpoints.expiryInsights);
      return unwrap(response);
    } catch (error) {
      handleError('getExpiryInsights', error);
    }
  },

  /**
   * Storage breakdown
   * Returns: { usedBytes, limitBytes, usedPercentage, byCategory: [...] }
   */
  getStorageInsights: async () => {
    try {
      const response = await api.get(endpoints.storageInsights);
      return unwrap(response);
    } catch (error) {
      handleError('getStorageInsights', error);
    }
  },

  /**
   * Upload / activity timeline for the past N days.
   * Uses the dedicated endpoint key — no more hardcoded URL concatenation.
   *
   * Returns: { days: [...], totalUploads, totalDownloads }
   */
  getActivityTimeline: async (days = 7) => {
    try {
      // endpoints.activityTimeline should be '/analytics/activity' in api.js
      // Fallback: build from dashboardStats base if the key isn't added yet
      const url = endpoints.activityTimeline
        ?? `${endpoints.dashboardStats}/activity`;
      const response = await api.get(url, { params: { days } });
      return unwrap(response);
    } catch (error) {
      handleError('getActivityTimeline', error);
    }
  },
};

export default analyticsService;