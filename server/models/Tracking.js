const mongoose = require('mongoose');

const TrackingSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Please add a vehicle'],
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please add a driver'],
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      required: [true, 'Please add coordinates'],
    },
  },
  speed: {
    type: Number,
    default: 0,
  },
  heading: {
    type: Number,
    min: 0,
    max: 360,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
});

TrackingSchema.index({ 'location.coordinates': '2dsphere' });
TrackingSchema.index({ vehicle: 1, timestamp: -1 });
TrackingSchema.index({ order: 1, timestamp: -1 });

module.exports = mongoose.model('Tracking', TrackingSchema);
