const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please add a user'],
  },
  type: {
    type: String,
    enum: [
      'order_update',
      'driver_assignment',
      'payment_confirmation',
      'admin_action',
      'general',
    ],
    default: 'general',
  },
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Please add a message'],
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
