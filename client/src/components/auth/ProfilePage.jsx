import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || '', phone: user.phone || '' });
    }
  }, [user]);

  const handleProfileChange = (e) =>
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePasswordChange = (e) =>
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
 
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profile.name) {
      toast.error('Name is required');
      return;
    }
    setSavingProfile(true);
    try {
      await api.put('/auth/me', {
        name: profile.name,
        phone: profile.phone,
      });
      toast.success('Profile updated');
    } catch (err) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || 'Update failed';
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwords;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg =
        err.response?.data?.message || err.response?.data?.error || 'Password change failed';
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="spinner-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Profile Info */}
        <div className="card">
          <div className="card-header">Profile Information</div>
          <div className="card-body">
            <div className="mb-2">
              <span className="text-sm text-muted">Email</span>
              <p className="font-bold">{user.email}</p>
            </div>
            <div className="mb-2">
              <span className="text-sm text-muted">Role</span>
              <p>
                <span className="badge badge-info">
                  {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                </span>
              </p>
            </div>

            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  className="form-control"
                  value={profile.name}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-phone">Phone</label>
                <input
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  className="form-control"
                  value={profile.phone}
                  onChange={handleProfileChange}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingProfile}
              >
                {savingProfile ? 'Saving…' : 'Update Profile'}
              </button>
            </form>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <div className="card-header">Change Password</div>
          <div className="card-body">
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  className="form-control"
                  value={passwords.currentPassword}
                  onChange={handlePasswordChange}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  className="form-control"
                  placeholder="Min 6 characters"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-confirm">Confirm New Password</label>
                <input
                  id="profile-confirm"
                  name="confirmPassword"
                  type="password"
                  className="form-control"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={savingPassword}
              >
                {savingPassword ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
