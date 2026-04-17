// controllers/vehicleController.js
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get all vehicles
exports.getVehicles = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const filter = {};
  
  if (req.query.make) filter.make = new RegExp(req.query.make, 'i');
  if (req.query.status) filter.status = req.query.status;

  const total = await Vehicle.countDocuments(filter);
  const vehicles = await Vehicle.find(filter)
    .populate('owner', 'name email')
    .populate('assignedDriver', 'name email')
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({ success: true, total, data: vehicles });
});

// @desc    Get single vehicle (WAS MISSING)
exports.getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('assignedDriver', 'name email');

  if (!vehicle) {
    return res.status(404).json({ success: false, error: 'Vehicle not found' });
  }

  res.status(200).json({ success: true, data: vehicle });
});

// @desc    Create vehicle
exports.createVehicle = asyncHandler(async (req, res) => {
  req.body.owner = req.user.id;
  const vehicle = await Vehicle.create(req.body);
  res.status(201).json({ success: true, data: vehicle });
});

// @desc    Update vehicle
exports.updateVehicle = asyncHandler(async (req, res) => {
  let vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, error: 'Not found' });

  if (vehicle.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: vehicle });
});

// @desc    Delete vehicle
exports.deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, error: 'Not found' });

  if (vehicle.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Not authorized' });
  }

  await vehicle.deleteOne();
  res.status(200).json({ success: true, data: {} });
});

// @desc    Assign driver to vehicle (WAS MISSING)
exports.assignDriver = asyncHandler(async (req, res) => {
  const { driverId } = req.body;

  if (!driverId) {
    return res.status(400).json({ success: false, error: 'Please provide a driverId' });
  }

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ success: false, error: 'Vehicle not found' });

  // Update Driver link
  const driver = await Driver.findOne({ user: driverId });
  if (driver) {
    driver.assignedVehicle = vehicle._id;
    await driver.save();
  }

  // Update Vehicle link
  vehicle.assignedDriver = driverId;
  await vehicle.save();

  const updatedVehicle = await Vehicle.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('assignedDriver', 'name email');

  res.status(200).json({ success: true, data: updatedVehicle });
});