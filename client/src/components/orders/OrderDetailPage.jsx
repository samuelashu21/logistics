import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/useSocket.jsx';
import {
  getOrder,
  getOrderHistory,
  approveOrder,
  rejectOrder,
  updateOrderStatus,
  assignDriverToOrder,
  verifyPayment,
  getDrivers,
} from '../../services/api';
import Spinner from '../common/Spinner';

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

const STATUS_FLOW = [
  'requested',
  'paid',
  'approved',
  'assigned',
  'in_progress',
  'completed',
];

const paymentStatusLabel = (status) => {
  const map = {
    pending: 'Awaiting Verification',
    verified: 'Payment Verified',
    failed: 'Payment Failed',
  };
  return map[status] || 'Awaiting Verification';
};

const maskPaymentConfirmation = (value) => {
  if (!value) return 'N/A';
  if (value.length <= 6) {
    return `${'*'.repeat(Math.max(value.length - 2, 0))}${value.slice(-2)}`;
  }
  return `${value.slice(0, 3)}${'*'.repeat(value.length - 6)}${value.slice(-3)}`;
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const socket = useSocket();

  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user.role === 'admin';
  const isOwner = user.role === 'owner';
  const isDriver = user.role === 'driver';
  const isCustomer = user.role === 'customer';
  const canApprove = isAdmin;
  const canAssign = isAdmin || isOwner;
  const isOrderOwner = order?.customer?._id === user?._id;
  const canViewSensitivePaymentDetails = isAdmin || (isCustomer && isOrderOwner);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [orderRes, historyRes] = await Promise.all([
        getOrder(id),
        getOrderHistory(id).catch(() => ({ data: { data: [] } })),
      ]);
      setOrder(orderRes.data.data || orderRes.data);
      setHistory(historyRes.data.data || historyRes.data.history || []);

      if (canAssign) {
        const driversRes = await getDrivers({ limit: 100 }).catch(() => ({
          data: { data: [] },
        }));
        setDrivers(driversRes.data.data || driversRes.data.drivers || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [id, canAssign]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchOrder();
    socket.on('orderUpdate', refresh);
    return () => {
      socket.off('orderUpdate', refresh);
    };
  }, [socket, fetchOrder]);

  const handleAction = async (action) => {
    try {
      setSubmitting(true);
      clearMessages();

      switch (action) {
        case 'approve':
          await approveOrder(id);
          setSuccess('Order approved');
          break;
        case 'reject': {
          const reason = window.prompt('Rejection reason (optional):');
          if (reason === null) return;
          await rejectOrder(id, { reason });
          setSuccess('Order rejected');
          break;
        }
        case 'verify_payment':
          {
            const paymentConfirmation = window.prompt('Enter payment confirmation/reference:');
            if (paymentConfirmation === null) return;
            const confirmation = paymentConfirmation.trim();
            if (!confirmation) {
              setError('Payment confirmation is required');
              return;
            }
            await verifyPayment(id, { paymentConfirmation: confirmation });
          }
          setSuccess('Payment verified');
          break;
        case 'start':
          await updateOrderStatus(id, { status: 'in_progress' });
          setSuccess('Trip started');
          break;
        case 'complete':
          await updateOrderStatus(id, { status: 'completed' });
          setSuccess('Order completed');
          break;
        case 'cancel':
          if (!window.confirm('Cancel this order?')) return;
          await updateOrderStatus(id, { status: 'cancelled' });
          setSuccess('Order cancelled');
          break;
        default:
          break;
      }
      fetchOrder();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver) return;
    try {
      setSubmitting(true);
      clearMessages();
      await assignDriverToOrder(id, { driverId: selectedDriver });
      setSuccess('Driver assigned');
      setSelectedDriver('');
      fetchOrder();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign driver');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  if (!order) {
    return (
      <div className="container">
        <div className="alert alert-danger">Order not found</div>
        <Link to="/orders" className="btn btn-outline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const currentStatusIdx = STATUS_FLOW.indexOf(order.status);

  return (
    <div className="container">
      <div className="page-header mb-2">
        <Link to="/orders" className="text-muted text-sm">
          ← Back to Orders
        </Link>
        <div className="flex-between">
          <h1>Order #{order._id?.slice(-6).toUpperCase()}</h1>
          <span className={`badge ${statusBadgeClass(order.status)}`}>
            {order.status?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}
      {success && <div className="alert alert-success mb-2">{success}</div>}

      {/* Status Timeline */}
      <div className="card mb-3">
        <div className="card-header">
          <h3>Order Progress</h3>
        </div>
        <div className="card-body">
          <div className="flex gap-1 flex-wrap">
            {STATUS_FLOW.map((s, i) => {
              let cls = 'badge ';
              if (order.status === 'rejected' || order.status === 'cancelled') {
                cls += i === 0 ? 'badge-danger' : '';
              } else if (i <= currentStatusIdx) {
                cls += 'badge-success';
              } else {
                cls += '';
              }
              return (
                <React.Fragment key={s}>
                  <span className={cls} style={{ padding: '6px 12px' }}>
                    {s.replace('_', ' ')}
                  </span>
                  {i < STATUS_FLOW.length - 1 && (
                    <span className="text-muted">→</span>
                  )}
                </React.Fragment>
              );
            })}
            {(order.status === 'rejected' || order.status === 'cancelled') && (
              <>
                <span className="text-muted">|</span>
                <span
                  className="badge badge-danger"
                  style={{ padding: '6px 12px' }}
                >
                  {order.status}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-2 gap-2 mb-3">
        {/* Order Info */}
        <div className="card">
          <div className="card-header">
            <h3>Order Details</h3>
          </div>
          <div className="card-body">
            <InfoRow label="Order ID" value={order._id} />
            <InfoRow label="Status" value={order.status?.replace('_', ' ')} />
            <InfoRow
              label="Total Amount"
              value={`$${(order.totalAmount ?? 0).toLocaleString()}`}
            />
            <InfoRow
              label="Payment Status"
              value={paymentStatusLabel(order.paymentStatus || 'pending')}
            />
            <InfoRow
              label="Payment Timeline"
              value={`Pending → ${paymentStatusLabel(order.paymentStatus || 'pending')}`}
            />
            {canViewSensitivePaymentDetails && (
              <InfoRow
                label="Payment Amount"
                value={
                  order.paymentAmount != null
                    ? `$${Number(order.paymentAmount).toLocaleString()}`
                    : 'N/A'
                }
              />
            )}
            {canViewSensitivePaymentDetails && (
              <InfoRow
                label="Payment Confirmation"
                value={maskPaymentConfirmation(order.paymentConfirmation)}
              />
            )}
            <InfoRow label="Pickup Address" value={order.pickupAddress} />
            <InfoRow label="Delivery Address" value={order.deliveryAddress} />
            <InfoRow
              label="Created"
              value={new Date(order.createdAt).toLocaleString()}
            />
            {order.updatedAt && (
              <InfoRow
                label="Last Updated"
                value={new Date(order.updatedAt).toLocaleString()}
              />
            )}
            {order.notes && <InfoRow label="Notes" value={order.notes} />}
          </div>
        </div>

        {/* Customer & Vehicle/Driver */}
        <div>
          <div className="card mb-2">
            <div className="card-header">
              <h3>Customer</h3>
            </div>
            <div className="card-body">
              {order.customer ? (
                <>
                  <InfoRow
                    label="Name"
                    value={order.customer.name || order.customer.email}
                  />
                  <InfoRow label="Email" value={order.customer.email} />
                  <InfoRow label="Phone" value={order.customer.phone} />
                </>
              ) : (
                <p className="text-muted">Customer info unavailable</p>
              )}
            </div>
          </div>

          <div className="card mb-2">
            <div className="card-header">
              <h3>Vehicle &amp; Driver</h3>
            </div>
            <div className="card-body">
              {order.vehicle ? (
                <div className="mb-2">
                  <p className="font-bold">
                    {order.vehicle.make} {order.vehicle.model}
                  </p>
                  <p className="text-muted text-sm">
                    Plate: {order.vehicle.licensePlate || 'N/A'}
                  </p>
                  <Link
                    to={`/vehicles/${order.vehicle._id}`}
                    className="text-primary text-sm"
                  >
                    View Vehicle
                  </Link>
                </div>
              ) : (
                <p className="text-muted mb-2">No vehicle assigned</p>
              )}

              {order.driver ? (
                <div>
                  <p className="font-bold">
                    Driver:{' '}
                    {order.driver.name ||
                      order.driver.user?.name ||
                      'Assigned'}
                  </p>
                  <Link
                    to={`/drivers/${order.driver._id}`}
                    className="text-primary text-sm"
                  >
                    View Driver
                  </Link>
                </div>
              ) : (
                <p className="text-muted">No driver assigned</p>
              )}

              {/* Assign driver for admin/owner */}
              {canAssign &&
                !order.driver &&
                order.status === 'approved' && (
                  <div className="mt-2">
                    <label className="form-label">Assign Driver</label>
                    <div className="flex gap-1">
                      <select
                        className="form-control"
                        value={selectedDriver}
                        onChange={(e) => setSelectedDriver(e.target.value)}
                      >
                        <option value="">Select driver...</option>
                        {drivers.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name ||
                              d.user?.name ||
                              d.user?.email ||
                              d._id}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleAssignDriver}
                        disabled={!selectedDriver || submitting}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Tracking */}
          {order.status === 'in_progress' && order.vehicle && (
            <div className="card">
              <div className="card-header">
                <h3>Live Tracking</h3>
              </div>
              <div className="card-body">
                <Link
                  to={`/tracking?vehicle=${order.vehicle._id}`}
                  className="btn btn-primary"
                >
                  Track Order
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card mb-3">
        <div className="card-header">
          <h3>Actions</h3>
        </div>
        <div className="card-body">
          <div className="flex gap-1 flex-wrap">
            {isAdmin && order.status === 'requested' && (
              <button
                className="btn btn-outline"
                onClick={() => handleAction('verify_payment')}
                disabled={submitting}
              >
                Verify Payment
              </button>
            )}
            {canApprove && order.status === 'paid' && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleAction('approve')}
                  disabled={submitting}
                >
                  Approve Order
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleAction('reject')}
                  disabled={submitting}
                >
                  Reject Order
                </button>
              </>
            )}
            {isDriver && order.status === 'assigned' && (
              <button
                className="btn btn-primary"
                onClick={() => handleAction('start')}
                disabled={submitting}
              >
                Start Trip
              </button>
            )}
            {isDriver && order.status === 'in_progress' && (
              <button
                className="btn btn-secondary"
                onClick={() => handleAction('complete')}
                disabled={submitting}
              >
                Complete Order
              </button>
            )}
            {isCustomer && order.status === 'requested' && (
              <button
                className="btn btn-danger"
                onClick={() => handleAction('cancel')}
                disabled={submitting}
              >
                Cancel Order
              </button>
            )}
            {order.status !== 'rejected' &&
              order.status !== 'cancelled' &&
              order.status !== 'completed' && (
                <span className="text-muted text-sm" style={{ alignSelf: 'center' }}>
                  {submitting ? 'Processing...' : ''}
                </span>
              )}
            {(order.status === 'completed' ||
              order.status === 'rejected' ||
              order.status === 'cancelled') && (
              <span className="text-muted">No further actions available</span>
            )}
          </div>
        </div>
      </div>

      {/* Status History / Timeline */}
      <div className="card">
        <div className="card-header">
          <h3>Status History</h3>
        </div>
        <div className="card-body">
          {history.length === 0 ? (
            <div>
              {/* Fallback: show timestamps from order object */}
              <TimelineItem
                status="Created"
                date={order.createdAt}
              />
              {order.paidAt && (
                <TimelineItem status="Paid" date={order.paidAt} />
              )}
              {order.approvedAt && (
                <TimelineItem status="Approved" date={order.approvedAt} />
              )}
              {order.assignedAt && (
                <TimelineItem status="Driver Assigned" date={order.assignedAt} />
              )}
              {order.startedAt && (
                <TimelineItem status="Trip Started" date={order.startedAt} />
              )}
              {order.completedAt && (
                <TimelineItem status="Completed" date={order.completedAt} />
              )}
              {order.rejectedAt && (
                <TimelineItem status="Rejected" date={order.rejectedAt} />
              )}
              {order.cancelledAt && (
                <TimelineItem status="Cancelled" date={order.cancelledAt} />
              )}
            </div>
          ) : (
            <div>
              {history.map((entry, idx) => (
                <TimelineItem
                  key={idx}
                  status={entry.status || entry.action}
                  date={entry.createdAt || entry.timestamp}
                  note={entry.note || entry.reason}
                  actor={entry.user?.name || entry.actor}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex-between mb-1">
    <span className="text-muted">{label}</span>
    <span className="font-bold">{value || 'N/A'}</span>
  </div>
);

const TimelineItem = ({ status, date, note, actor }) => (
  <div
    className="flex mb-2 p-1"
    style={{ borderLeft: '3px solid var(--primary)', paddingLeft: 12 }}
  >
    <div>
      <p className="font-bold">{status}</p>
      {date && (
        <p className="text-muted text-sm">
          {new Date(date).toLocaleString()}
        </p>
      )}
      {actor && <p className="text-sm">By: {actor}</p>}
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  </div>
);

export default OrderDetailPage; 
