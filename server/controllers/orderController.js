const Order = require('../models/Order');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const ensureOwnerCanManageOrder = async (order, ownerId, action) => {
  if (!order.vehicle) {
    return {
      allowed: false,
      error: `Owners can only ${action} orders linked to their vehicles`,
    };
  }

  const vehicle = await Vehicle.findById(order.vehicle).select('owner');
  if (!vehicle || vehicle.owner?.toString() !== ownerId) {
    return { allowed: false, error: `Not authorized to ${action} this order` };
  }

  return { allowed: true };
};

// @desc    Get all orders (role-based filtering)
// @route   GET /api/v1/orders
exports.getOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const filter = {};

  if (req.user.role === 'customer') {
    filter.customer = req.user.id;
  } else if (req.user.role === 'driver') {
    filter.driver = req.user.id;
  } else if (req.user.role === 'owner') {
    // Owner sees orders for vehicles they own
    const ownedVehicles = await Vehicle.find({ owner: req.user.id }).select('_id');
    const vehicleIds = ownedVehicles.map((v) => v._id);
    filter.vehicle = { $in: vehicleIds };
  }
  // admin sees all — no filter added

  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate('customer', 'name email')
    .populate('vehicle', 'make model year licensePlate')
    .populate('driver', 'name email')
    .skip(startIndex)
    .limit(limit)
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: orders,
  });
});

// @desc    Get single order
// @route   GET /api/v1/orders/:id
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('vehicle', 'make model year licensePlate')
    .populate('driver', 'name email');

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found',
    });
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Create order
// @route   POST /api/v1/orders
exports.createOrder = asyncHandler(async (req, res) => {
  req.body.customer = req.user.id;
  req.body.status = 'requested';

  const order = await Order.create(req.body);

  res.status(201).json({
    success: true,
    data: order,
  });
});

// @desc    Update order status
// @route   PUT /api/v1/orders/:id/status
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a status',
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found',
    });
  }

  // Role-based status transition rules
  if (req.user.role === 'customer') {
    if (status !== 'cancelled' || order.status !== 'requested') {
      return res.status(403).json({
        success: false,
        error: 'Customers can only cancel orders that are in requested status',
      });
    }
  } else if (req.user.role === 'driver') {
    if (!['in_progress', 'completed'].includes(status)) {
      return res.status(403).json({
        success: false,
        error: 'Drivers can only set status to in_progress or completed',
      });
    }
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update order status',
    });
  }

  order.status = status;

  if (status === 'in_progress') {
    order.startTime = Date.now();
  } else if (status === 'completed') {
    order.endTime = Date.now();
  }

  await order.save();

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Approve order
// @route   PUT /api/v1/orders/:id/approve
exports.approveOrder = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to approve orders',
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found',
    });
  }

  if (order.status !== 'paid') {
    return res.status(400).json({
      success: false,
      error: 'Only paid orders can be approved',
    });
  }

  order.status = 'approved';
  await order.save();

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Reject order
// @route   PUT /api/v1/orders/:id/reject
exports.rejectOrder = asyncHandler(async (req, res) => {
  if (!['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to reject orders',
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found',
    });
  }

  if (req.user.role === 'owner') {
    const ownerCheck = await ensureOwnerCanManageOrder(order, req.user.id, 'reject');
    if (!ownerCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: ownerCheck.error,
      });
    }
  }

  order.status = 'rejected';
  await order.save();

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Assign driver to order
// @route   PUT /api/v1/orders/:id/assign-driver
exports.assignDriver = asyncHandler(async (req, res) => {
  const { driverId } = req.body;

  if (!driverId) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a driverId',
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found',
    });
  }

  if (order.status !== 'approved') {
    return res.status(400).json({
      success: false,
      error: 'Drivers can only be assigned to approved orders',
    });
  }

  if (order.driver) {
    return res.status(400).json({
      success: false,
      error: 'A driver is already assigned to this order',
    });
  }

  const driver = await Driver.findOne({ user: driverId });

  if (!driver) {
    return res.status(404).json({
      success: false,
      error: 'Driver profile not found for the given user',
    });
  }

  if (!driver.isActive || driver.status !== 'available') {
    return res.status(400).json({
      success: false,
      error: 'Selected driver is not available',
    });
  }

  order.driver = driverId;
  order.status = 'assigned';
  await order.save();

  driver.status = 'on_trip';
  await driver.save();

  const updatedOrder = await Order.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('vehicle', 'make model year licensePlate')
    .populate('driver', 'name email');

  res.status(200).json({
    success: true,
    data: updatedOrder,
  });
});

// @desc    Verify payment
// @route   PUT /api/v1/orders/:id/verify-payment
exports.verifyPayment = asyncHandler(async (req, res) => {
  const { paymentConfirmation } = req.body;

  if (!paymentConfirmation) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a paymentConfirmation value',
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found',
    });
  }

  order.paymentStatus = 'verified';
  order.paymentConfirmation = paymentConfirmation;
  await order.save();

  res.status(200).json({
    success: true,
    data: order,
  });
});

// @desc    Get order history (completed orders)
// @route   GET /api/v1/orders/history
exports.getOrderHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const filter = { status: 'completed' };

  if (req.user.role === 'customer') {
    filter.customer = req.user.id;
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to view order history',
    });
  }

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) {
      filter.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .populate('customer', 'name email')
    .populate('vehicle', 'make model year licensePlate')
    .populate('driver', 'name email')
    .skip(startIndex)
    .limit(limit)
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: orders,
  });
});
