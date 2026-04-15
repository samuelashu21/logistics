const express = require('express');
const {
  getDashboardStats,
  getVehicleReport,
  getDriverReport,
  getCustomerReport,
  getRevenueReport,
  exportReport,
} = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', protect, authorize('admin'), getDashboardStats);
router.get('/vehicles', protect, authorize('admin', 'owner'), getVehicleReport);
router.get('/drivers', protect, authorize('admin', 'owner'), getDriverReport);
router.get('/customers', protect, authorize('admin'), getCustomerReport);
router.get('/revenue', protect, authorize('admin'), getRevenueReport);
router.get('/export/:type/:format', protect, authorize('admin'), exportReport);

module.exports = router;
