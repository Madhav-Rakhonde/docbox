import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * ✅ CENTRALIZED API ENDPOINTS
 * These names MUST match all services that import them
 */
export const endpoints = {
  // Auth
  signup: '/auth/signup',
  login: '/auth/login',
  logout: '/auth/logout',
  refreshToken: '/auth/refresh-token',

  // Users
  me: '/users/me',
  userStats: '/users/stats',

  // Documents
  documents: '/documents',
  upload: '/documents/upload',

  // Analytics
  dashboardStats: '/analytics/dashboard-stats',
  documentStats: '/analytics/document-stats',
  expiryInsights: '/analytics/expiry-insights',
  storageInsights: '/analytics/storage-insights',

  // Categories
  categories: '/categories',

  // Share
  share: '/share',                 // base path
  createShare: '/share',           // ✅ POST to create share link
  shareLink: (token) => `/share/${token}`,  // GET shared document
  downloadShare: (token) => `/share/download/${token}`, // GET download
  myShareLinks: '/share/me',       // GET my shares
  shareQRCode: (shareLinkId) => `/share/${shareLinkId}/qrcode`, // GET QR code

  // Family
  family: '/family-members',
};


/**
 * ✅ AXIOS INSTANCE
 */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * ✅ REQUEST INTERCEPTOR
 */
api.interceptors.request.use(
  (config) => {
    // 🔒 Prevent undefined URL bugs (CRITICAL)
    if (!config.url) {
      throw new Error('❌ API called with undefined URL');
    }

    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Allow browser to set multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      hasToken: !!token,
      isFormData: config.data instanceof FormData,
    });

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * ✅ RESPONSE INTERCEPTOR
 */
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message,
    });

    // Session expired
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/signup') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Session expired. Please login again.');
        window.location.href = '/login';
      }
    }

    // Server error
    if (error.response?.status >= 500) {
      toast.error(error.response?.data?.message || 'Server error occurred');
    }

    return Promise.reject(error);
  }
);

export default api;
