const Notification = require('../models/Notification');
const socketManager = require('../utils/socketManager');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// @desc    Get notifications for current user
// @route   GET /api/v1/notifications
exports.getNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;

  const filter = { user: req.user.id };
  if (req.query.unread === 'true') {
    filter.isRead = false;
  }

  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .populate('relatedOrder')
    .skip(startIndex)
    .limit(limit)
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: notifications,
  });
});

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found',
    });
  }

  if (notification.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update this notification',
    });
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/mark-all-read
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      error: 'Notification not found',
    });
  }

  if (notification.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this notification',
    });
  }

  await Notification.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get unread notification count
// @route   GET /api/v1/notifications/unread-count
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    user: req.user.id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    data: { count },
  });
});

// @desc    Helper to create a notification and emit via socket.io
exports.createNotification = async (userId, type, title, message, relatedOrder) => {
  const notification = await Notification.create({
    user: userId,
    type,
    title,
    message,
    relatedOrder,
  });

  try {
    socketManager.getIO().to(userId.toString()).emit('notification', notification);
  } catch (err) {
    // Socket.io may not be initialized in tests
    console.error('Socket emit failed:', err.message);
  }

  return notification;
};
