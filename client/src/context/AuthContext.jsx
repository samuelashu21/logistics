import React, { useState, useEffect, useCallback } from 'react';
import {
  login as loginRequest,
  register as registerRequest,
  getMe,
  updateMe as updateMeRequest,
  changePassword as changePasswordRequest,
} from '../services/api.js';
import { AuthContext } from './AuthContextValue.js';

/**
 * Robust extraction based on your backend:
 * res.status(statusCode).json({ success: true, token, data: userData });
 */
function extractAuthPayload(responseBody) {
  // responseBody is the 'res.data' from axios
  const token = responseBody?.token || null;
  const user = responseBody?.data || null;

  return { token, user };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const res = await getMe();
    const userData = res.data?.data || null;
    if (userData) {
      setUser(userData);
      return userData;
    }
    throw new Error('Invalid user data');
  }, []);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearAuthState();
    setLoading(false);
  }, [clearAuthState]);

  // Initial Load: Check if current token is valid and fetch user profile
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch (err) {
        console.error('[AUTH ERROR] Validation failed:', err.message);
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [clearAuthState, refreshUser]);

  const login = async (email, password) => {
    const res = await loginRequest({ email, password });
    
    // We pass res.data because that contains { token, data }
    const { token: newToken, user: userData } = extractAuthPayload(res.data);

    if (!newToken) {
      console.error('Extraction failed. Response body:', res.data);
      throw new Error('Invalid server response: No token found');
    }

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    
    return res.data;
  };

  const register = async (payload) => {
    const res = await registerRequest(payload);
    const { token: newToken, user: userData } = extractAuthPayload(res.data);

    if (!newToken) throw new Error('Registration successful, but no token received');

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    
    return res.data;
  };

  const updateProfile = async (payload) => {
    const res = await updateMeRequest(payload);
    const userData = res.data?.data || null;
    if (userData) {
      setUser(userData);
    }
    return res.data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await changePasswordRequest({ currentPassword, newPassword });
    return res.data;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    refreshUser,
    updateProfile,
    changePassword,
    logout,
    isAuthenticated: !!token && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
