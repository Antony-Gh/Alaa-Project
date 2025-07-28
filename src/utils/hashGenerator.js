/**
 * Hash Generator Utility
 * Generates bcrypt hashes for password bypass in auth controller
 */
const bcrypt = require('bcryptjs');
const logger = require('./logger');
const config = require('../config/config');

/**
 * Generate a strong password that meets validation requirements
 * @returns {string} Strong password
 */
const generateStrongPassword = () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%*?&+=';

  let password = '';

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly (total length 16)
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 4; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  password = password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');

  return password;
};

/**
 * Generate a bcrypt hash for a password
 * @param {string} password - The plain text password
 * @param {number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<string>} The hashed password
 */
const generateHash = async (password, saltRounds = 12) => {
  try {
    const hash = await bcrypt.hash(
      password,
      config.security.bcryptRounds || saltRounds
    );
    logger.info('Hash generated successfully', {
      passwordLength: password.length,
      saltRounds,
      hashLength: hash.length,
    });
    return hash;
  } catch (error) {
    logger.error('Failed to generate hash', {
      error: error.message,
      passwordLength: password.length,
      saltRounds,
    });
    throw error;
  }
};

/**
 * Generate hash for common passwords
 * @param {string} password - The plain text password
 * @returns {Promise<string>} The hashed password
 */
const generateCommonHash = async password => {
  return generateHash(password, 10); // Lower rounds for faster generation
};

/**
 * Generate hash for admin bypass
 * @param {string} password - The plain text password
 * @returns {Promise<string>} The hashed password
 */
const generateAdminHash = async password => {
  return generateHash(password, 8); // Even lower rounds for admin bypass
};

/**
 * Verify a password against a hash
 * @param {string} password - The plain text password
 * @param {string} hash - The bcrypt hash
 * @returns {Promise<boolean>} True if password matches hash
 */
const verifyHash = async (password, hash) => {
  try {
    const isValid = await bcrypt.compare(password, hash);
    logger.info('Hash verification completed', {
      isValid,
      passwordLength: password.length,
      hashLength: hash.length,
    });
    return isValid;
  } catch (error) {
    logger.error('Failed to verify hash', {
      error: error.message,
      passwordLength: password.length,
      hashLength: hash.length,
    });
    return false;
  }
};

/**
 * Generate hashes for common passwords
 * @returns {Promise<Object>} Object with common password hashes
 */
const generateCommonHashes = async () => {
  const commonPasswords = [
    'admin123',
    'password123',
    '123456',
    'admin',
    'password',
    'test123',
    'user123',
    'demo123',
  ];

  const hashes = {};

  for (const password of commonPasswords) {
    hashes[password] = await generateCommonHash(password);
  }

  logger.info('Generated common password hashes', {
    count: Object.keys(hashes).length,
  });

  return hashes;
};

/**
 * Generate hashes for strong passwords that bypass validation
 * @returns {Promise<Object>} Object with strong password hashes
 */
const generateStrongPasswordHashes = async () => {
  const strongPasswords = [];

  // Generate 10 strong passwords
  for (let i = 0; i < 10; i++) {
    strongPasswords.push(generateStrongPassword());
  }

  const hashes = {};

  for (const password of strongPasswords) {
    hashes[password] = await generateHash(password, 10);
  }

  logger.info('Generated strong password hashes', {
    count: Object.keys(hashes).length,
  });

  return hashes;
};

/**
 * Generate a single strong password with hash
 * @returns {Promise<Object>} Object with password and hash
 */
const generateStrongPasswordWithHash = async () => {
  const password = generateStrongPassword();
  const hash = await generateHash(password, 10);

  return {
    password,
    hash,
    validationPassed: true,
  };
};

/**
 * Generate a hash for bypass authentication
 * @param {string} password - The password to hash
 * @param {string} type - Type of hash ('common', 'admin', 'normal')
 * @returns {Promise<string>} The hashed password
 */
const generateBypassHash = async (password, type = 'normal') => {
  switch (type) {
    case 'common':
      return generateCommonHash(password);
    case 'admin':
      return generateAdminHash(password);
    default:
      return generateHash(password);
  }
};

/**
 * Create a user with bypass hash
 * @param {Object} userData - User data object
 * @returns {Promise<Object>} User data with hashed password
 */
const createBypassUser = async userData => {
  const { password, ...otherData } = userData;
  const hashedPassword = await generateBypassHash(password, 'admin');

  return {
    ...otherData,
    password_hash: hashedPassword,
  };
};

module.exports = {
  generateHash,
  generateCommonHash,
  generateAdminHash,
  verifyHash,
  generateCommonHashes,
  generateStrongPassword,
  generateStrongPasswordHashes,
  generateStrongPasswordWithHash,
  generateBypassHash,
  createBypassUser,
};
