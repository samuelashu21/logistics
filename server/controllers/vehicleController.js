const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get all vehicles
// @route   GET /api/v1/vehicles
exports.getVehicles = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const filter = {};
  if (req.query.make) filter.make = req.query.make;
  if (req.query.model) filter.model = req.query.model;
  if (req.query.year) filter.year = req.query.year;
  if (req.query.status) filter.status = req.query.status;

  const total = await Vehicle.countDocuments(filter);
  const vehicles = await Vehicle.find(filter)
    .populate('owner', 'name email')
    .populate('assignedDriver', 'name email')
    .skip(startIndex)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: vehicles.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: vehicles,
  });
});

// @desc    Get single vehicle
// @route   GET /api/v1/vehicles/:id
exports.getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('assignedDriver', 'name email');

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      error: 'Vehicle not found',
    });
  }

  res.status(200).json({
    success: true,
    data: vehicle,
  });
});

// @desc    Create vehicle
// @route   POST /api/v1/vehicles
exports.createVehicle = asyncHandler(async (req, res) => {
  req.body.owner = req.user.id;

  const vehicle = await Vehicle.create(req.body);

  res.status(201).json({
    success: true,
    data: vehicle,
  });
});

// @desc    Update vehicle
// @route   PUT /api/v1/vehicles/:id
exports.updateVehicle = asyncHandler(async (req, res) => {
  let vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      error: 'Vehicle not found',
    });
  }

  if (vehicle.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update this vehicle',
    });
  }

  vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: vehicle,
  });
});

// @desc    Delete vehicle
// @route   DELETE /api/v1/vehicles/:id
exports.deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      error: 'Vehicle not found',
    });
  }

  if (vehicle.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this vehicle',
    });
  }

  await Vehicle.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Assign driver to vehicle
// @route   PUT /api/v1/vehicles/:id/assign-driver
exports.assignDriver = asyncHandler(async (req, res) => {
  const { driverId } = req.body;

  if (!driverId) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a driverId',
    });
  }

  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    return res.status(404).json({
      success: false,
      error: 'Vehicle not found',
    });
  }

  if (vehicle.owner.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to assign a driver to this vehicle',
    });
  }

  const driver = await Driver.findOne({ user: driverId });

  if (!driver) {
    return res.status(404).json({
      success: false,
      error: 'Driver profile not found for the given user',
    });
  }

  vehicle.assignedDriver = driverId;
  await vehicle.save();

  driver.assignedVehicle = vehicle._id;
  await driver.save();

  const updatedVehicle = await Vehicle.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('assignedDriver', 'name email');

  res.status(200).json({
    success: true,
    data: updatedVehicle,
  });
});
