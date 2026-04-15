const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please add a user reference'],
    unique: true,
  },
  licenseNumber: {
    type: String,
    required: [true, 'Please add a license number'],
    trim: true,
  },
  licenseExpiry: {
    type: Date,
    required: [true, 'Please add a license expiry date'],
  },
  experience: {
    type: Number,
    default: 0,
    min: [0, 'Experience cannot be negative'],
  },
  assignedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  },
  status: {
    type: String,
    enum: ['available', 'on_trip', 'offline'],
    default: 'available',
  },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

DriverSchema.index({ 'currentLocation': '2dsphere' });
DriverSchema.index({ status: 1 });
DriverSchema.index({ user: 1 });

module.exports = mongoose.model('Driver', DriverSchema);
