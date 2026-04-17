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
      <span className="text-muted text-sm">({(Number(rating) || 0).toFixed(1)})</span>
    </span>
  );
};

const DriverDetailPage = () => {
  const { id } = useParams();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  
  const isCreateMode = id === 'new';
  const canManage = authUser?.role === 'admin' || authUser?.role === 'owner';
  const canViewUserList = canManage;

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

  // 1. Defensively fetch users (handles the 403 Forbidden error)
  const fetchDriverUsers = useCallback(async () => {
    if (!canViewUserList) {
      setDriverUsers([]);
      return;
    }
    try {
      const res = await getUsers({ role: 'driver', limit: 1000 });
      const users = res.data?.data || res.data?.users || res.data || [];
      setDriverUsers(Array.isArray(users) ? users : []);
    } catch (err) {
      console.warn('Failed to load driver user accounts.', err?.response?.status || err?.message);
      setDriverUsers([]); 
    }
  }, [canViewUserList]);

  const fetchDriverData = useCallback(async () => {
    console.log("DEBUG: Fetching Driver with ID:", id);
    
    if (!id || id === 'undefined') {
      setError("No valid Driver ID provided.");
      setLoading(false);
      return;
    }

    if (isCreateMode) {
      setLoading(true);
      await fetchDriverUsers();
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const driverRes = await getDriver(id);
      const d = driverRes.data?.data || driverRes.data;

      if (!d) throw new Error("Driver profile not found.");

      setDriver(d);

      // Map backend data to local form state
      setForm({
        user: d.user?._id || d.user || '',
        licenseNumber: d.licenseNumber || d.license || '',
        licenseExpiry: d.licenseExpiry ? d.licenseExpiry.split('T')[0] : '',
        experience: d.experience ?? '',
        status: d.status || 'available',
      });

      // Secondary Data Fetching
      const [ordersRes, reviewsRes, ratingRes] = await Promise.allSettled([
        getOrders({ driver: id, limit: 10 }),
        getReviews({ driver: id, limit: 10 }),
        getAverageRating(id),
      ]);

      if (ordersRes.status === 'fulfilled') setTrips(ordersRes.value.data?.data || ordersRes.value.data?.orders || []);
      if (reviewsRes.status === 'fulfilled') setReviews(reviewsRes.value.data?.data || reviewsRes.value.data?.reviews || []);
      if (ratingRes.status === 'fulfilled') {
        const r = ratingRes.value.data;
        setAvgRating(r?.data?.average || r?.average || 0);
      }

      // Live Tracking Fetch
      const vId = d.assignedVehicle?._id || d.vehicle?._id || d.assignedVehicle || d.vehicle;
      if (vId && typeof vId === 'string' && vId.length > 5) {
        getVehicleLocation(vId)
          .then(res => setLocation(res.data?.data || res.data))
          .catch(() => setLocation(null));
      }

    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load driver.");
    } finally {
      setLoading(false);
    }
  }, [id, isCreateMode, fetchDriverUsers]);

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  // Handlers
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await updateDriver(id, { ...form, experience: Number(form.experience) });
      setSuccess('Profile updated!');
      setEditing(false);
      fetchDriverData();
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.user) return setError("Please link a user account.");
    setSubmitting(true);
    try {
      const res = await createDriver(form);
      navigate(`/drivers/${res.data?.data?._id || res.data?._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="container">
      <div className="flex-between mb-3">
        <div>
          <Link to="/drivers" className="text-muted">← Back to Drivers</Link>
          <h1>{isCreateMode ? 'Add Driver' : (driver?.user?.name || driver?.name || 'Driver Details')}</h1>
        </div>
        {!isCreateMode && canManage && (
          <div className="flex gap-1">
             <button className="btn btn-primary" onClick={() => setEditing(!editing)}>
                {editing ? 'Cancel' : 'Edit'}
             </button>
             <button className="btn btn-danger" onClick={async () => {
                 if(window.confirm("Delete?")) {
                     await deleteDriver(id);
                     navigate('/drivers');
                 }
             }}>Delete</button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}
      {success && <div className="alert alert-success mb-2">{success}</div>}

      <div className="grid grid-2 gap-2">
        {/* Profile Card */}
        <div className="card">
          <div className="card-body">
            {isCreateMode || editing ? (
              <form onSubmit={isCreateMode ? handleCreate : handleUpdate}>
                {isCreateMode && (
                  <div className="form-group mb-2">
                    <label>Select User Account</label>
                    <select className="form-control" value={form.user} onChange={e => setForm({...form, user: e.target.value})}>
                      <option value="">-- Choose User --</option>
                      {driverUsers.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                    {!canViewUserList && <small className="text-danger">You do not have permission to view user accounts for driver creation.</small>}
                    {canViewUserList && driverUsers.length === 0 && <small className="text-danger">No eligible user accounts found.</small>}
                  </div>
                )}
                <div className="form-group mb-2">
                  <label>License Number</label>
                  <input type="text" className="form-control" value={form.licenseNumber} onChange={e => setForm({...form, licenseNumber: e.target.value})} />
                </div>
                <div className="form-group mb-2">
                  <label>License Expiry</label>
                  <input type="date" className="form-control" value={form.licenseExpiry} onChange={e => setForm({...form, licenseExpiry: e.target.value})} />
                </div>
                <button className="btn btn-primary mt-2" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Driver'}
                </button>
              </form>
            ) : (
              <>
                <InfoRow label="Email" value={driver?.user?.email || driver?.email} />
                <InfoRow label="License" value={driver?.licenseNumber} />
                <InfoRow label="Status" value={driver?.status} />
                <div className="flex-between">
                  <span className="text-muted">Rating</span>
                  <StarRating rating={avgRating} />
                </div>
              </>
            )}
          </div> 
        </div>

        {/* Vehicle Card */}
        {!isCreateMode && (
          <div className="card">
            <div className="card-header">Vehicle Assignment</div>
            <div className="card-body">
              {driver?.assignedVehicle ? (
                <div>
                  <p><strong>{driver.assignedVehicle.licensePlate}</strong></p>
                  <p className="text-sm text-muted">{driver.assignedVehicle.make} {driver.assignedVehicle.model}</p>
                </div>
              ) : <p className="text-muted">No vehicle assigned.</p>}
            </div>
          </div>
        )}
      </div>
      
      {/* Trip History */}
      {!isCreateMode && (
        <div className="card mt-3">
          <div className="card-header">Recent Trips</div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t._id}>
                    <td>#{t._id.slice(-6).toUpperCase()}</td>
                    <td><span className={`badge ${orderStatusBadge(t.status)}`}>{t.status}</span></td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex-between mb-2 pb-1" style={{ borderBottom: '1px solid #eee' }}>
    <span className="text-muted">{label}</span>
    <span className="font-bold">{value || 'N/A'}</span>
  </div>
);

export default DriverDetailPage;
