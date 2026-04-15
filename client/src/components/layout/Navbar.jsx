import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSocket } from '../../context/useSocket.jsx';
import { getUnreadCount } from '../../services/api.js';

export default function Navbar({ onToggleSidebar }) {
  const { user, isAuthenticated, logout } = useAuth();
  const socket = useSocket();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    getUnreadCount()
      .then((res) => {
        const count = res.data?.count ?? res.data?.data ?? 0;
        setUnread(count);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => setUnread((prev) => prev + 1);
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket]);

  return (
    <header className="navbar flex-between">
      <div className="flex gap-1" style={{ alignItems: 'center' }}>
        {isAuthenticated && (
          <button
            className="sidebar-toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="hamburger-icon">☰</span>
          </button>
        )}
        <Link to="/" className="navbar-brand">
          Logistics MS
        </Link>
      </div>

      <nav className="flex gap-1" style={{ alignItems: 'center' }}>
        {isAuthenticated ? (
          <>
            <Link to="/notifications" className="notification-bell">
              🔔
              {unread > 0 && (
                <span className="notification-badge">{unread > 99 ? '99+' : unread}</span>
              )}
            </Link>
            <span className="text-sm hide-mobile">{user?.name}</span>
            <span className="badge badge-info">{user?.role}</span>
            <button className="btn btn-sm btn-outline" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-sm btn-outline">
              Login
            </Link>
            <Link to="/register" className="btn btn-sm btn-primary">
              Register
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}