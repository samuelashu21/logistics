const Driver = require('../models/Driver');
const User = require('../models/User');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get all drivers
// @route   GET /api/v1/drivers
exports.getDrivers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const total = await Driver.countDocuments();
  const drivers = await Driver.find()
    .populate('user', 'name email phone')
    .populate('assignedVehicle', 'make model year licensePlate')
    .skip(startIndex)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: drivers.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: drivers,
  });
});

// @desc    Get single driver
// @route   GET /api/v1/drivers/:id
exports.getDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('assignedVehicle', 'make model year licensePlate');

  if (!driver) {
    return res.status(404).json({
      success: false,
      error: 'Driver not found',
    });
  }

  res.status(200).json({
    success: true,
    data: driver,
  });
});

// @desc    Create driver profile
// @route   POST /api/v1/drivers
exports.createDriver = asyncHandler(async (req, res) => {
  const { user: userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a user ID',
    });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  if (user.role !== 'driver') {
    return res.status(400).json({
      success: false,
      error: 'User must have the driver role',
    });
  }

  const existingDriver = await Driver.findOne({ user: userId });

  if (existingDriver) {
    return res.status(400).json({
      success: false,
      error: 'Driver profile already exists for this user',
    });
  }

  const driver = await Driver.create(req.body);

  res.status(201).json({
    success: true,
    data: driver,
  });
});

// @desc    Update driver
// @route   PUT /api/v1/drivers/:id
exports.updateDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!driver) {
    return res.status(404).json({
      success: false,
      error: 'Driver not found',
    });
  }

  res.status(200).json({
    success: true,
    data: driver,
  });
});

// @desc    Delete driver
// @route   DELETE /api/v1/drivers/:id
exports.deleteDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findByIdAndDelete(req.params.id);

  if (!driver) {
    return res.status(404).json({
      success: false,
      error: 'Driver not found',
    });
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get driver profile by user ID
// @route   GET /api/v1/drivers/user/:userId
exports.getDriverByUser = asyncHandler(async (req, res) => {
  const driver = await Driver.findOne({ user: req.params.userId })
    .populate('user', 'name email phone')
    .populate('assignedVehicle', 'make model year licensePlate');

  if (!driver) {
    return res.status(404).json({
      success: false,
      error: 'Driver profile not found for this user',
    });
  }

  res.status(200).json({
    success: true,
    data: driver,
  });
});
