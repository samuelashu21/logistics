import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/useSocket.jsx';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../../services/api';
import Spinner from '../common/Spinner';
import Pagination from '../common/Pagination';

const typeIcon = (type) => {
  const icons = {
    order: '📦',
    payment: '💳',
    delivery: '🚚',
    tracking: '📍',
    alert: '⚠️',
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    review: '⭐',
    advertisement: '📢',
    system: '🔔',
  };
  return icons[type] || '🔔';
};

const typeBadge = (type) => {
  const map = {
    order: 'badge-info',
    payment: 'badge-success',
    delivery: 'badge-warning',
    tracking: 'badge-info',
    alert: 'badge-danger',
    error: 'badge-danger',
    success: 'badge-success',
    warning: 'badge-warning',
  };
  return map[type] || 'badge-info';
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const socket = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: 15, sort: '-createdAt' };
      if (filter === 'unread') params.read = false;
      const res = await getNotifications(params);
      const data = res.data;
      setNotifications(data.data || data.notifications || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 15) || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time notifications via socket
  useEffect(() => {
    if (!socket) return;
    const handleNew = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
    };
    socket.on('notification', handleNew);
    socket.on('newNotification', handleNew);
    return () => {
      socket.off('notification', handleNew);
      socket.off('newNotification', handleNew);
    };
  }, [socket]);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete notification');
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container">
      <div className="page-header mb-2">
        <div className="flex-between">
          <div>
            <h1 style={{ margin: 0 }}>Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-muted text-sm">{unreadCount} unread</span>
            )}
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? 'Marking...' : '✓ Mark All as Read'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-2">
        <button
          className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setFilter('all'); setPage(1); }}
        >
          All
        </button>
        <button
          className={`btn btn-sm ${filter === 'unread' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { setFilter('unread'); setPage(1); }}
        >
          Unread
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <Spinner />
      ) : notifications.length === 0 ? (
        <div className="card">
          <div className="card-body text-center" style={{ padding: 48 }}>
            <span style={{ fontSize: 48 }}>🔔</span>
            <p className="text-muted text-lg mt-1">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {notifications.map((n) => (
              <div
                key={n._id}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--gray-lighter)',
                  background: n.read ? 'transparent' : 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  transition: 'var(--transition)',
                }}
              >
                {/* Icon */}
                <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>
                  {typeIcon(n.type)}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex-between" style={{ marginBottom: 4 }}>
                    <div className="flex gap-1" style={{ alignItems: 'center' }}>
                      <span className="font-bold" style={{ fontSize: 14 }}>
                        {n.title || 'Notification'}
                      </span>
                      {n.type && (
                        <span className={`badge ${typeBadge(n.type)}`} style={{ fontSize: 10 }}>
                          {n.type}
                        </span>
                      )}
                      {!n.read && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>
                    <span className="text-muted text-sm" style={{ flexShrink: 0, marginLeft: 8 }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  {n.message && (
                    <p style={{ margin: 0, color: 'var(--gray)', fontSize: 13, lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1" style={{ flexShrink: 0 }}>
                  {!n.read && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleMarkRead(n._id)}
                      title="Mark as read"
                      style={{ padding: '4px 8px', fontSize: 12 }}
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(n._id)}
                    title="Delete"
                    style={{ padding: '4px 8px', fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
