const mongoose = require('mongoose');

const AdvertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters'],
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please add an owner'],
  },
  make: {
    type: String,
    required: [true, 'Please add a make'],
    trim: true,
  },
  model: {
    type: String,
    required: [true, 'Please add a model'],
    trim: true,
  },
  year: {
    type: Number,
    required: [true, 'Please add a year'],
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
  },
  mileage: {
    type: Number,
  },
  vin: {
    type: String,
    trim: true,
    uppercase: true,
  },
  transmission: {
    type: String,
    enum: ['automatic', 'manual'],
  },
  condition: {
    type: String,
    enum: ['new', 'used', 'certified'],
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'electric', 'hybrid'],
  },
  engineSpecs: {
    type: String,
  },
  ownershipHistory: {
    type: String,
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
  sellerType: {
    type: String,
    enum: ['dealer', 'private'],
  },
  sellerContact: {
    name: { type: String },
    email: { type: String },
    phone: { type: String },
  },
  certificationDocs: {
    type: [String],
    default: [],
  },
  isApproved: {
    type: Boolean,
    default: false,
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

AdvertisementSchema.index({ owner: 1 });
AdvertisementSchema.index({ make: 1, model: 1 });
AdvertisementSchema.index({ price: 1 });
AdvertisementSchema.index({ isApproved: 1, isActive: 1 });
AdvertisementSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('Advertisement', AdvertisementSchema);
