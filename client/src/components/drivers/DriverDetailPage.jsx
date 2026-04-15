import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getDriver,
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

  const [driver, setDriver] = useState(null);
  const [trips, setTrips] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDriver = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const driverRes = await getDriver(id);
      const d = driverRes.data.data || driverRes.data;
      setDriver(d);

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
      if (d.vehicle?._id || d.vehicle) {
        const vehicleId = d.vehicle?._id || d.vehicle;
        try {
          const locRes = await getVehicleLocation(vehicleId);
          setLocation(locRes.data.data || locRes.data || null);
        } catch {
          // location unavailable
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load driver');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDriver();
  }, [fetchDriver]);

  if (loading) return <Spinner />;

  if (!driver) {
    return (
      <div className="container">
        <div className="alert alert-danger">Driver not found</div>
        <Link to="/drivers" className="btn btn-outline">
          ← Back to Drivers
        </Link>
      </div>
    );
  }

  const name = driver.name || driver.user?.name || driver.user?.email || 'N/A';

  return (
    <div className="container">
      <div className="page-header mb-2">
        <Link to="/drivers" className="text-muted text-sm">
          ← Back to Drivers
        </Link>
        <h1>{name}</h1>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}

      <div className="grid grid-2 gap-2 mb-3">
        {/* Driver Info */}
        <div className="card">
          <div className="card-header">
            <h3>Driver Information</h3>
          </div>
          <div className="card-body">
            <InfoRow label="Name" value={name} />
            <InfoRow label="Email" value={driver.email || driver.user?.email} />
            <InfoRow label="Phone" value={driver.phone || driver.user?.phone} />
            <InfoRow
              label="License Number"
              value={driver.licenseNumber || driver.license}
            />
            <InfoRow label="License Expiry" value={
              driver.licenseExpiry
                ? new Date(driver.licenseExpiry).toLocaleDateString()
                : undefined
            } />
            <InfoRow label="Status" value={driver.status} />
            <div className="flex-between mb-1">
              <span className="text-muted">Rating</span>
              <StarRating rating={avgRating} />
            </div>
          </div>
        </div>

        {/* Vehicle & Location */}
        <div>
          <div className="card mb-2">
            <div className="card-header">
              <h3>Assigned Vehicle</h3>
            </div>
            <div className="card-body">
              {driver.vehicle ? (
                <div>
                  <p className="font-bold">
                    {driver.vehicle.make} {driver.vehicle.model}
                  </p>
                  <p className="text-muted text-sm">
                    Year: {driver.vehicle.year || 'N/A'}
                  </p>
                  <p className="text-muted text-sm">
                    Plate: {driver.vehicle.licensePlate || 'N/A'}
                  </p>
                  <Link
                    to={`/vehicles/${driver.vehicle._id || driver.vehicle}`}
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
