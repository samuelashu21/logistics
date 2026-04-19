const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  approveOrder,
  rejectOrder,
  assignDriver,
  verifyPayment,
  getOrderHistory,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const orderApprovalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many order approval requests, please try again later',
  },
});
const orderAssignmentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many driver assignment requests, please try again later',
  },
});

// Must be before /:id to avoid matching "history" as an id
router.get('/history', protect, getOrderHistory);

router
  .route('/')
  .get(protect, getOrders)
  .post(protect, authorize('customer'), createOrder);
 
router.route('/:id').get(protect, getOrder);

router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/approve', orderApprovalLimiter, protect, authorize('admin'), approveOrder);
router.put('/:id/reject', orderApprovalLimiter, protect, rejectOrder);
router.put(
  '/:id/assign-driver',
  orderAssignmentLimiter,
  protect,
  authorize('admin', 'owner'),
  assignDriver
);
router.put('/:id/verify-payment', orderApprovalLimiter, protect, authorize('admin', 'owner'), verifyPayment);

module.exports = router;
