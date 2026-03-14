import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = 'http://localhost:8080/api';

/**
 * CENTRALIZED API ENDPOINTS
 */
export const endpoints = {
  // Auth
  signup:       '/auth/signup',
  login:        '/auth/login',
  logout:       '/auth/logout',
  refreshToken: '/auth/refresh-token',

  // Users
  me:        '/users/me',
  userStats: '/users/stats',

  // Documents
  documents: '/documents',
  upload:    '/documents/upload',

  // Analytics
  dashboardStats:   '/analytics/dashboard-stats',
  documentStats:    '/analytics/document-stats',
  expiryInsights:   '/analytics/expiry-insights',
  storageInsights:  '/analytics/storage-insights',
  activityTimeline: '/analytics/activity',   // ← added proper key

  // Categories
  categories: '/categories',

  // Share
  share:         '/share',
  createShare:   '/share',
  shareLink:     (token)       => `/share/${token}`,
  downloadShare: (token)       => `/share/download/${token}`,
  myShareLinks:  '/share/me',
  shareQRCode:   (shareLinkId) => `/share/${shareLinkId}/qrcode`,

  // Family
  family: '/family-members',
};

/**
 * AXIOS INSTANCE
 */
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * REQUEST INTERCEPTOR
 */
api.interceptors.request.use(
  (config) => {
    if (!config.url) {
      throw new Error('API called with undefined URL');
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let browser set multipart boundary automatically
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // ✅ Log method + URL only — never log request body (may contain passwords / files)
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE INTERCEPTOR
 */
api.interceptors.response.use(
  (response) => {
    // ✅ Log status + URL only — never log response.data (leaks document contents)
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status  = error.response?.status;
    const url     = error.config?.url;
    const message = error.response?.data?.message || error.message;

    console.error(`❌ ${status ?? 'ERR'} ${url} — ${message}`);

    // Session expired
    if (status === 401) {
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/signup') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
      }
    }

    // Server error — show backend message if available
    if (status >= 500) {
      toast.error(message || 'Server error occurred');
    }

    return Promise.reject(error);
  }
);

export default api;