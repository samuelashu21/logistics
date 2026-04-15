const express = require('express');
const {
  updateLocation,
  getVehicleLocation,
  getTrackingHistory,
  getActiveVehicles,
} = require('../controllers/trackingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/update', protect, authorize('driver'), updateLocation);
router.get('/active', protect, authorize('admin', 'owner'), getActiveVehicles);
router.get('/vehicle/:vehicleId', protect, getVehicleLocation);
router.get('/history/:vehicleId', protect, getTrackingHistory);

module.exports = router;
