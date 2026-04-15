const Tracking = require('../models/Tracking');
const socketManager = require('../utils/socketManager');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Update vehicle location
// @route   POST /api/v1/tracking/update
exports.updateLocation = asyncHandler(async (req, res) => {
  const { vehicle, location, speed, heading, order } = req.body;

  if (!vehicle || !location) {
    return res.status(400).json({
      success: false,
      error: 'Please provide vehicle and location',
    });
  }

  const tracking = await Tracking.create({
    vehicle,
    driver: req.user.id,
    location,
    speed,
    heading,
    order,
  });

  try {
    socketManager.getIO().to('tracking').emit('locationUpdated', {
      vehicle,
      driver: req.user.id,
      location,
      speed,
      heading,
      timestamp: tracking.timestamp,
    });
  } catch (err) {
    console.error('Socket emit failed:', err.message);
  }

  res.status(201).json({
    success: true,
    data: tracking,
  });
});

// @desc    Get latest location for a vehicle
// @route   GET /api/v1/tracking/vehicle/:vehicleId
exports.getVehicleLocation = asyncHandler(async (req, res) => {
  const tracking = await Tracking.findOne({ vehicle: req.params.vehicleId })
    .sort('-timestamp')
    .populate('driver', 'name email')
    .populate('vehicle', 'make model year licensePlate');

  if (!tracking) {
    return res.status(404).json({
      success: false,
      error: 'No tracking data found for this vehicle',
    });
  }

  res.status(200).json({
    success: true,
    data: tracking,
  });
});

// @desc    Get tracking history for a vehicle
// @route   GET /api/v1/tracking/history/:vehicleId
exports.getTrackingHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const filter = { vehicle: req.params.vehicleId };

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    filter.timestamp = {};
    if (req.query.startDate) {
      filter.timestamp.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.timestamp.$lte = new Date(req.query.endDate);
    }
  }

  const total = await Tracking.countDocuments(filter);
  const history = await Tracking.find(filter)
    .populate('driver', 'name email')
    .skip(startIndex)
    .limit(limit)
    .sort('-timestamp');

  res.status(200).json({
    success: true,
    count: history.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: history,
  });
});

// @desc    Get all vehicles with recent tracking data (last 30 min)
// @route   GET /api/v1/tracking/active
exports.getActiveVehicles = asyncHandler(async (req, res) => {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);

  const activeVehicles = await Tracking.aggregate([
    { $match: { timestamp: { $gte: thirtyMinAgo } } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$vehicle',
        driver: { $first: '$driver' },
        location: { $first: '$location' },
        speed: { $first: '$speed' },
        heading: { $first: '$heading' },
        timestamp: { $first: '$timestamp' },
      },
    },
  ]);

  // Populate vehicle and driver info
  const populated = await Tracking.populate(activeVehicles, [
    { path: '_id', select: 'make model year licensePlate', model: 'Vehicle' },
    { path: 'driver', select: 'name email', model: 'User' },
  ]);

  res.status(200).json({
    success: true,
    count: populated.length,
    data: populated,
  });
});
