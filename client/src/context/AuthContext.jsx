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

function isLikelyUserObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return ['_id', 'id', 'email', 'name', 'role'].some((key) => key in value);
}

function extractAuthPayload(responseData) {
  const root = responseData || {};
  const data = root.data || {};
  const token = root.token || data.token;
  const rootUser = isLikelyUserObject(root.user) ? root.user : null;
  const dataUser = isLikelyUserObject(data.user) ? data.user : null;
  const dataAsUser = root.token && isLikelyUserObject(data) ? data : null;
  const user =
    rootUser ||
    dataUser ||
    dataAsUser ||
    (token ? decodeToken(token) : null);

  return { token, user };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  }, []);

  // Auto-logout timer based on token expiry
  useEffect(() => {
    if (!token) return;

    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return;

    const expiresIn = decoded.exp * 1000 - Date.now();
    if (expiresIn <= 0) {
      logout();
      return;
    }

    const timer = setTimeout(logout, expiresIn);
    return () => clearTimeout(timer);
  }, [token, logout]);

  // On mount or token change, fetch current user
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await axios.get('/api/v1/auth/me');
        setUser(res.data.data || res.data.user || res.data);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token, logout]);

  const login = async (email, password) => {
    const res = await axios.post('/api/v1/auth/login', { email, password });
    const { token: newToken, user: userData } = extractAuthPayload(res.data);

    if (!newToken) {
      throw new Error('Invalid authentication response');
    }

    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(userData);

    return res.data;
  };

  const register = async (userData) => {
    const res = await axios.post('/api/v1/auth/register', userData);
    const { token: newToken, user: registeredUser } = extractAuthPayload(res.data);

    if (!newToken) {
      throw new Error('Invalid authentication response');
    }

    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(registeredUser);

    return res.data;
  };

  const isAuthenticated = !!token && !!user;

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
