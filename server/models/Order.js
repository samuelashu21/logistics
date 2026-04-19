const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please add a customer'],
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  pickupLocation: {
    address: {
      type: String,
      required: [true, 'Please add a pickup address'],
    },
    coordinates: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
  },
  dropoffLocation: {
    address: {
      type: String,
      required: [true, 'Please add a dropoff address'],
    },
    coordinates: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
  },
  status: {
    type: String,
    enum: [
      'requested',
      'paid',
      'approved',
      'assigned',
      'in_progress',
      'completed',
      'rejected',
      'cancelled',
    ],
    default: 'requested',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending',
  },
  paymentAmount: {
    type: Number,
  },
  paymentConfirmation: {
    type: String,
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

OrderSchema.index({ customer: 1 });
OrderSchema.index({ driver: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'pickupLocation.coordinates': '2dsphere' });
OrderSchema.index({ 'dropoffLocation.coordinates': '2dsphere' });

const normalizeOptionalGeoPoint = (location) => {
  if (!location || !location.coordinates) return;

  const point = location.coordinates;
  const validArray =
    Array.isArray(point.coordinates) &&
    point.coordinates.length === 2 &&
    point.coordinates.every((value) => Number.isFinite(value));

  if (!validArray) {
    location.coordinates = undefined;
    return;
  }

  if (!point.type) {
    point.type = 'Point';
  }
};

OrderSchema.pre('validate', function preValidateOrder() {
  normalizeOptionalGeoPoint(this.pickupLocation);
  normalizeOptionalGeoPoint(this.dropoffLocation);
});

module.exports = mongoose.model('Order', OrderSchema);
