const User = require('../models/User');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get all users
// @route   GET /api/v1/users
exports.getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const filter = {};
  if (req.query.role) {
    filter.role = req.query.role;
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter).skip(startIndex).limit(limit);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: users,
  });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Create user (admin)
// @route   POST /api/v1/users
exports.createUser = asyncHandler(async (req, res) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user,
  });
});

// @desc    Update user (not password)
// @route   PUT /api/v1/users/:id
exports.updateUser = asyncHandler(async (req, res) => {
  const fields = { ...req.body };
  delete fields.password;

  const user = await User.findByIdAndUpdate(req.params.id, fields, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return res.status(404).json({
      success: false, 
      error: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Suspend user (set isActive to false)
// @route   PUT /api/v1/users/:id/suspend
exports.suspendUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Activate user (set isActive to true)
// @route   PUT /api/v1/users/:id/activate
exports.activateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
    });
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});
