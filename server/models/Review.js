const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please add a reviewer'],
  },
  targetType: {
    type: String,
    enum: ['driver', 'service', 'advertisement'],
    required: [true, 'Please add a target type'],
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Please add a target ID'],
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5'],
    required: [true, 'Please add a rating between 1 and 5'],
  },
  comment: {
    type: String,
    maxlength: [500, 'Comment cannot be more than 500 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate reviews: one review per reviewer per target
ReviewSchema.index({ reviewer: 1, targetType: 1, targetId: 1 }, { unique: true });
ReviewSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Review', ReviewSchema);
