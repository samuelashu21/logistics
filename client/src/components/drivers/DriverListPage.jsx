import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDrivers } from '../../services/api';
import Spinner from '../common/Spinner';
import Pagination from '../common/Pagination';

const driverStatusBadge = (status) => {
  const map = {
    active: 'badge-success',
    available: 'badge-success',
    inactive: 'badge-danger',
    on_trip: 'badge-warning',
    busy: 'badge-warning',
    offline: 'badge-danger',
  };
  return map[status] || 'badge-info';
};

const DriverListPage = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const canManage = user.role === 'admin' || user.role === 'owner';
  const canCreateDriver = user.role === 'admin' || user.role === 'owner';

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await getDrivers(params);
      const data = res.data;

      setDrivers(data.data || data.drivers || []);
      setTotalPages(data.pages || Math.ceil((data.total || 0) / 10) || 1);
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to load drivers'
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  return (
    <div className="container">
      <div className="page-header mb-2">
        <div className="flex-between">
          <h1>Drivers</h1>
          {canCreateDriver && (
            <Link to="/drivers/new" className="btn btn-primary">
              + Add Driver
            </Link>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}

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
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="available">Available</option>
                <option value="on_trip">On Trip</option>
                <option value="inactive">Inactive</option>
                <option value="offline">Offline</option>
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
            {drivers.length === 0 ? (
              <p className="text-muted text-center">No drivers found</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>License</th>
                      <th>Vehicle</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => {
                      const name = d.name || d.user?.name || d.user?.email || 'N/A';
                      const license = d.licenseNumber || d.license || 'N/A';
                      const vehicleName = d.vehicle
                        ? `${d.vehicle.make || ''} ${d.vehicle.model || ''}`.trim() || 'Assigned'
                        : 'Unassigned';
                      const status = d.status || 'active';

                      return (
                        <tr key={d._id}>
                          <td>{name}</td>
                          <td>{license}</td>
                          <td>
                            {d.vehicle ? (
                              <Link to={`/vehicles/${d.vehicle._id || d.vehicle}`}>
                                {vehicleName}
                              </Link>
                            ) : (
                              <span className="text-muted">Unassigned</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${driverStatusBadge(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td>
                            <Link to={`/drivers/${d._id}`} className="btn btn-sm btn-outline">
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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
    </div>
  );
};

export default DriverListPage;