import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// Universal extractor for varying backend response shapes
function extractAuthPayload(responseData) {
  const token =
    responseData?.token ||
    responseData?.data?.token ||
    responseData?.data?.data?.token ||
    null;

  // Prefer explicit user objects first
  let user =
    responseData?.user ||
    responseData?.data?.user ||
    responseData?.data?.data?.user ||
    null;

  // Common shape in your backend: { success, token, data: user }
  if (!user && responseData?.data && typeof responseData.data === 'object' && !Array.isArray(responseData.data)) {
    user = responseData.data;
  }

  // JWT fallback
  if (!user && token) {
    const decoded = decodeToken(token);
    if (decoded) user = decoded;
  }

  return { token, user };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common.Authorization;
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;

    const decoded = decodeToken(token);
    if (!decoded?.exp) return;

    const expiresIn = decoded.exp * 1000 - Date.now();
    if (expiresIn <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(logout, expiresIn);
    return () => clearTimeout(timer);
  }, [token, logout]);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
        const res = await axios.get('/api/v1/auth/me');
        setUser(res?.data?.data || res?.data?.user || null);
      } catch (err) {
        console.error('[AUTH] /me failed:', err?.response?.status, err?.response?.data);
        // keep token to avoid immediate bounce loops
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    console.log('[AUTH] login start', { email });

    const res = await axios.post('/api/v1/auth/login', { email, password });
    console.log('[AUTH] raw login response:', res.data);

    const { token: newToken, user: userData } = extractAuthPayload(res.data);
    console.log('[AUTH] extracted:', { newToken, userData });

    if (!newToken) throw new Error('No token received');

    localStorage.setItem('token', newToken);
    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData || null);
    setLoading(false);

    console.log('[AUTH] token saved:', localStorage.getItem('token'));
    return res.data;
  };

  const register = async (payload) => {
    console.log('[AUTH] register start');

    const res = await axios.post('/api/v1/auth/register', payload);
    console.log('[AUTH] raw register response:', res.data);

    const { token: newToken, user: newUser } = extractAuthPayload(res.data);
    console.log('[AUTH] extracted register:', { newToken, newUser });

    if (!newToken) throw new Error('No token received');

    localStorage.setItem('token', newToken);
    axios.defaults.headers.common.Authorization = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser || null);
    setLoading(false);

    console.log('[AUTH] token saved after register:', localStorage.getItem('token'));
    return res.data;
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, isAuthenticated }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}