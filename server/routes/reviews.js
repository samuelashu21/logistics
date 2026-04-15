const express = require('express');
const {
  getReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
  getAverageRating,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Must be before /:id to avoid matching "average" as an id
router.get('/average/:targetType/:targetId', protect, getAverageRating);

router
  .route('/')
  .get(protect, getReviews)
  .post(protect, authorize('customer'), createReview);

router
  .route('/:id')
  .get(protect, getReview)
  .put(protect, updateReview)
  .delete(protect, deleteReview);

module.exports = router;
