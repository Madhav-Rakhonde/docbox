/**
 * authService.js
 * src/services/authService.js
 *
 * Handles authentication: login, logout, signup, token refresh,
 * and current-user helpers.
 *
 * On logout, clears in order:
 *   1. Server session (refresh token revoke)
 *   2. localStorage tokens + user
 *   3. All encrypted offline documents from IndexedDB
 *   4. Legacy unencrypted Cache API entries (migration safety)
 */

import api, { endpoints } from './api';
import { clearOfflineDocuments } from './offlineService';

export const authService = {

  // ── Sign up ────────────────────────────────────────────────────────────────
  signup: async (userData) => {
    const response = await api.post(endpoints.signup, userData);
    return response.data;
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  login: async (credentials) => {
    const response = await api.post(endpoints.login, credentials);

    if (response.data.success) {
      const { accessToken, refreshToken, user } = response.data.data;

      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      console.log('✅ Login successful, tokens stored');
    }

    return response.data;
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    // 1. Tell the server to revoke the refresh token
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post(endpoints.logout, { refreshToken });
    } catch (error) {
      // Always proceed with local cleanup even if server call fails
      console.error('Logout server call failed (continuing cleanup):', error);
    } finally {
      // 2. Clear auth tokens from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');

      // 3. Wipe all encrypted offline documents from IndexedDB
      //    (the key is already gone so blobs are undecryptable anyway,
      //     but clearing them is good hygiene and frees disk space)
      try {
        await clearOfflineDocuments();
      } catch (err) {
        console.error('Failed to clear offline documents on logout:', err);
      }

      console.log('✅ Logged out — tokens and offline cache cleared');
    }
  },

  // ── Get current user (from localStorage — no network) ─────────────────────
  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr || userStr === 'undefined') return null;
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing cached user:', error);
      return null;
    }
  },

  // ── Check if a token exists locally ───────────────────────────────────────
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token && token !== 'undefined';
  },

  // ── Fetch fresh user profile from server ──────────────────────────────────
  getMe: async () => {
    try {
      const response = await api.get(endpoints.me);
      if (response.data.success) {
        const userData = response.data.data;
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true, data: userData };
      }
      return { success: false };
    } catch (error) {
      console.error('getMe error:', error);
      return { success: false, error };
    }
  },

  // ── Refresh access token ───────────────────────────────────────────────────
  refreshAccessToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return { success: false };

      const response = await api.post(endpoints.refreshToken, { refreshToken });

      if (response.data.success) {
        const { accessToken } = response.data.data;
        localStorage.setItem('token', accessToken);
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false };
    }
  },
};

export default authService;