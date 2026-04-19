import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  assignDriver,
  getDrivers,
  getOrders,
} from '../../services/api';
import Spinner from '../common/Spinner';

const statusBadge = (status) => {
  const map = {
    active: 'badge-success', 
    available: 'badge-success',
    inactive: 'badge-danger',
    maintenance: 'badge-warning',
    in_use: 'badge-info',
    assigned: 'badge-info',
  };
  return map[status] || 'badge-info';
};

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

const VEHICLE_FORM_FIELDS = ['make', 'model', 'year', 'vin', 'licensePlate', 'color', 'capacity', 'type'];
const formatFieldLabel = (field) => field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');

const VehicleDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCreateMode = id === 'new';

  const [vehicle, setVehicle] = useState(null);
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: '',
    vin: '',
    licensePlate: '',
    color: '',
    capacity: '',
    type: '',
    status: 'available',
  });
  const [selectedDriver, setSelectedDriver] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Authorization check
  const canManage = user?.role === 'admin' || user?.role === 'owner';

  const fetchVehicle = useCallback(async () => {
    if (isCreateMode) {
      setLoading(false);
      setVehicle(null);
      setOrders([]);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const [vehicleRes, ordersRes] = await Promise.all([
        getVehicle(id),
        getOrders({ vehicle: id, limit: 10, sort: '-createdAt' }).catch(() => ({
          data: { data: [] },
        })),
      ]);

      const v = vehicleRes.data.data || vehicleRes.data;
      setVehicle(v);
      
      // Syncing form with backend fields
      setForm({
        make: v.make || '',
        model: v.model || '',
        year: v.year || '',
        vin: v.vin || '',
        licensePlate: v.licensePlate || '',
        color: v.color || '',
        capacity: v.capacity || '',
        type: v.type || '',
        status: v.status || 'available',
      });

      setOrders(ordersRes.data.data || ordersRes.data.orders || []);

      if (canManage) {
        const driversRes = await getDrivers({ limit: 100 }).catch(() => ({
          data: { data: [] },
        }));
        setDrivers(driversRes.data.data || driversRes.data.drivers || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load vehicle details');
    } finally {
      setLoading(false);
    }
  }, [id, canManage, isCreateMode]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canManage) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await createVehicle(form);
      const created = res.data?.data || res.data?.vehicle;
      if (created?._id) {
        navigate(`/vehicles/${created._id}`);
        return;
      }
      console.warn('Vehicle created without returned _id; redirecting to vehicle list.');
      navigate('/vehicles');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await updateVehicle(id, form);
      setSuccess('Vehicle updated successfully');
      setEditing(false);
      fetchVehicle();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this vehicle? This cannot be undone.')) return;
    try {
      await deleteVehicle(id);
      navigate('/vehicles');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete vehicle');
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver) return;
    try {
      setSubmitting(true);
      setError('');
      await assignDriver(id, selectedDriver);
      setSuccess('Driver assigned successfully');
      setSelectedDriver('');
      fetchVehicle();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign driver');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  if (!isCreateMode && !vehicle) {
    return (
      <div className="container">
        <div className="alert alert-danger">Vehicle not found</div>
        <Link to="/vehicles" className="btn btn-outline mt-1">
          ← Back to Vehicles
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header mb-2">
        <div className="flex-between">
          <div>
            <Link to="/vehicles" className="text-muted text-sm">
              ← Back to Vehicles
            </Link>
            <h1>{isCreateMode ? 'Add Vehicle' : `${vehicle.make} ${vehicle.model}`}</h1>
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
            <h3>Vehicle Information</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              {VEHICLE_FORM_FIELDS.map((field) => (
                <div className="form-group mb-2" key={field}>
                  <label className="form-label" htmlFor={`create-${field}`}>
                    {formatFieldLabel(field)}
                  </label>
                  <input
                    id={`create-${field}`}
                    type={field === 'year' || field === 'capacity' ? 'number' : 'text'}
                    className="form-control"
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  />
                </div>
              ))}
              <div className="form-group mb-2">
                <label className="form-label" htmlFor="create-status">Status</label>
                <select
                  id="create-status"
                  className="form-control"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="available">Available</option>
                  <option value="active">Active</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex gap-1 mt-2">
                <button type="submit" className="btn btn-primary" disabled={submitting || !canManage}>
                  {submitting ? 'Creating...' : 'Create Vehicle'}
                </button>
                <Link to="/vehicles" className="btn btn-outline">
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      ) : (
      <div className="grid grid-2 gap-2 mb-3">
        {/* Left Column: Vehicle Info */}
        <div className="card">
          <div className="card-header">
            <h3>Vehicle Specifications</h3>
          </div>
          <div className="card-body">
            {editing ? (
              <form onSubmit={handleUpdate}>
                {VEHICLE_FORM_FIELDS.map((field) => (
                  <div className="form-group mb-2" key={field}>
                    <label className="form-label" htmlFor={`edit-${field}`}>
                      {formatFieldLabel(field)}
                    </label>
                    <input
                      id={`edit-${field}`}
                      type={field === 'year' || field === 'capacity' ? 'number' : 'text'}
                      className="form-control"
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="form-group mb-2">
                  <label className="form-label" htmlFor="edit-status">Status</label>
                  <select
                    id="edit-status"
                    className="form-control"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="available">Available</option>
                    <option value="active">Active</option>
                    <option value="in_use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
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
              <div>
                <InfoRow label="Make" value={vehicle.make} />
                <InfoRow label="Model" value={vehicle.model} />
                <InfoRow label="Year" value={vehicle.year} />
                <InfoRow label="VIN" value={vehicle.vin} />
                <InfoRow label="License Plate" value={vehicle.licensePlate} />
                <InfoRow label="Color" value={vehicle.color} />
                <InfoRow label="Capacity" value={vehicle.capacity} />
                <InfoRow label="Type" value={vehicle.type} />
                <div className="flex-between mb-1">
                  <span className="text-muted">Status</span>
                  <span className={`badge ${statusBadge(vehicle.status)}`}>
                    {vehicle.status}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Driver & Tracking */}
        <div>
          <div className="card mb-2">
            <div className="card-header">
              <h3>Assigned Driver</h3>
            </div>
            <div className="card-body">
              {/* Note: Backend uses assignedDriver, mapping it here */}
              {vehicle.assignedDriver ? (
                <div>
                  <p className="font-bold">{vehicle.assignedDriver.name}</p>
                  <p className="text-muted text-sm">{vehicle.assignedDriver.email}</p>
                  <Link to={`/drivers/${vehicle.assignedDriver._id}`} className="btn btn-sm btn-outline mt-1">
                    View Driver Profile
                  </Link>
                </div>
              ) : (
                <p className="text-muted">No driver assigned</p>
              )}

              {canManage && (
                <div className="mt-2 border-top pt-2">
                  <label className="form-label text-sm">Assign New Driver</label>
                  <div className="flex gap-1">
                    <select
                      className="form-control form-control-sm"
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                    >
                      <option value="">Select driver...</option>
                      {drivers.filter((d) => d.user?._id).map((d) => (
                        <option key={d._id} value={d.user._id}>
                          {d.name || d.user?.name || d.user?.email}
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

          <div className="card">
            <div className="card-header">
              <h3>Live Tracking</h3>
            </div>
            <div className="card-body">
              <p className="text-sm text-muted mb-1">View real-time location and telemetry.</p>
              <Link to={`/tracking?vehicle=${id}`} className="btn btn-primary w-full text-center">
                Track Vehicle
              </Link>
            </div>
          </div>
        </div>
      </div>
      )}

      {!isCreateMode && (
        /* Order History Table */
        <div className="card">
          <div className="card-header">
            <h3>Recent Order History</h3>
          </div>
          <div className="card-body">
            {orders.length === 0 ? (
              <p className="text-muted text-center py-2">No orders recorded for this vehicle</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id}>
                        <td>
                          <Link to={`/orders/${order._id}`} className="font-mono">
                            #{order._id?.slice(-6).toUpperCase()}
                          </Link>
                        </td>
                        <td>{order.customer?.name || 'Walk-in'}</td>
                        <td>
                          <span className={`badge ${orderStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>${(order.totalAmount ?? 0).toLocaleString()}</td>
                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for clean data rows
const InfoRow = ({ label, value }) => (
  <div className="flex-between mb-1 pb-1 border-bottom-light">
    <span className="text-muted">{label}</span>
    <span className="font-bold">{value || 'N/A'}</span>
  </div>
); 

export default VehicleDetailPage;