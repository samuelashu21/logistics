import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  createOrder,
  getAdvertisement,
  getVehicles,
} from '../../services/api';
import Spinner from '../common/Spinner';

const geocodeWithOpenStreetMap = async (address) => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to geocode address');
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Address not found');
  }

  const topResult = results[0];
  const latitude = Number(topResult.lat);
  const longitude = Number(topResult.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Invalid coordinates returned');
  }

  return {
    address: topResult.display_name || address,
    coordinates: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  };
};

const OrderCreatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const advertisementId = searchParams.get('advertisementId');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [adError, setAdError] = useState('');
  const [adTitle, setAdTitle] = useState('');

  const [formData, setFormData] = useState({
    vehicle: '',
    pickupAddress: '',
    dropoffAddress: '',
    paymentAmount: '',
    notes: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        setAdError('');
        const loadAllVehicles = async () => {
          const pageSize = 100;
          let page = 1;
          let allVehicles = [];

          while (true) {
            const res = await getVehicles({ page, limit: pageSize });
            const batch = res.data?.data || [];
            allVehicles = allVehicles.concat(batch);
            if (batch.length < pageSize) break;
            page += 1;
          }

          return allVehicles;
        };

        const [vehicleData, adRes] = await Promise.all([
          loadAllVehicles(),
          advertisementId
            ? getAdvertisement(advertisementId).catch(() => null)
            : Promise.resolve(null),
        ]);

        setVehicles(vehicleData);

        if (adRes?.data) {
          const ad = adRes.data.data || adRes.data.advertisement || adRes.data;
          setAdTitle(ad.title || `${ad.make || ''} ${ad.model || ''}`.trim());
          setFormData((prev) => ({
            ...prev,
            vehicle: ad.vehicle || prev.vehicle,
            paymentAmount:
              ad.price != null && ad.price !== ''
                ? String(ad.price)
                : prev.paymentAmount,
          }));
        } else if (advertisementId) {
          setAdError('Could not load advertisement details');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [advertisementId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.vehicle || !formData.pickupAddress || !formData.dropoffAddress) {
      setError('Please provide vehicle, pickup address, and dropoff address');
      return;
    }

    try {
      setSubmitting(true);
      let pickupLocation;
      let dropoffLocation;

      try {
        pickupLocation = await geocodeWithOpenStreetMap(formData.pickupAddress.trim());
      } catch (geocodeError) {
        throw new Error('Pickup address could not be found on OpenStreetMap');
      }

      try {
        dropoffLocation = await geocodeWithOpenStreetMap(formData.dropoffAddress.trim());
      } catch (geocodeError) {
        throw new Error('Delivery address could not be found on OpenStreetMap');
      }

      const payload = {
        vehicle: formData.vehicle,
        pickupLocation,
        dropoffLocation,
        notes: formData.notes || undefined,
      };

      if (formData.paymentAmount !== '') {
        payload.paymentAmount = Number(formData.paymentAmount);
      }

      const res = await createOrder(payload);
      const order = res.data?.data || res.data?.order || res.data;
      navigate(order?._id ? `/orders/${order._id}` : '/orders');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Failed to create order'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (user.role !== 'customer') {
    return (
      <div className="container">
        <div className="alert alert-danger">Only customers can place orders</div>
        <Link to="/orders" className="btn btn-outline">← Back to Orders</Link>
      </div>
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="container">
      <div className="page-header mb-2">
        <Link to="/orders" className="text-muted text-sm">← Back to Orders</Link>
        <h1 className="mt-1">Place Order</h1>
        <p className="text-muted">Create a transport request for owner approval.</p>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}
      {adError && <div className="alert alert-warning mb-2">{adError}</div>}

      <div className="card">
        <div className="card-body">
          {adTitle && (
            <div className="mb-2">
              <p className="text-muted text-sm">From Advertisement</p>
              <p className="font-bold">{adTitle}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-2">
              <label className="form-label">Vehicle</label>
              <select
                className="form-control"
                name="vehicle"
                value={formData.vehicle}
                onChange={handleChange}
                required
              >
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle._id} value={vehicle._id}>
                    {`${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group mb-2">
              <label className="form-label">Pickup Address</label>
              <input
                type="text"
                className="form-control"
                name="pickupAddress"
                value={formData.pickupAddress}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group mb-2">
              <label className="form-label">Dropoff Address</label>
              <input
                type="text"
                className="form-control"
                name="dropoffAddress"
                value={formData.dropoffAddress}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group mb-2">
              <label className="form-label">Estimated Payment Amount</label>
              <input
                type="number"
                min="0"
                className="form-control"
                name="paymentAmount"
                value={formData.paymentAmount}
                onChange={handleChange}
              />
            </div>

            <div className="form-group mb-2">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <div className="flex gap-1">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Order'}
              </button>
              <Link to="/orders" className="btn btn-outline">Cancel</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OrderCreatePage; 
