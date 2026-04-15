const express = require('express');
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

// Must be before /:id to avoid matching "history" as an id
router.get('/history', protect, getOrderHistory);

router
  .route('/')
  .get(protect, getOrders)
  .post(protect, authorize('customer'), createOrder);

router.route('/:id').get(protect, getOrder);

router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/approve', protect, authorize('admin'), approveOrder);
router.put('/:id/reject', protect, authorize('admin'), rejectOrder);
router.put('/:id/assign-driver', protect, authorize('admin'), assignDriver);
router.put('/:id/verify-payment', protect, authorize('admin'), verifyPayment);

module.exports = router;
