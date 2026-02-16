import api, { endpoints } from './api';

export const analyticsService = {
  // Get dashboard statistics
  getDashboardStats: async () => {
    const response = await api.get(endpoints.dashboardStats);
    return response.data;
  },

  // Get document statistics
  getDocumentStats: async () => {
    const response = await api.get(endpoints.documentStats);
    return response.data;
  },

  // Get expiry insights
  getExpiryInsights: async () => {
    const response = await api.get(endpoints.expiryInsights);
    return response.data;
  },

  // Get storage insights
  getStorageInsights: async () => {
    const response = await api.get(endpoints.storageInsights);
    return response.data;
  },

  // Get activity timeline
  getActivityTimeline: async (days = 7) => {
    const response = await api.get(`${endpoints.dashboardStats}/activity?days=${days}`);
    return response.data;
  },
};

export default analyticsService;