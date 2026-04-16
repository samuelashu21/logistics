import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as loginRequest, register as registerRequest, getMe } from '../services/api.js';

const AuthContext = createContext(null);
const TOKEN_FIELDS = ['token', 'accessToken', 'jwt'];

function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function pickFirstValue(source, keys) {
  for (const key of keys) {
    if (source?.[key]) return source[key];
  }
  return null;
}

// Universal extractor for varying backend response shapes
function extractAuthPayload(responseData) {
  const token =
    pickFirstValue(responseData, TOKEN_FIELDS) ||
    pickFirstValue(responseData?.data, TOKEN_FIELDS) ||
    pickFirstValue(responseData?.data?.data, TOKEN_FIELDS);

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
        const res = await getMe();
        setUser(res?.data?.data || res?.data?.user || null);
      } catch (err) {
        console.error('[AUTH] /me failed:', err?.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token, logout]);

  const login = async (email, password) => {
    const res = await loginRequest({ email, password });

    const { token: newToken, user: userData } = extractAuthPayload(res.data);

    if (!newToken) throw new Error('No token received');

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData || null);
    setLoading(false);

    return res.data;
  };

  const register = async (payload) => {
    const res = await registerRequest(payload);

    const { token: newToken, user: newUser } = extractAuthPayload(res.data);

    if (!newToken) throw new Error('No token received');

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser || null);
    setLoading(false);

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
