const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const logger = require('../utils/logger');
const dbManager = require('../utils/database');

// Generate JWT token
const generateToken = user => {
  // Validate user object
  if (!user || !user.id) {
    logger.error('Invalid user object passed to generateToken', { user });
    throw new Error('Invalid user data for token generation');
  }

  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      department_id: user.department_id,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        errorCode: 'TOKEN_MISSING',
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    // Verify user still exists in database
    const user = await dbManager.get('SELECT * FROM users WHERE id = ?', [
      decoded.id,
    ]);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      department_id: user.department_id,
    };

    logger.info('User authenticated', {
      userId: user.id,
      username: user.username,
    });
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token',
        errorCode: 'INVALID_TOKEN',
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token expired',
        errorCode: 'TOKEN_EXPIRED',
      });
    }

    logger.error('Authentication error:', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      errorCode: 'AUTH_ERROR',
    });
  }
};

// Require admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    logger.warn('Unauthorized admin access attempt', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });

    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      errorCode: 'ADMIN_REQUIRED',
    });
  }
  next();
};

// Require employee role or admin
const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'employee' && req.user.role !== 'admin') {
    logger.warn('Unauthorized employee access attempt', {
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });

    return res.status(403).json({
      success: false,
      message: 'Employee access required',
      errorCode: 'EMPLOYEE_REQUIRED',
    });
  }
  next();
};

// Hash password
const hashPassword = async password => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  generateToken,
  authenticateToken,
  requireAdmin,
  requireEmployee,
  hashPassword,
  comparePassword,
};
