import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  console.log('[LOGIN RENDER]', {
    loading,
    isAuthenticated,
    path: window.location.pathname,
    token: localStorage.getItem('token'),
  });

  if (loading) return <div className="spinner-container"><div className="spinner" /></div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }

    console.log('[LOGIN] submit start');
    setSubmitting(true);

    try {
      const result = await login(form.email, form.password);
      console.log('[LOGIN] login() result:', result);
      console.log('[LOGIN] token in localStorage:', localStorage.getItem('token'));

      toast.success('Logged in successfully');
    } catch (err) {
      console.log('[LOGIN] error object:', err);
      toast.error(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setSubmitting(false);
      console.log('[LOGIN] submit end');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="card-header">
          <h2>Sign In</h2>
          <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', opacity: 0.9 }}>
            Welcome back to Logistics MS
          </p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="flex-between mb-2" style={{ fontSize: '0.875rem' }}>
              <span />
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={submitting}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="text-center mt-2 text-sm">
            Don&apos;t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
