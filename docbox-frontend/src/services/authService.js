import api, { endpoints } from './api';

export const authService = {
  // Sign up
  signup: async (userData) => {
    const response = await api.post(endpoints.signup, userData);
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post(endpoints.login, credentials);
    if (response.data.success) {
      const { accessToken, refreshToken, user } = response.data.data;
      
      // Store with consistent key names
      localStorage.setItem('token', accessToken); // Changed from 'accessToken'
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      console.log('✅ Login successful, tokens stored');
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await api.post(endpoints.logout);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      console.log('✅ Logged out, tokens cleared');
    }
  },

  // Get current user
  getCurrentUser: () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr || userStr === 'undefined') {
        return null;
      }
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user:', error);
      return null;
    }
  },

  // Check if authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token && token !== 'undefined';
  },

  // Get me (from server)
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

  // Refresh token
  refreshAccessToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return { success: false };
      }

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