// models/Vehicle.js
const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  make: { type: String, required: [true, 'Make is required'], trim: true },
  model: { type: String, required: [true, 'Model is required'], trim: true },
  year: { type: Number, required: [true, 'Year is required'] },
  vin: { type: String, required: [true, 'VIN is required'], unique: true, uppercase: true },
  licensePlate: { type: String, trim: true },
  color: { type: String },
  capacity: { type: Number }, // Added to match Frontend
  type: { type: String },     // Added to match Frontend
  status: { 
    type: String, 
    enum: ['available', 'active', 'in_use', 'maintenance', 'inactive'], 
    default: 'available' 
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vehicle', VehicleSchema); 