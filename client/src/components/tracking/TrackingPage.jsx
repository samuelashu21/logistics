import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  getActiveVehicles,
  getVehicleLocation,
  getTrackingHistory,
} from '../../services/api';
import Spinner from '../common/Spinner';

const formatTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

const TrackingPage = () => {
  const { user } = useAuth();
  const socket = useSocket();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Tracking history state
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getActiveVehicles();
      const data = res.data;
      setVehicles(data.data || data.vehicles || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load active vehicles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Real-time location updates
  useEffect(() => {
    if (!socket) return;
    const handleLocationUpdate = (update) => {
      setVehicles((prev) =>
        prev.map((v) => {
          const vehicleId = v._id || v.vehicleId;
          const updateId = update.vehicleId || update._id;
          if (vehicleId === updateId) {
            return {
              ...v,
              location: update.location || v.location,
              latitude: update.latitude ?? update.location?.latitude ?? v.latitude,
              longitude: update.longitude ?? update.location?.longitude ?? v.longitude,
              speed: update.speed ?? v.speed,
              lastUpdate: update.timestamp || update.lastUpdate || new Date().toISOString(),
            };
          }
          return v;
        })
      );
    };
    socket.on('locationUpdate', handleLocationUpdate);
    return () => {
      socket.off('locationUpdate', handleLocationUpdate);
    };
  }, [socket]);

  const handleSelectVehicle = async (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowHistory(false);
    setHistoryData([]);
    // Fetch latest location
    try {
      const vehicleId = vehicle._id || vehicle.vehicleId;
      const res = await getVehicleLocation(vehicleId);
      const loc = res.data.data || res.data.location || res.data;
      setSelectedVehicle((prev) => ({
        ...prev,
        latitude: loc.latitude ?? loc.lat ?? prev?.latitude,
        longitude: loc.longitude ?? loc.lng ?? prev?.longitude,
        speed: loc.speed ?? prev?.speed,
        lastUpdate: loc.timestamp || loc.lastUpdate || prev?.lastUpdate,
      }));
    } catch {
      // Location fetch may fail; keep existing data
    }
  };

  const fetchHistory = async () => {
    if (!selectedVehicle) return;
    try {
      setHistoryLoading(true);
      const vehicleId = selectedVehicle._id || selectedVehicle.vehicleId;
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await getTrackingHistory(vehicleId, params);
      const data = res.data;
      setHistoryData(data.data || data.history || []);
      setShowHistory(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tracking history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getLat = (v) => v.latitude ?? v.location?.latitude ?? v.location?.lat ?? v.lat ?? 'N/A';
  const getLng = (v) => v.longitude ?? v.location?.longitude ?? v.location?.lng ?? v.lng ?? 'N/A';
  const getSpeed = (v) => v.speed ?? v.location?.speed ?? null;
  const getVehicleName = (v) => {
    if (v.make || v.model) return `${v.make || ''} ${v.model || ''}`.trim();
    if (v.vehicle) return `${v.vehicle.make || ''} ${v.vehicle.model || ''}`.trim();
    return v.name || v.plateNumber || `Vehicle ${(v._id || '').slice(-6)}`;
  };
  const getDriverName = (v) => v.driverName || v.driver?.name || v.driver || 'Unassigned';
  const getLastUpdate = (v) => v.lastUpdate || v.updatedAt || v.location?.timestamp;

  if (loading) return <Spinner />;

  return (
    <div className="container">
      <div className="page-header mb-2">
        <h1>Vehicle Tracking</h1>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, minHeight: 500 }}>
        {/* Left Panel - Vehicle List */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header">
            <h3 style={{ margin: 0 }}>Active Vehicles ({vehicles.length})</h3>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 600 }}>
            {vehicles.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: 24 }}>
                No active vehicles
              </p>
            ) : (
              vehicles.map((v) => {
                const id = v._id || v.vehicleId;
                const isSelected = selectedVehicle && (selectedVehicle._id || selectedVehicle.vehicleId) === id;
                return (
                  <div
                    key={id}
                    onClick={() => handleSelectVehicle(v)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--gray-lighter)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      transition: 'var(--transition)',
                    }}
                  >
                    <div className="font-bold" style={{ fontSize: 14 }}>
                      🚛 {getVehicleName(v)}
                    </div>
                    <div className="text-muted text-sm">
                      Driver: {getDriverName(v)}
                    </div>
                    <div className="text-muted text-sm">
                      📍 {getLat(v) !== 'N/A' ? `${Number(getLat(v)).toFixed(4)}, ${Number(getLng(v)).toFixed(4)}` : 'No location'}
                    </div>
                    {getSpeed(v) != null && (
                      <div className="text-muted text-sm">
                        🏎️ {getSpeed(v)} km/h
                      </div>
                    )}
                    {getLastUpdate(v) && (
                      <div className="text-sm" style={{ color: 'var(--secondary)', marginTop: 2 }}>
                        Updated {timeAgo(getLastUpdate(v))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Area */}
        <div>
          {/* Map Placeholder / Vehicle Details */}
          <div className="card mb-2">
            <div className="card-body">
              {selectedVehicle ? (
                <div>
                  <div className="flex-between mb-2">
                    <h2 style={{ margin: 0 }}>🚛 {getVehicleName(selectedVehicle)}</h2>
                    <span className="badge badge-success">Active</span>
                  </div>

                  {/* Map Placeholder Card */}
                  <div
                    style={{
                      background: 'var(--gray-lighter)',
                      borderRadius: 'var(--radius)',
                      padding: 32,
                      textAlign: 'center',
                      marginBottom: 20,
                      border: '2px dashed var(--gray-light)',
                    }}
                  >
                    <span style={{ fontSize: 48 }}>🗺️</span>
                    <h3 style={{ margin: '8px 0 4px', color: 'var(--dark)' }}>
                      Map View — Vehicle tracking data displayed here
                    </h3>
                    <p className="text-muted" style={{ margin: 0 }}>
                      Coordinates: {getLat(selectedVehicle) !== 'N/A'
                        ? `${Number(getLat(selectedVehicle)).toFixed(6)}, ${Number(getLng(selectedVehicle)).toFixed(6)}`
                        : 'No location data available'}
                    </p>
                    {getSpeed(selectedVehicle) != null && (
                      <p className="text-muted" style={{ margin: '4px 0 0' }}>
                        Speed: {getSpeed(selectedVehicle)} km/h
                      </p>
                    )}
                    <p className="text-sm text-muted" style={{ marginTop: 8, fontStyle: 'italic' }}>
                      Map integration (Google Maps/Leaflet) requires API keys
                    </p>
                  </div>

                  {/* Vehicle Info Cards */}
                  <div className="grid grid-3" style={{ gap: 12 }}>
                    <div className="card">
                      <div className="card-body text-center">
                        <div className="text-muted text-sm">Driver</div>
                        <div className="font-bold">{getDriverName(selectedVehicle)}</div>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-body text-center">
                        <div className="text-muted text-sm">Location</div>
                        <div className="font-bold" style={{ fontSize: 13 }}>
                          {getLat(selectedVehicle) !== 'N/A'
                            ? `${Number(getLat(selectedVehicle)).toFixed(4)}, ${Number(getLng(selectedVehicle)).toFixed(4)}`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-body text-center">
                        <div className="text-muted text-sm">Last Update</div>
                        <div className="font-bold" style={{ fontSize: 13 }}>
                          {getLastUpdate(selectedVehicle) ? formatTime(getLastUpdate(selectedVehicle)) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center" style={{ padding: 64 }}>
                  <span style={{ fontSize: 64 }}>📍</span>
                  <h2 className="text-muted" style={{ marginTop: 12 }}>Select a Vehicle</h2>
                  <p className="text-muted">
                    Choose a vehicle from the left panel to view its tracking details
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tracking History */}
          {selectedVehicle && (
            <div className="card">
              <div className="card-header">
                <div className="flex-between">
                  <h3 style={{ margin: 0 }}>Tracking History</h3>
                </div>
              </div>
              <div className="card-body">
                <div className="flex gap-2 flex-wrap mb-2">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Start Date</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">End Date</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={fetchHistory}
                      disabled={historyLoading}
                    >
                      {historyLoading ? 'Loading...' : 'Load History'}
                    </button>
                  </div>
                </div>

                {showHistory && (
                  historyData.length === 0 ? (
                    <p className="text-muted text-center" style={{ padding: 24 }}>
                      No tracking points found for the selected date range
                    </p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Timestamp</th>
                            <th>Latitude</th>
                            <th>Longitude</th>
                            <th>Speed</th>
                            <th>Heading</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.map((point, idx) => (
                            <tr key={point._id || idx}>
                              <td>{idx + 1}</td>
                              <td>{formatTime(point.timestamp || point.createdAt)}</td>
                              <td>{(point.latitude ?? point.location?.latitude ?? point.lat ?? 'N/A').toString()}</td>
                              <td>{(point.longitude ?? point.location?.longitude ?? point.lng ?? 'N/A').toString()}</td>
                              <td>{point.speed != null ? `${point.speed} km/h` : 'N/A'}</td>
                              <td>{point.heading != null ? `${point.heading}°` : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;
