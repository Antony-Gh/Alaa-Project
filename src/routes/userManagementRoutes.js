const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validateRole } = require('../middleware/validation');

// Middleware to check if user is admin or moderator
const requireAdminOrModerator = (req, res, next) => {
  if (
    req.user.role !== 'manager' &&
    req.user.role !== 'admin' &&
    req.user.role !== 'moderator'
  ) {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions. Admin or moderator access required.',
    });
  }
  next();
};

// Middleware to check if user is admin only
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'manager' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions. Admin access required.',
    });
  }
  next();
};

// Middleware to check if user is manager only
const requireManager = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions. Admin access required.',
    });
  }
  next();
};

// Get all users (admin can see all, moderator can see employees only)
router.get(
  '/',
  authenticateToken,
  requireAdminOrModerator,
  generalLimiter,
  userController.getAllUsers
);

// Get user by ID
router.get(
  '/:id',
  authenticateToken,
  requireAdminOrModerator,
  generalLimiter,
  userController.getUserById
);

// Create new user (admin can create moderators and employees, moderator can create employees only)
router.post(
  '/',
  authenticateToken,
  requireAdminOrModerator,
  generalLimiter,
  userController.createUser
);

// Update user
router.put(
  '/:id',
  authenticateToken,
  requireAdminOrModerator,
  generalLimiter,
  userController.updateUser
);

// Delete user
router.delete(
  '/:id',
  authenticateToken,
  requireAdminOrModerator,
  generalLimiter,
  userController.deleteUser
);

// Change user password
router.put(
  '/:id/password',
  authenticateToken,
  requireAdminOrModerator,
  generalLimiter,
  userController.changeUserPassword
);

module.exports = router;
