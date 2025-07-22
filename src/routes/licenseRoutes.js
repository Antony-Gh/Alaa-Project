const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/licenseController');
const authMiddleware = require('../middleware/auth').authenticateToken;
const { checkFeatureAccess } = require('../middleware/licenseCheck');

// Get license info (requires authentication and admin privileges)
router.get('/', authMiddleware, licenseController.getLicenseInfo);

// Activate license
router.post('/activate', authMiddleware, licenseController.activateLicense);

// Check feature access
router.get('/feature/:featureName', authMiddleware, licenseController.checkFeatureAccess);

module.exports = router; 