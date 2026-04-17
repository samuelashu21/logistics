import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  getUsers,
  getOrders,
  getReviews,
  getAverageRating,
  getVehicleLocation,
} from '../../services/api';
import Spinner from '../common/Spinner';

const orderStatusBadge = (status) => {
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

const StarRating = ({ rating }) => {
  const stars = Math.round(rating || 0);
  return (
    <span>
      {'★'.repeat(stars)}
      {'☆'.repeat(5 - stars)}{' '}
      <span className="text-muted text-sm">({(rating || 0).toFixed(1)})</span>
    </span>
  );
};

const DriverDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCreateMode = id === 'new';
  const canManage = user?.role === 'admin' || user?.role === 'owner';

  const [driver, setDriver] = useState(null);
  const [trips, setTrips] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [location, setLocation] = useState(null);
  const [driverUsers, setDriverUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    user: '',
    licenseNumber: '',
    licenseExpiry: '',
    experience: '',
    status: 'available',
  });

  const fetchDriverUsers = useCallback(async () => {
    if (!canManage) return;
    try {
      const usersRes = await getUsers({ role: 'driver', limit: 100 });
      setDriverUsers(usersRes.data.data || usersRes.data.users || []);
    } catch {
      setDriverUsers([]);
      setError('Failed to load driver users');
    }
  }, [canManage]);

  const fetchDriver = useCallback(async () => {
    if (isCreateMode) {
      try {
        setLoading(true);
        setError('');
        await fetchDriverUsers();
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError('');

      const driverRes = await getDriver(id);
      const d = driverRes.data.data || driverRes.data;
      setDriver(d);

      setForm({
        user: d.user?._id || d.user || '',
        licenseNumber: d.licenseNumber || d.license || '',
        licenseExpiry: d.licenseExpiry ? new Date(d.licenseExpiry).toISOString().split('T')[0] : '',
        experience: d.experience ?? '',
        status: d.status || 'available',
      });

      if (canManage) {
        await fetchDriverUsers();
      }

      // Fetch related data in parallel; swallow individual failures
      const [ordersRes, reviewsRes, ratingRes] = await Promise.all([
        getOrders({ driver: id, limit: 10, sort: '-createdAt' }).catch(() => ({
          data: { data: [] },
        })),
        getReviews({ driver: id, limit: 10 }).catch(() => ({
          data: { data: [] },
        })),
        getAverageRating(id).catch(() => ({ data: { average: 0 } })),
      ]);

      setTrips(ordersRes.data.data || ordersRes.data.orders || []);
      setReviews(reviewsRes.data.data || reviewsRes.data.reviews || []);
      setAvgRating(
        ratingRes.data.data?.average ??
          ratingRes.data.average ??
          ratingRes.data.data ??
          0
      );

      // Try fetching live location
      const assignedVehicle = d.assignedVehicle || d.vehicle;
      if (assignedVehicle?._id || assignedVehicle) {
        const vehicleId = assignedVehicle?._id || assignedVehicle;
        try {
          const locRes = await getVehicleLocation(vehicleId);
          setLocation(locRes.data.data || locRes.data || null);
        } catch {
          // location unavailable
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load driver');
    } finally {
      setLoading(false);
    }
  }, [id, isCreateMode, canManage, fetchDriverUsers]);

  useEffect(() => {
    fetchDriver();
  }, [fetchDriver]);

  const buildPayload = () => {
    const payload = {
      licenseNumber: form.licenseNumber,
      licenseExpiry: form.licenseExpiry,
      status: form.status,
    };

    if (form.user) {
      payload.user = form.user;
    }

    if (form.experience !== '') {
      payload.experience = Number(form.experience);
    }

    return payload;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canManage) return;

    if (!form.user || !form.licenseNumber || !form.licenseExpiry) {
      setError('User, license number, and license expiry are required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const res = await createDriver(buildPayload());
      const created = res.data?.data || res.data?.driver;

      if (created?._id) {
        navigate(`/drivers/${created._id}`);
        return;
      }

      navigate('/drivers');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!canManage) return;

    if (!form.licenseNumber || !form.licenseExpiry) {
      setError('License number and license expiry are required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      await updateDriver(id, buildPayload());
      setSuccess('Driver updated successfully');
      setEditing(false);
      fetchDriver();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage) return;
    if (!window.confirm('Delete this driver? This cannot be undone.')) return;

    try {
      setError('');
      await deleteDriver(id);
      navigate('/drivers');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete driver');
    }
  };

  if (loading) return <Spinner />;

  if (!isCreateMode && !driver) {
    return (
      <div className="container">
        <div className="alert alert-danger">Driver not found</div>
        <Link to="/drivers" className="btn btn-outline">
          ← Back to Drivers
        </Link>
      </div>
    );
  }

  const name = driver?.name || driver?.user?.name || driver?.user?.email || 'N/A';
  const assignedVehicle = driver?.assignedVehicle || driver?.vehicle;

  return (
    <div className="container">
      <div className="page-header mb-2">
        <div className="flex-between">
          <div>
            <Link to="/drivers" className="text-muted text-sm">
              ← Back to Drivers
            </Link>
            <h1>{isCreateMode ? 'Add Driver' : name}</h1>
          </div>
          {canManage && !isCreateMode && !editing && (
            <div className="flex gap-1">
              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}
      {success && <div className="alert alert-success mb-2">{success}</div>}

      {isCreateMode ? (
        <div className="card mb-3">
          <div className="card-header">
            <h3>Driver Information</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              <div className="form-group mb-2">
                <label className="form-label" htmlFor="create-user">Driver User</label>
                <select
                  id="create-user"
                  className="form-control"
                  value={form.user}
                  onChange={(e) => setForm({ ...form, user: e.target.value })}
                >
                  <option value="">Select a driver user...</option>
                  {driverUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-2">
                <label className="form-label" htmlFor="create-license">License Number</label>
                <input
                  id="create-license"
                  type="text"
                  className="form-control"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                />
              </div>

              <div className="form-group mb-2">
                <label className="form-label" htmlFor="create-expiry">License Expiry</label>
                <input
                  id="create-expiry"
                  type="date"
                  className="form-control"
                  value={form.licenseExpiry}
                  onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                />
              </div>

              <div className="form-group mb-2">
                <label className="form-label" htmlFor="create-experience">Experience (years)</label>
                <input
                  id="create-experience"
                  type="number"
                  min="0"
                  className="form-control"
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                />
              </div>

              <div className="form-group mb-2">
                <label className="form-label" htmlFor="create-status">Status</label>
                <select
                  id="create-status"
                  className="form-control"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="available">Available</option>
                  <option value="on_trip">On Trip</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div className="flex gap-1 mt-2">
                <button type="submit" className="btn btn-primary" disabled={submitting || !canManage}>
                  {submitting ? 'Creating...' : 'Create Driver'}
                </button>
                <Link to="/drivers" className="btn btn-outline">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-2 gap-2 mb-3">
            {/* Driver Info */}
            <div className="card">
              <div className="card-header">
                <h3>Driver Information</h3>
              </div>
              <div className="card-body">
                {editing ? (
                  <form onSubmit={handleUpdate}>
                    <div className="form-group mb-2">
                      <label className="form-label" htmlFor="edit-license">License Number</label>
                      <input
                        id="edit-license"
                        type="text"
                        className="form-control"
                        value={form.licenseNumber}
                        onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      />
                    </div>

                    <div className="form-group mb-2">
                      <label className="form-label" htmlFor="edit-expiry">License Expiry</label>
                      <input
                        id="edit-expiry"
                        type="date"
                        className="form-control"
                        value={form.licenseExpiry}
                        onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                      />
                    </div>

                    <div className="form-group mb-2">
                      <label className="form-label" htmlFor="edit-experience">Experience (years)</label>
                      <input
                        id="edit-experience"
                        type="number"
                        min="0"
                        className="form-control"
                        value={form.experience}
                        onChange={(e) => setForm({ ...form, experience: e.target.value })}
                      />
                    </div>

                    <div className="form-group mb-2">
                      <label className="form-label" htmlFor="edit-status">Status</label>
                      <select
                        id="edit-status"
                        className="form-control"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="available">Available</option>
                        <option value="on_trip">On Trip</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>

                    <div className="flex gap-1 mt-2">
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button type="button" className="btn btn-outline" onClick={() => setEditing(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <InfoRow label="Name" value={name} />
                    <InfoRow label="Email" value={driver.email || driver.user?.email} />
                    <InfoRow label="Phone" value={driver.phone || driver.user?.phone} />
                    <InfoRow
                      label="License Number"
                      value={driver.licenseNumber || driver.license}
                    />
                    <InfoRow
                      label="License Expiry"
                      value={
                        driver.licenseExpiry
                          ? new Date(driver.licenseExpiry).toLocaleDateString()
                          : undefined
                      }
                    />
                    <InfoRow label="Status" value={driver.status} />
                    <div className="flex-between mb-1">
                      <span className="text-muted">Rating</span>
                      <StarRating rating={avgRating} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Vehicle & Location */}
            <div>
              <div className="card mb-2">
                <div className="card-header">
                  <h3>Assigned Vehicle</h3>
                </div>
                <div className="card-body">
                  {assignedVehicle ? (
                    <div>
                      <p className="font-bold">
                        {assignedVehicle.make} {assignedVehicle.model}
                      </p>
                      <p className="text-muted text-sm">
                        Year: {assignedVehicle.year || 'N/A'}
                      </p>
                      <p className="text-muted text-sm">
                        Plate: {assignedVehicle.licensePlate || 'N/A'}
                      </p>
                      <Link
                        to={`/vehicles/${assignedVehicle._id || assignedVehicle}`}
                        className="btn btn-sm btn-outline mt-1"
                      >
                        View Vehicle
                      </Link>
                    </div>
                  ) : (
                    <p className="text-muted">No vehicle assigned</p>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3>Current Location</h3>
                </div>
                <div className="card-body">
                  {location ? (
                    <div>
                      <p className="text-sm">
                        Lat: {location.latitude ?? location.lat ?? 'N/A'}, Lng:{' '}
                        {location.longitude ?? location.lng ?? 'N/A'}
                      </p>
                      {location.updatedAt && (
                        <p className="text-muted text-sm">
                          Updated:{' '}
                          {new Date(location.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">Location unavailable</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Trip History */}
          <div className="card mb-3">
            <div className="card-header">
              <h3>Trip History</h3>
            </div>
            <div className="card-body">
              {trips.length === 0 ? (
                <p className="text-muted text-center">No trip history</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trips.map((order) => (
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
                            <span
                              className={`badge ${orderStatusBadge(order.status)}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Reviews */}
          <div className="card">
            <div className="card-header">
              <div className="flex-between">
                <h3>Reviews</h3>
                <StarRating rating={avgRating} />
              </div>
            </div>
            <div className="card-body">
              {reviews.length === 0 ? (
                <p className="text-muted text-center">No reviews yet</p>
              ) : (
                reviews.map((review) => (
                  <div
                    key={review._id}
                    className="mb-2 p-2"
                    style={{ borderBottom: '1px solid #eee' }}
                  >
                    <div className="flex-between">
                      <span className="font-bold">
                        {review.reviewer?.name ||
                          review.user?.name ||
                          'Anonymous'}
                      </span>
                      <StarRating rating={review.rating} />
                    </div>
                    {review.comment && (
                      <p className="text-sm mt-1">{review.comment}</p>
                    )}
                    <p className="text-muted text-sm">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex-between mb-1">
    <span className="text-muted">{label}</span>
    <span className="font-bold">{value || 'N/A'}</span>
  </div>
);

export default DriverDetailPage;
