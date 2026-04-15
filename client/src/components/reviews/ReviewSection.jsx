import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getReviews, createReview, updateReview, deleteReview, getAverageRating } from '../../services/api';
import Pagination from '../common/Pagination';

const StarDisplay = ({ rating, size = 18 }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        style={{
          color: i <= rating ? '#fbbc04' : 'var(--gray-light)',
          fontSize: size,
          cursor: 'default',
        }}
      >
        ★
      </span>
    );
  }
  return <span style={{ display: 'inline-flex', gap: 2 }}>{stars}</span>;
};

const StarSelector = ({ rating, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            color: i <= (hover || rating) ? '#fbbc04' : 'var(--gray-light)',
            fontSize: 28,
            cursor: 'pointer',
            transition: 'color 0.15s',
          }}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          role="button"
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          ★
        </span>
      ))}
    </span>
  );
};

const ReviewSection = ({ targetType, targetId }) => {
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: 5, targetType, targetId, sort: '-createdAt' };
      const res = await getReviews(params);
      const data = res.data;
      setReviews(data.data || data.reviews || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 5) || 1);
      setTotalReviews(data.total || data.count || (data.data || []).length);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [page, targetType, targetId]);

  const fetchAverageRating = useCallback(async () => {
    try {
      const res = await getAverageRating(targetId);
      const data = res.data;
      setAverageRating(data.averageRating || data.average || 0);
    } catch {
      // average rating endpoint may not exist yet
    }
  }, [targetId]);

  useEffect(() => {
    if (targetId) {
      fetchReviews();
      fetchAverageRating();
    }
  }, [fetchReviews, fetchAverageRating, targetId]);

  const resetForm = () => {
    setFormRating(0);
    setFormComment('');
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formRating === 0) {
      setError('Please select a rating');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      if (editingId) {
        await updateReview(editingId, { rating: formRating, comment: formComment });
      } else {
        await createReview({
          targetType,
          targetId,
          rating: formRating,
          comment: formComment,
        });
      }
      resetForm();
      fetchReviews();
      fetchAverageRating();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (review) => {
    setEditingId(review._id);
    setFormRating(review.rating);
    setFormComment(review.comment || '');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await deleteReview(id);
      fetchReviews();
      fetchAverageRating();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isCustomer = user?.role === 'customer';
  const hasOwnReview = reviews.some((r) => r.user?._id === user?._id || r.userId === user?._id);

  return (
    <div className="card mt-2">
      <div className="card-header">
        <div className="flex-between">
          <h3 style={{ margin: 0 }}>
            Reviews
            {totalReviews > 0 && (
              <span className="text-muted text-sm" style={{ marginLeft: 8, fontWeight: 400 }}>
                ({totalReviews})
              </span>
            )}
          </h3>
          {isCustomer && !hasOwnReview && !showForm && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              Write a Review
            </button>
          )}
        </div>
      </div>
      <div className="card-body">
        {/* Average Rating */}
        {totalReviews > 0 && (
          <div
            className="flex gap-2 mb-2"
            style={{ alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--gray-light)' }}
          >
            <span style={{ fontSize: 36, fontWeight: 700, color: 'var(--dark)' }}>
              {averageRating.toFixed(1)}
            </span>
            <div>
              <StarDisplay rating={Math.round(averageRating)} size={22} />
              <div className="text-muted text-sm">
                Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {error && <div className="alert alert-danger mb-2">{error}</div>}

        {/* Write/Edit Review Form */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-2"
            style={{
              padding: 16,
              background: 'var(--gray-lighter)',
              borderRadius: 'var(--radius)',
            }}
          >
            <h4 style={{ margin: '0 0 12px' }}>{editingId ? 'Edit Review' : 'Write a Review'}</h4>
            <div className="form-group mb-1">
              <label className="form-label">Rating</label>
              <div>
                <StarSelector rating={formRating} onChange={setFormRating} />
              </div>
            </div>
            <div className="form-group mb-1">
              <label className="form-label">Comment</label>
              <textarea
                className="form-control"
                rows={3}
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                placeholder="Share your experience..."
              />
            </div>
            <div className="flex gap-1">
              <button className="btn btn-primary btn-sm" type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : editingId ? 'Update' : 'Submit'}
              </button>
              <button className="btn btn-outline btn-sm" type="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        {loading ? (
          <p className="text-muted text-center" style={{ padding: 24 }}>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-muted text-center" style={{ padding: 24 }}>
            No reviews yet. Be the first to leave a review!
          </p>
        ) : (
          <div>
            {reviews.map((review) => (
              <div
                key={review._id}
                style={{
                  padding: '16px 0',
                  borderBottom: '1px solid var(--gray-light)',
                }}
              >
                <div className="flex-between" style={{ marginBottom: 4 }}>
                  <div>
                    <span className="font-bold" style={{ marginRight: 8 }}>
                      {review.user?.name || review.userName || 'Anonymous'}
                    </span>
                    <StarDisplay rating={review.rating} size={14} />
                  </div>
                  <span className="text-muted text-sm">{formatDate(review.createdAt)}</span>
                </div>
                {review.comment && (
                  <p style={{ margin: '8px 0 0', color: 'var(--dark)', lineHeight: 1.5 }}>
                    {review.comment}
                  </p>
                )}
                {(review.user?._id === user?._id || review.userId === user?._id) && (
                  <div className="flex gap-1" style={{ marginTop: 8 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleEdit(review)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(review._id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
};

export default ReviewSection;
