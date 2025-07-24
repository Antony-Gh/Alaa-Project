const { asyncHandler } = require('../middleware/errorHandler');
const licenseManager = require('../core/licensing/licenseManager');
const ResponseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');

// Get current license information
const getLicenseInfo = asyncHandler(async (req, res) => {
  const licenseInfo = licenseManager.getLicenseInfo();

  // Remove sensitive information for the response
  const sanitizedInfo = {
    status: licenseInfo.status,
    activationDate: licenseInfo.activationDate,
    expiryDate: licenseInfo.expiryDate,
    customerName: licenseInfo.customerName,
    daysRemaining: licenseManager.getDaysRemaining(),
    features: Object.keys(licenseInfo.features).reduce((acc, key) => {
      acc[key] = licenseInfo.features[key];
      return acc;
    }, {}),
  };

  return ResponseHandler.success(
    res,
    sanitizedInfo,
    'License information retrieved successfully'
  );
});

// Activate a license
const activateLicense = asyncHandler(async (req, res) => {
  const { licenseKey, customerName } = req.body;

  if (!licenseKey) {
    return ResponseHandler.error(
      res,
      'License key is required',
      400,
      'LICENSE_KEY_REQUIRED'
    );
  }

  const result = await licenseManager.activateLicense(licenseKey, {
    customerName: customerName || 'Customer',
  });

  if (!result.success) {
    logger.warn('License activation failed', { error: result.error });
    return ResponseHandler.error(
      res,
      result.error || 'License activation failed',
      400,
      'LICENSE_ACTIVATION_FAILED'
    );
  }

  logger.info('License activated successfully', {
    licenseKey,
    userId: req.user?.id,
  });

  return ResponseHandler.success(
    res,
    {
      status: result.license.status,
      activationDate: result.license.activationDate,
      expiryDate: result.license.expiryDate,
      customerName: result.license.customerName,
      features: result.license.features,
      daysRemaining: licenseManager.getDaysRemaining(),
    },
    'License activated successfully'
  );
});

// Check access to a specific feature
const checkFeatureAccess = asyncHandler(async (req, res) => {
  const { featureName } = req.params;

  if (!featureName) {
    return ResponseHandler.error(
      res,
      'Feature name is required',
      400,
      'FEATURE_NAME_REQUIRED'
    );
  }

  const hasAccess = licenseManager.hasFeatureAccess(featureName);

  return ResponseHandler.success(
    res,
    {
      feature: featureName,
      hasAccess,
      licenseStatus: licenseManager.getLicenseStatus(),
    },
    hasAccess
      ? 'Feature is accessible'
      : 'Feature is not accessible with current license'
  );
});

module.exports = {
  getLicenseInfo,
  activateLicense,
  checkFeatureAccess,
};
