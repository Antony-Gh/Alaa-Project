const crypto = require('crypto');
const logger = require('../../utils/logger');
const dbManager = require('../../utils/database');
const { eventBus, EVENTS } = require('../events/eventBus');

class LicenseManager {
  constructor() {
    this.isInitialized = false;
    this.licenseInfo = null;
    this.checkInterval = null;
    this.trialExpiryDate = null;
    
    // License status constants
    this.STATUS = {
      ACTIVE: 'active',
      TRIAL: 'trial',
      EXPIRED: 'expired',
      INVALID: 'invalid'
    };
    
    // Feature access flags
    this.features = {
      analytics: false,
      userManagement: false,
      advancedReporting: false,
      notifications: false,
      apiAccess: false,
      fullAccess: false
    };
    
    // Register for app startup event
    eventBus.on(EVENTS.APP_STARTED, () => this.initialize());
    eventBus.on(EVENTS.APP_SHUTDOWN, () => this.shutdown());
  }
  
  async initialize() {
    try {
      await this.createLicenseTableIfNeeded();
      await this.loadLicense();
      
      // Start periodic license verification
      this.checkInterval = setInterval(() => this.verifyLicense(), 1000 * 60 * 60); // Check every hour
      
      this.isInitialized = true;
      logger.info('License manager initialized');
    } catch (error) {
      logger.error('Failed to initialize license manager:', error);
      
      // Set up trial mode by default if initialization fails
      this.setupTrialMode();
    }
  }
  
