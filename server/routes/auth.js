const express = require('express');
const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  resetPassword,  
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();
 
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);
router.post('/logout', protect, logout);

module.exports = router; 