import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/useSocket.jsx';
import {
  getOrders,
  approveOrder,
  rejectOrder,
  updateOrderStatus,
  getDrivers,
  assignDriverToOrder,
  verifyPayment,
} from '../../services/api';
import Spinner from '../common/Spinner';
import Pagination from '../common/Pagination';

const STATUS_OPTIONS = [
  'requested',
  'paid',
  'approved',
  'assigned',
  'in_progress',
  'completed',
  'rejected',
  'cancelled',
];

const statusBadgeClass = (status) => {
  const map = {
    requested: 'badge-info',
    paid: 'badge-info',
    approved: 'badge-success',
    assigned: 'badge-warning',
    in_progress: 'badge-warning',
    completed: 'badge-success',
    rejected: 'badge-danger',
    cancelled: 'badge-danger',
  };
  return map[status] || 'badge-info';
};

const paymentBadge = (status) => {
  const map = {
    paid: 'badge-success',
    verified: 'badge-success',
    pending: 'badge-warning',
    unpaid: 'badge-danger',
    failed: 'badge-danger',
    refunded: 'badge-info',
  };
  return map[status] || 'badge-warning';
};

const OrderListPage = () => {
  const { user } = useAuth();
  const socket = useSocket();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user.role === 'admin';
  const isOwner = user.role === 'owner';
  const isCustomer = user.role === 'customer';
  const canApprove = isAdmin || isOwner;

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      clearMessages();
      const params = { page, limit: 10, sort: '-createdAt' };
      if (statusFilter) params.status = statusFilter;
      const res = await getOrders(params);
      const data = res.data;
      setOrders(data.data || data.orders || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Pre-load drivers for admin assign action
  useEffect(() => {
    if (isAdmin) {
      getDrivers({ limit: 100 })
        .then((res) => setDrivers(res.data.data || res.data.drivers || []))
        .catch(() => {});
    }
  }, [isAdmin]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchOrders();
    socket.on('orderUpdate', refresh);
    socket.on('newOrder', refresh);
    return () => {
      socket.off('orderUpdate', refresh);
      socket.off('newOrder', refresh);
    };
  }, [socket, fetchOrders]);

  const handleApprove = async (orderId) => {
    try {
      setSubmitting(true);
      clearMessages();
      await approveOrder(orderId);
      setSuccess('Order approved');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (orderId) => {
    const reason = window.prompt('Rejection reason (optional):');
    if (reason === null) return;
    try {
      setSubmitting(true);
      clearMessages();
      await rejectOrder(orderId, { reason });
      setSuccess('Order rejected');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async (orderId) => {
    try {
      setSubmitting(true);
      clearMessages();
      await verifyPayment(orderId, { verified: true });
      setSuccess('Payment verified');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      setSubmitting(true);
      clearMessages();
      await updateOrderStatus(orderId, { status: 'cancelled' });
      setSuccess('Order cancelled');
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignModal = (order) => {
    setAssignModal(order);
    setSelectedDriver('');
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver || !assignModal) return;
    try {
      setSubmitting(true);
      clearMessages();
      await assignDriverToOrder(assignModal._id, { driverId: selectedDriver });
      setSuccess('Driver assigned');
      setAssignModal(null);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign driver');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header mb-2">
        <div className="flex-between">
          <h1>Orders</h1>
          {isCustomer && (
            <Link to="/orders/new" className="btn btn-primary">
              + Place Order
            </Link>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}
      {success && <div className="alert alert-success mb-2">{success}</div>}

      {/* Filters */}
      <div className="card mb-2">
        <div className="card-body">
          <div className="flex gap-2 flex-wrap">
            <div className="form-group" style={{ minWidth: 160 }}>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card">
          <div className="card-body">
            {orders.length === 0 ? (
              <p className="text-muted text-center">No orders found</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Vehicle</th>
                      <th>Driver</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id}>
                        <td>
                          <Link to={`/orders/${order._id}`}>
                            #{order._id?.slice(-6).toUpperCase()}
                          </Link>
                        </td>
                        <td>
                          {order.customer?.name ||
                            order.customer?.email ||
                            'N/A'}
                        </td>
                        <td>
                          {order.vehicle
                            ? `${order.vehicle.make || ''} ${order.vehicle.model || ''}`.trim()
                            : 'N/A'}
                        </td>
                        <td>
                          {order.driver?.name ||
                            order.driver?.user?.name ||
                            'Unassigned'}
                        </td>
                        <td>
                          <span
                            className={`badge ${statusBadgeClass(order.status)}`}
                          >
                            {order.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${paymentBadge(order.paymentStatus || 'pending')}`}
                          >
                            {order.paymentStatus || 'pending'}
                          </span>
                        </td>
                        <td>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex gap-1 flex-wrap">
                            {/* Admin actions */}
                            {canApprove && order.status === 'paid' && (
                              <>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleApprove(order._id)}
                                  disabled={submitting}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleReject(order._id)}
                                  disabled={submitting}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {isAdmin && order.status === 'requested' && (
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() =>
                                  handleVerifyPayment(order._id)
                                }
                                disabled={submitting}
                              >
                                Verify Payment
                              </button>
                            )}
                            {isAdmin &&
                              (order.status === 'approved' ||
                                order.status === 'paid') && (
                                <button
                                  className="btn btn-sm btn-warning"
                                  onClick={() => openAssignModal(order)}
                                  disabled={submitting}
                                >
                                  Assign
                                </button>
                              )}
                            {/* Customer cancel */}
                            {isCustomer && order.status === 'requested' && (
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleCancel(order._id)}
                                disabled={submitting}
                              >
                                Cancel
                              </button>
                            )}
                            <Link
                              to={`/orders/${order._id}`}
                              className="btn btn-sm btn-outline"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Assign Driver Modal */}
      {assignModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setAssignModal(null)}
        >
          <div
            className="card"
            style={{ width: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div className="flex-between">
                <h3>Assign Driver</h3>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setAssignModal(null)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="card-body">
              <p className="mb-2 text-muted">
                Order #{assignModal._id?.slice(-6).toUpperCase()}
              </p>
              <div className="form-group mb-2">
                <label className="form-label">Select Driver</label>
                <select
                  className="form-control"
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                >
                  <option value="">Choose a driver...</option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name || d.user?.name || d.user?.email || d._id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1">
                <button
                  className="btn btn-primary"
                  onClick={handleAssignDriver}
                  disabled={!selectedDriver || submitting}
                >
                  {submitting ? 'Assigning...' : 'Assign'}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setAssignModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderListPage;