const express = require('express');
const { getUsers, getUser, createUser, updateUser, deleteUser, suspendUser, activateUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Step 1: Everyone must be logged in 
router.use(protect);

// Step 2: Allow Admins AND Owners to see the list (to create drivers)
router.route('/')
  .get(authorize('admin', 'owner'), getUsers) // Change from admin only to admin + owner
  .post(authorize('admin', 'owner'), createUser);

// Step 3: Specific User routes
router.route('/:id')
  .get(authorize('admin', 'owner'), getUser);

// Step 4: Sensitive actions stay ADMIN ONLY
router.use(authorize('admin')); 

router.route('/:id').put(updateUser).delete(deleteUser);
router.put('/:id/suspend', suspendUser);
router.put('/:id/activate', activateUser);

module.exports = router;