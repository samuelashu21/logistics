const express = require('express');
const {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  getDriverByUser,
} = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/auth');
 
const router = express.Router();

// Must be before /:id to avoid matching "user" as an id
router.get('/user/:userId', protect, getDriverByUser);

router
  .route('/')
  .get(protect, authorize('admin', 'owner'), getDrivers)
  .post(protect, authorize('admin', 'owner'), createDriver);

router
  .route('/:id')
  .get(protect, getDriver)
  .put(protect, authorize('admin', 'owner'), updateDriver)
  .delete(protect, authorize('admin', 'owner'), deleteDriver);

module.exports = router;
