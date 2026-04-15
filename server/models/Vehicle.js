const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  make: {
    type: String,
    required: [true, 'Please add a vehicle make'],
    trim: true,
  },
  model: {
    type: String,
    required: [true, 'Please add a vehicle model'],
    trim: true,
  },
  year: {
    type: Number,
    required: [true, 'Please add a vehicle year'],
  },
  vin: {
    type: String,
    required: [true, 'Please add a VIN'],
    unique: true,
    uppercase: true,
    trim: true,
  },
  licensePlate: {
    type: String,
    trim: true,
  },
  color: {
    type: String,
    trim: true,
  },
  mileage: {
    type: Number,
    default: 0,
  },
  transmission: {
    type: String,
    enum: ['automatic', 'manual'],
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'electric', 'hybrid'],
  },
  condition: {
    type: String,
    enum: ['new', 'used', 'certified'],
    default: 'used',
  },
  price: {
    type: Number,
  },
  photos: {
    type: [String],
    default: [],
  },
  location: {
    city: { type: String },
    region: { type: String },
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] },
    },
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please add a vehicle owner'],
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance'],
    default: 'available',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

VehicleSchema.index({ vin: 1 });
VehicleSchema.index({ owner: 1 });
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Vehicle', VehicleSchema);
