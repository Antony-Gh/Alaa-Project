const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validate, rules } = require('../middleware/validation');
const { authLimiter } = require('../middleware/security');

// Public routes
router.post('/login', authLimiter, rules.login, validate, authController.login);
router.post(
  '/register',
  authLimiter,
  rules.register,
  validate,
  authController.register
);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put(
  '/profile',
  authenticateToken,
  rules.updateUser,
  validate,
  authController.updateProfile
);
router.put(
  '/change-password',
  authenticateToken,
  authController.changePassword
);

module.exports = router;
