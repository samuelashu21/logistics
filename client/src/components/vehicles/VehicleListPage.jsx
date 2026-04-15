import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getVehicles } from '../../services/api';
import Spinner from '../common/Spinner';
import Pagination from '../common/Pagination';

const vehicleStatusBadge = (status) => {
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

const VehicleListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState('grid');

  // Filters
  const [filters, setFilters] = useState({
    make: '',
    model: '',
    year: '',
    status: '',
  });

  const canManage = user.role === 'admin' || user.role === 'owner';

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: 12 };
      if (filters.make) params.make = filters.make;
      if (filters.model) params.model = filters.model;
      if (filters.year) params.year = filters.year;
      if (filters.status) params.status = filters.status;
      const res = await getVehicles(params);
      const data = res.data;
      setVehicles(data.data || data.vehicles || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 12) || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container">
      <div className="page-header mb-2">
        <div className="flex-between">
          <h1>Vehicles</h1>
          <div className="flex gap-1">
            <button
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            {canManage && (
              <Link to="/vehicles/new" className="btn btn-primary">
                + Add Vehicle
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}

      {/* Filters */}
      <div className="card mb-2">
        <div className="card-body">
          <div className="flex gap-2 flex-wrap">
            <div className="form-group" style={{ minWidth: 140 }}>
              <label className="form-label">Make</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Toyota"
                value={filters.make}
                onChange={(e) => updateFilter('make', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ minWidth: 140 }}>
              <label className="form-label">Model</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Hilux"
                value={filters.model}
                onChange={(e) => updateFilter('model', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ minWidth: 100 }}>
              <label className="form-label">Year</label>
              <input
                type="number"
                className="form-control"
                placeholder="2024"
                value={filters.year}
                onChange={(e) => updateFilter('year', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ minWidth: 140 }}>
              <label className="form-label">Status</label>
              <select
                className="form-control"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
              >
                <option value="">All</option>
                <option value="available">Available</option>
                <option value="active">Active</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : vehicles.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-muted p-3">
            No vehicles found
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-3 gap-2">
          {vehicles.map((v) => (
            <div
              key={v._id}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/vehicles/${v._id}`)}
            >
              <div
                className="card-body"
                style={{
                  background: 'var(--light)',
                  minHeight: 120,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  borderBottom: '1px solid #eee',
                }}
              >
                🚛
              </div>
              <div className="card-body">
                <div className="flex-between mb-1">
                  <h3>
                    {v.make} {v.model}
                  </h3>
                  <span className={`badge ${vehicleStatusBadge(v.status)}`}>
                    {v.status}
                  </span>
                </div>
                <p className="text-muted text-sm">Year: {v.year || 'N/A'}</p>
                <p className="text-muted text-sm">
                  Plate: {v.licensePlate || 'N/A'}
                </p>
                {v.owner && (
                  <p className="text-muted text-sm">
                    Owner: {v.owner.name || v.owner.email}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Year</th>
                    <th>License Plate</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v._id}>
                      <td>
                        {v.make} {v.model}
                      </td>
                      <td>{v.year || 'N/A'}</td>
                      <td>{v.licensePlate || 'N/A'}</td>
                      <td>
                        <span className={`badge ${vehicleStatusBadge(v.status)}`}>
                          {v.status}
                        </span>
                      </td>
                      <td>{v.owner?.name || v.owner?.email || 'N/A'}</td>
                      <td>
                        <Link
                          to={`/vehicles/${v._id}`}
                          className="btn btn-sm btn-outline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default VehicleListPage;
