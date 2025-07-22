const licenseManager = require('../core/licensing/licenseManager');
const logger = require('../utils/logger');
const ResponseHandler = require('../utils/responseHandler');

/**
 * Middleware to check if license is valid
 */
const checkLicense = (req, res, next) => {
  const licenseStatus = licenseManager.getLicenseStatus();
  
  if (licenseStatus === licenseManager.STATUS.INVALID) {
    logger.warn('License check failed: Invalid license', { 
      ip: req.ip, 
      path: req.originalUrl 
    });
    return ResponseHandler.error(
      res, 
      'License validation failed. Please contact support.', 
      403, 
      'LICENSE_INVALID'
    );
  }
  
  // Allow TRIAL and ACTIVE licenses to proceed
  // For EXPIRED licenses, restrict to only certain endpoints
  if (licenseStatus === licenseManager.STATUS.EXPIRED) {
    // Allow access to license activation endpoint even with expired license
    if (req.originalUrl.includes('/api/license/activate')) {
      return next();
    }
    
    // Check if the requested path is allowed for expired licenses
    const allowedExpiredPaths = [
      '/api/auth/login',
      '/api/auth/profile',
      '/health',
      '/api/users/basic',
    ];
    
    if (!allowedExpiredPaths.some(path => req.originalUrl.includes(path))) {
      logger.warn('Access denied due to expired license', { 
        ip: req.ip, 
        path: req.originalUrl 
      });
      return ResponseHandler.error(
        res, 
        'Your license has expired. Please renew to continue using all features.', 
        403, 
        'LICENSE_EXPIRED'
      );
    }
  }
  
  // Add license info to request for other middleware/controllers
  req.licenseInfo = licenseManager.getLicenseInfo();
  
  next();
};

/**
 * Middleware to check if user has access to a specific feature
 * @param {string} featureName - Name of the feature to check
 */
const checkFeatureAccess = (featureName) => {
  return (req, res, next) => {
    if (!licenseManager.hasFeatureAccess(featureName)) {
      logger.warn(`Feature access denied: ${featureName}`, { 
        ip: req.ip, 
        path: req.originalUrl,
        userId: req.user?.id
      });
      
      return ResponseHandler.error(
        res, 
        `This feature (${featureName}) is not available with your current license.`, 
        403, 
        'FEATURE_NOT_AVAILABLE'
      );
    }
    
    next();
  };
};

/**
 * Middleware to add license info to all responses
 */
const addLicenseInfoToResponse = (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method
  res.json = function(obj) {
    // Add license info to response if it's a success response
    if (obj && obj.success === true) {
      obj.licenseInfo = {
        status: licenseManager.getLicenseStatus(),
        daysRemaining: licenseManager.getDaysRemaining(),
        isTrial: licenseManager.getLicenseStatus() === licenseManager.STATUS.TRIAL
      };
    }
    
    // Call original json method
    return originalJson.call(this, obj);
  };
  
  next();
};

module.exports = {
  checkLicense,
  checkFeatureAccess,
  addLicenseInfoToResponse
}; 