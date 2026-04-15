const Review = require('../models/Review');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get reviews (filter by targetType and targetId)
// @route   GET /api/v1/reviews
exports.getReviews = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const filter = {};
  if (req.query.targetType) filter.targetType = req.query.targetType;
  if (req.query.targetId) filter.targetId = req.query.targetId;

  const total = await Review.countDocuments(filter);
  const reviews = await Review.find(filter)
    .populate('reviewer', 'name email')
    .skip(startIndex)
    .limit(limit)
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: reviews.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: reviews,
  });
});

// @desc    Get single review
// @route   GET /api/v1/reviews/:id
exports.getReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('reviewer', 'name email');

  if (!review) {
    return res.status(404).json({
      success: false,
      error: 'Review not found',
    });
  }

  res.status(200).json({
    success: true,
    data: review,
  });
});

// @desc    Create review
// @route   POST /api/v1/reviews
exports.createReview = asyncHandler(async (req, res) => {
  req.body.reviewer = req.user.id;

  // Prevent duplicate reviews
  const existing = await Review.findOne({
    reviewer: req.user.id,
    targetType: req.body.targetType,
    targetId: req.body.targetId,
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      error: 'You have already reviewed this target',
    });
  }

  const review = await Review.create(req.body);

  res.status(201).json({
    success: true,
    data: review,
  });
});

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
exports.updateReview = asyncHandler(async (req, res) => {
  let review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      error: 'Review not found',
    });
  }

  if (review.reviewer.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update this review',
    });
  }

  review = await Review.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: review,
  });
});

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
exports.deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      success: false,
      error: 'Review not found',
    });
  }

  if (review.reviewer.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this review',
    });
  }

  await Review.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get average rating for a target
// @route   GET /api/v1/reviews/average/:targetType/:targetId
exports.getAverageRating = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;

  const result = await Review.aggregate([
    {
      $match: {
        targetType,
        targetId: require('mongoose').Types.ObjectId.createFromHexString(targetId),
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      averageRating: result.length > 0 ? Math.round(result[0].averageRating * 10) / 10 : 0,
      totalReviews: result.length > 0 ? result[0].totalReviews : 0,
    },
  });
});
