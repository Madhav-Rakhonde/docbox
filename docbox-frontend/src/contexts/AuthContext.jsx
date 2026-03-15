import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // =============================
  // Init auth on app load
  // =============================
  useEffect(() => {
    const initAuth = async () => {
      try {
        // No token at all → definitely not logged in
        if (!authService.isAuthenticated()) {
          setLoading(false);
          return;
        }

        // ── Offline: trust the cached token + user, skip network call ──
        if (!navigator.onLine) {
          const cachedUser = authService.getCurrentUser();
          setUser(cachedUser);
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }

        // ── Online: verify token with server ──
        const meResponse = await authService.getMe();

        if (meResponse?.success && meResponse.data) {
          setUser(meResponse.data);
          setIsAuthenticated(true);
        } else {
          // Server responded but rejected the session → clear it
          await authService.logout();
        }
      } catch (error) {
        console.error('Auth init failed:', error);

        // 401 / 403 → server explicitly rejected the token → log out
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          await authService.logout();
        } else {
          // Network error (offline, timeout, etc.) → keep user logged in
          const cachedUser = authService.getCurrentUser();
          setUser(cachedUser);
          setIsAuthenticated(true);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // =============================
  // LOGIN
  // =============================
  const login = async (credentials) => {
    try {
      const loginResponse = await authService.login(credentials);

      if (!loginResponse?.success) {
        return { success: false, error: loginResponse?.message || 'Login failed' };
      }

      const meResponse = await authService.getMe();

      if (!meResponse?.success || !meResponse.data) {
        throw new Error('Unable to fetch user after login');
      }

      setUser(meResponse.data);
      setIsAuthenticated(true);

      return { success: true, data: meResponse.data };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  // =============================
  // SIGNUP
  // =============================
  const signup = async (userData) => {
    try {
      const signupResponse = await authService.signup(userData);

      if (!signupResponse?.success) {
        return { success: false, error: signupResponse?.message || 'Signup failed' };
      }

      // Auto login after signup
      return await login({
        email: userData.email,
        password: userData.password,
      });
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Signup failed',
      };
    }
  };

  // =============================
  // LOGOUT
  // =============================
  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // =============================
  // REFRESH USER
  // =============================
  const refreshUser = async () => {
    try {
      const meResponse = await authService.getMe();
      if (meResponse?.success && meResponse.data) {
        setUser(meResponse.data);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        isAuthenticated,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;