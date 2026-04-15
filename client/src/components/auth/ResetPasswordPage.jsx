import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { resetPassword } from '../../services/api.js';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { password, confirmPassword } = form;

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, { password });
      toast.success('Password reset successful');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || 'Reset failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="card-header">
          <h2>Reset Password</h2>
          <p style={{ marginTop: '0.25rem', fontSize: '0.875rem', opacity: 0.9 }}>
            Enter your new password
          </p>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                name="password"
                type="password"
                className="form-control"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-confirm">Confirm Password</label>
              <input
                id="reset-confirm"
                name="confirmPassword"
                type="password"
                className="form-control"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={submitting}
            >
              {submitting ? 'Resetting…' : 'Reset Password'}
            </button>
            <p className="text-center mt-2 text-sm">
              <Link to="/login">← Back to Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
