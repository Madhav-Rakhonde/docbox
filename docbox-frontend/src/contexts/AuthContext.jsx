/**
 * AuthContext.js
 * src/contexts/AuthContext.js
 *
 * Provides authentication state to the entire app.
 *
 * Offline-safe initialisation:
 *   - If the device is offline on app load, trusts the cached token + user
 *     from localStorage instead of calling getMe() (which would fail and
 *     previously caused an unwanted logout + redirect to landing page).
 *   - On network errors, keeps the user authenticated with cached data.
 *   - Only calls logout() on explicit server rejections (401 / 403).
 *   - Runs a background TTL sweep of expired offline documents on startup.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { runOfflineSweep } from '../services/offlineService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,            setUser]            = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Init auth on app load ──────────────────────────────────────────────────
  useEffect(() => {
    const initAuth = async () => {
      try {
        // No token at all → definitely not logged in
        if (!authService.isAuthenticated()) {
          setLoading(false);
          return;
        }

        // Sweep expired offline documents in the background (non-blocking)
        runOfflineSweep();

        // Offline → trust the cached token and user; skip the network call.
        // This is the key fix: previously getMe() would fail offline,
        // causing logout() to be called and wiping the token, which then
        // redirected every new tab (including /view/:id) to the landing page.
        if (!navigator.onLine) {
          const cachedUser = authService.getCurrentUser();
          setUser(cachedUser);
          setIsAuthenticated(true);
          setLoading(false);
          return;
        }

        // Online → verify token with server
        const meResponse = await authService.getMe();

        if (meResponse?.success && meResponse.data) {
          setUser(meResponse.data);
          setIsAuthenticated(true);
        } else {
          // Server responded but explicitly rejected the session → clear it
          await authService.logout();
        }
      } catch (error) {
        console.error('Auth init failed:', error);

        // 401 / 403 → server explicitly rejected the token → log out
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          await authService.logout();
        } else {
          // Network error (offline, timeout, DNS failure, etc.)
          // → keep the user logged in with cached data
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

  // ── Login ──────────────────────────────────────────────────────────────────
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

  // ── Signup ─────────────────────────────────────────────────────────────────
  const signup = async (userData) => {
    try {
      const signupResponse = await authService.signup(userData);

      if (!signupResponse?.success) {
        return { success: false, error: signupResponse?.message || 'Signup failed' };
      }

      // Auto-login after signup
      return await login({
        email:    userData.email,
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

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    // authService.logout() handles: server revoke + localStorage + IndexedDB
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // ── Refresh user ───────────────────────────────────────────────────────────
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