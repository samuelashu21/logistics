import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import {
  getAdvertisement,
  deleteAdvertisement,
  approveAd,
  rejectAd,
} from '../../services/api';
import Spinner from '../common/Spinner';
import ReviewSection from '../reviews/ReviewSection';

const formatPrice = (price) => {
  if (!price && price !== 0) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
};

const statusBadge = (status) => {
  const map = {
    active: 'badge-success',
    approved: 'badge-success',
    pending: 'badge-warning',
    rejected: 'badge-danger',
    sold: 'badge-info',
    expired: 'badge-danger',
  };
  return map[status] || 'badge-info';
};

const DetailRow = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--gray-lighter)' }}>
      <span className="text-muted" style={{ minWidth: 160, fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'var(--dark)' }}>{value}</span>
    </div>
  );
};

const AdvertisementDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchAd = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getAdvertisement(id);
      setAd(res.data.data || res.data.advertisement || res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load advertisement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAd();
  }, [fetchAd]);

  const isAdmin = user?.role === 'admin';
  const isOwner = ad && (
    ad.user?._id === user?._id ||
    ad.userId === user?._id ||
    ad.seller?.userId === user?._id
  );
  const canEdit = isOwner || isAdmin;

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      setSubmitting(true);
      await deleteAdvertisement(id);
      toast.success('Listing deleted successfully');
      navigate('/advertisements');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete listing');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await approveAd(id);
      toast.success('Listing approved');
      fetchAd();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt('Rejection reason (optional):');
    try {
      setSubmitting(true);
      await rejectAd(id, { reason });
      toast.success('Listing rejected');
      fetchAd();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger mt-2">{error}</div>
        <Link to="/advertisements" className="btn btn-outline mt-1">← Back to Listings</Link>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="container">
        <div className="alert alert-warning mt-2">Advertisement not found</div>
        <Link to="/advertisements" className="btn btn-outline mt-1">← Back to Listings</Link>
      </div>
    );
  }

  const images = ad.images || [];
  const title = ad.title || `${ad.year || ''} ${ad.make || ''} ${ad.model || ''}`.trim() || 'Untitled Listing';

  return (
    <div className="container">
      {/* Header */}
      <div className="page-header mb-2">
        <Link to="/advertisements" className="text-muted text-sm" style={{ textDecoration: 'none' }}>
          ← Back to Listings
        </Link>
        <div className="flex-between mt-1">
          <div>
            <h1 style={{ margin: 0 }}>{title}</h1>
            {ad.status && (
              <span className={`badge ${statusBadge(ad.status)}`} style={{ marginTop: 8 }}>
                {ad.status}
              </span>
            )}
          </div>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
            {formatPrice(ad.price)}
          </p>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 24 }}>
        {/* Left Column: Images + Details */}
        <div>
          {/* Image Gallery */}
          <div className="card mb-2">
            <div
              style={{
                height: 360,
                background: 'var(--gray-lighter)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius) var(--radius) 0 0',
                overflow: 'hidden',
              }}
            >
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={`${title} - Image ${selectedImage + 1}`}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div className="text-center text-muted">
                  <span style={{ fontSize: 80 }}>🚗</span>
                  <p>No images available</p>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="card-body flex gap-1 flex-wrap" style={{ padding: 8 }}>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    style={{
                      width: 64,
                      height: 48,
                      borderRadius: 'var(--radius-sm)',
                      border: idx === selectedImage ? '2px solid var(--primary)' : '2px solid var(--gray-light)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Details */}
          <div className="card mb-2">
            <div className="card-header"><h3 style={{ margin: 0 }}>Vehicle Details</h3></div>
            <div className="card-body">
              <DetailRow label="Make" value={ad.make} />
              <DetailRow label="Model" value={ad.model} />
              <DetailRow label="Year" value={ad.year} />
              <DetailRow label="Mileage" value={ad.mileage != null ? `${ad.mileage.toLocaleString()} mi` : null} />
              <DetailRow label="VIN" value={ad.vin} />
              <DetailRow label="Transmission" value={ad.transmission} />
              <DetailRow label="Fuel Type" value={ad.fuelType} />
              <DetailRow label="Condition" value={ad.condition} />
              <DetailRow label="Exterior Color" value={ad.exteriorColor || ad.color} />
              <DetailRow label="Interior Color" value={ad.interiorColor} />
              <DetailRow label="Drivetrain" value={ad.drivetrain} />
              <DetailRow label="Body Style" value={ad.bodyStyle} />
            </div>
          </div>

          {/* Engine Specifications */}
          {(ad.engine || ad.engineSize || ad.horsepower || ad.cylinders) && (
            <div className="card mb-2">
              <div className="card-header"><h3 style={{ margin: 0 }}>Engine Specifications</h3></div>
              <div className="card-body">
                <DetailRow label="Engine" value={ad.engine} />
                <DetailRow label="Engine Size" value={ad.engineSize} />
                <DetailRow label="Horsepower" value={ad.horsepower ? `${ad.horsepower} hp` : null} />
                <DetailRow label="Torque" value={ad.torque ? `${ad.torque} lb-ft` : null} />
                <DetailRow label="Cylinders" value={ad.cylinders} />
              </div>
            </div>
          )}

          {/* Ownership History */}
          {ad.ownershipHistory && ad.ownershipHistory.length > 0 && (
            <div className="card mb-2">
              <div className="card-header"><h3 style={{ margin: 0 }}>Ownership History</h3></div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Owner</th>
                        <th>Period</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ad.ownershipHistory.map((entry, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>{entry.owner || entry.name || 'N/A'}</td>
                          <td>{entry.period || `${entry.from || '?'} - ${entry.to || 'Present'}`}</td>
                          <td>{entry.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Seller, Actions, Docs */}
        <div>
          {/* Seller Information */}
          <div className="card mb-2">
            <div className="card-header"><h3 style={{ margin: 0 }}>Seller Information</h3></div>
            <div className="card-body">
              <DetailRow
                label="Seller Type"
                value={ad.sellerType || ad.seller?.type}
              />
              <DetailRow
                label="Seller Name"
                value={ad.sellerName || ad.seller?.name || ad.user?.name}
              />
              <DetailRow
                label="Contact"
                value={ad.contactPhone || ad.seller?.phone || ad.contactEmail || ad.seller?.email}
              />
              <DetailRow
                label="Email"
                value={ad.contactEmail || ad.seller?.email}
              />
            </div>
          </div>

          {/* Location */}
          <div className="card mb-2">
            <div className="card-header"><h3 style={{ margin: 0 }}>Location</h3></div>
            <div className="card-body">
              <DetailRow label="City" value={ad.city || ad.location?.city} />
              <DetailRow label="Region" value={ad.region || ad.location?.region || ad.location?.state} />
              <DetailRow label="Address" value={ad.address || ad.location?.address} />
              <DetailRow label="Zip Code" value={ad.zipCode || ad.location?.zipCode} />
            </div>
          </div>

          {/* Certification Documents */}
          {ad.certificationDocuments && ad.certificationDocuments.length > 0 && (
            <div className="card mb-2">
              <div className="card-header"><h3 style={{ margin: 0 }}>Certification Documents</h3></div>
              <div className="card-body">
                {ad.certificationDocuments.map((doc, idx) => (
                  <div
                    key={idx}
                    className="flex-between"
                    style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-lighter)' }}
                  >
                    <span>📄 {doc.name || doc.title || `Document ${idx + 1}`}</span>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {ad.description && (
            <div className="card mb-2">
              <div className="card-header"><h3 style={{ margin: 0 }}>Description</h3></div>
              <div className="card-body">
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{ad.description}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="card mb-2">
            <div className="card-body">
              <div className="flex gap-1 flex-wrap">
                <Link
                  to={`/orders/new?advertisementId=${ad._id}`}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  🚚 Request Transport
                </Link>
              </div>
              {canEdit && (
                <div className="flex gap-1 flex-wrap mt-1">
                  <Link
                    to={`/advertisements/${ad._id}/edit`}
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                  >
                    ✏️ Edit
                  </Link>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={handleDelete}
                    disabled={submitting}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
              {isAdmin && (ad.status === 'pending' || ad.status === 'submitted') && (
                <div className="flex gap-1 flex-wrap mt-1">
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={handleApprove}
                    disabled={submitting}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={handleReject}
                    disabled={submitting}
                  >
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <ReviewSection targetType="advertisement" targetId={id} />
    </div>
  );
};

export default AdvertisementDetailPage;