  async createLicenseTableIfNeeded() {
    try {
      await dbManager.run(`
        CREATE TABLE IF NOT EXISTS license (
          id INTEGER PRIMARY KEY,
          license_key TEXT NOT NULL,
          activation_date TEXT NOT NULL,
          expiry_date TEXT,
          customer_id TEXT,
          customer_name TEXT,
          features TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      logger.error('Failed to create license table:', error);
      throw error;
    }
  }
  
  async loadLicense() {
    try {
      // Get license from database
      const license = await dbManager.get('SELECT * FROM license ORDER BY id DESC LIMIT 1');
      
      if (license) {
        this.licenseInfo = {
          key: license.license_key,
          activationDate: new Date(license.activation_date),
          expiryDate: license.expiry_date ? new Date(license.expiry_date) : null,
          customerId: license.customer_id,
          customerName: license.customer_name,
          features: JSON.parse(license.features),
          status: license.status
        };
        
        // Update feature access based on license
        this.updateFeatureAccess();
        
        logger.info('License loaded successfully', { status: this.licenseInfo.status });
        return this.licenseInfo;
      } else {
        // No license found, set up trial mode
        this.setupTrialMode();
        return this.licenseInfo;
      }
    } catch (error) {
      logger.error('Failed to load license:', error);
      this.setupTrialMode();
      throw error;
    }
  }
  
  setupTrialMode() {
    // Set up trial license that expires in 14 days
    const now = new Date();
    const expiryDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    
    this.licenseInfo = {
      key: 'TRIAL-' + this.generateTrialKey(),
      activationDate: now,
      expiryDate: expiryDate,
      customerId: 'trial',
      customerName: 'Trial User',
      features: {
        analytics: true,
        userManagement: true,
        advancedReporting: false,
        notifications: true,
        apiAccess: true,
        fullAccess: false
      },
      status: this.STATUS.TRIAL
    };
    
    // Update feature access based on trial license
    this.updateFeatureAccess();
    this.trialExpiryDate = expiryDate;
    
    logger.info('Trial mode activated', { expiryDate });
    
    // Save the trial license to database
    this.saveLicense(this.licenseInfo).catch(error => {
      logger.error('Failed to save trial license:', error);
    });
  }
  
  generateTrialKey() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  async saveLicense(licenseData) {
    try {
      const featuresJson = JSON.stringify(licenseData.features);
      
      await dbManager.run(
        'INSERT INTO license (license_key, activation_date, expiry_date, customer_id, customer_name, features, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          licenseData.key,
          licenseData.activationDate.toISOString(),
          licenseData.expiryDate ? licenseData.expiryDate.toISOString() : null,
          licenseData.customerId,
          licenseData.customerName,
          featuresJson,
          licenseData.status
        ]
      );
      
      logger.info('License saved to database');
    } catch (error) {
      logger.error('Failed to save license:', error);
      throw error;
    }
  }
  
  async activateLicense(licenseKey, customerInfo = {}) {
    try {
      // In a real system, this would make an API call to a license server
      // Here we're just simulating a license activation
      
      // Validate license key format
      if (!this.isValidLicenseKeyFormat(licenseKey)) {
        throw new Error('Invalid license key format');
      }
      
      const now = new Date();
      const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      // Create a new license
      const newLicense = {
        key: licenseKey,
        activationDate: now,
        expiryDate: oneYearLater,
        customerId: customerInfo.customerId || 'customer-' + Date.now(),
        customerName: customerInfo.customerName || 'Licensed Customer',
        features: {
          analytics: true,
          userManagement: true,
          advancedReporting: true,
          notifications: true,
          apiAccess: true,
          fullAccess: true
        },
        status: this.STATUS.ACTIVE
      };
      
      // Save the license
      await this.saveLicense(newLicense);
      
      // Update current license
      this.licenseInfo = newLicense;
      this.updateFeatureAccess();
      
      logger.info('License activated successfully', { licenseKey, status: newLicense.status });
      return { success: true, license: newLicense };
    } catch (error) {
      logger.error('Failed to activate license:', error);
      return { success: false, error: error.message };
    }
  }
  
  isValidLicenseKeyFormat(key) {
    // Simple validation for demo purposes
    // A real system would use a more complex validation mechanism
    return typeof key === 'string' && key.length >= 24;
  }
  
  async verifyLicense() {
    try {
      if (!this.licenseInfo) {
        await this.loadLicense();
      }
      
      // Check if license has expired
      if (this.licenseInfo.expiryDate && new Date() > this.licenseInfo.expiryDate) {
        this.licenseInfo.status = this.STATUS.EXPIRED;
        this.updateFeatureAccess();
        
        // Update status in database
        await dbManager.run(
          'UPDATE license SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE license_key = ?',
          [this.STATUS.EXPIRED, this.licenseInfo.key]
        );
        
        logger.warn('License has expired', { licenseKey: this.licenseInfo.key });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('License verification failed:', error);
      return false;
    }
  }
  
  updateFeatureAccess() {
    if (!this.licenseInfo) {
      // If no license, disable all features
      Object.keys(this.features).forEach(feature => {
        this.features[feature] = false;
      });
      return;
    }
    
    // If license exists, enable features based on license
    if (this.licenseInfo.status === this.STATUS.ACTIVE) {
      Object.keys(this.licenseInfo.features).forEach(feature => {
        this.features[feature] = this.licenseInfo.features[feature];
      });
    } else if (this.licenseInfo.status === this.STATUS.TRIAL) {
      // Trial features
      this.features.analytics = true;
      this.features.userManagement = true;
      this.features.advancedReporting = false;
      this.features.notifications = true;
      this.features.apiAccess = true;
      this.features.fullAccess = false;
    } else {
      // Expired or invalid license
      Object.keys(this.features).forEach(feature => {
        this.features[feature] = false;
      });
      
      // Enable minimal features even with expired license
      this.features.analytics = false;
      this.features.userManagement = true; // Allow basic user management
    }
  }
  
  hasFeatureAccess(featureName) {
    return this.features[featureName] === true;
  }
  
  getLicenseStatus() {
    if (!this.licenseInfo) {
      return this.STATUS.INVALID;
    }
    return this.licenseInfo.status;
  }
  
  getLicenseInfo() {
    if (!this.licenseInfo) {
      return null;
    }
    
    return {
      status: this.licenseInfo.status,
      activationDate: this.licenseInfo.activationDate,
      expiryDate: this.licenseInfo.expiryDate,
      customerName: this.licenseInfo.customerName,
      features: { ...this.licenseInfo.features },
      daysRemaining: this.getDaysRemaining()
    };
  }
  
  getDaysRemaining() {
    if (!this.licenseInfo || !this.licenseInfo.expiryDate) {
      return 0;
    }
    
    const now = new Date();
    const expiryDate = new Date(this.licenseInfo.expiryDate);
    const diffTime = expiryDate - now;
    
    // Convert difference to days
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  shutdown() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    logger.info('License manager shutdown');
  }
}

// Export singleton instance
const licenseManager = new LicenseManager();
module.exports = licenseManager; 