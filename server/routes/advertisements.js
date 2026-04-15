const express = require('express');
const {
  getAdvertisements,
  getAdvertisement,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  approveAdvertisement,
  rejectAdvertisement,
  getMyAdvertisements,
} = require('../controllers/advertisementController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Must be before /:id to avoid matching "my" as an id
router.get('/my', protect, authorize('owner', 'admin'), getMyAdvertisements);

router
  .route('/')
  .get(getAdvertisements)
  .post(protect, authorize('owner', 'admin'), createAdvertisement);

router
  .route('/:id')
  .get(getAdvertisement)
  .put(protect, authorize('owner', 'admin'), updateAdvertisement)
  .delete(protect, authorize('owner', 'admin'), deleteAdvertisement);

router.put('/:id/approve', protect, authorize('admin'), approveAdvertisement);
router.put('/:id/reject', protect, authorize('admin'), rejectAdvertisement);

module.exports = router;
