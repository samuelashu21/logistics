const express = require('express');
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  assignDriver,
} = require('../controllers/vehicleController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
 
router
  .route('/')
  .get(protect, getVehicles)
  .post(protect, authorize('admin', 'owner'), createVehicle);

router
  .route('/:id')
  .get(protect, getVehicle)
  .put(protect, authorize('admin', 'owner'), updateVehicle)
  .delete(protect, authorize('admin', 'owner'), deleteVehicle);

router.put('/:id/assign-driver', protect, authorize('admin', 'owner'), assignDriver);

module.exports = router;
