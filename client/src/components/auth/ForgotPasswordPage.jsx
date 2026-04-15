import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { forgotPassword } from '../../services/api.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setSubmitting(true);
    try {
      await forgotPassword({ email });
      setSent(true);
      toast.success('Reset link sent to your email');
    } catch (err) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || 'Request failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="card-header">
          <h2>Forgot Password</h2>
          <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', opacity: 0.9 }}>
            We&apos;ll send you a reset link
          </p>
        </div>
        <div className="card-body">
          {sent ? (
            <div className="text-center">
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✉️</div>
              <p className="mb-2">
                A password reset link has been sent to <strong>{email}</strong>.
              </p>
              <p className="text-sm text-muted mb-2">
                Check your inbox and follow the instructions.
              </p>
              <Link to="/login" className="btn btn-primary">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="forgot-email">Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  className="form-control"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                disabled={submitting}
              >
                {submitting ? 'Sending…' : 'Send Reset Link'}
              </button>
              <p className="text-center mt-2 text-sm">
                <Link to="/login">← Back to Login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
