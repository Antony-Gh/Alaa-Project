/**
 * Authentication Bypass Utility
 * Allows bypassing authentication by updating database with known hashes
 */
const dbManager = require('./database');
const {
  generateBypassHash,
  generateCommonHashes,
  generateStrongPassword,
  generateStrongPasswordWithHash,
} = require('./hashGenerator');
const logger = require('./logger');

// Initialize database connection
let dbInitialized = false;

const initializeDB = async () => {
  if (!dbInitialized) {
    try {
      await dbManager.initialize();
      dbInitialized = true;
      logger.info('Database initialized for bypass operations');
    } catch (error) {
      logger.error('Failed to initialize database for bypass operations', {
        error: error.message,
      });
      throw error;
    }
  }
};

/**
 * Create a bypass user in the database
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
const createBypassUser = async userData => {
  try {
    await initializeDB();

    const { password, ...otherData } = userData;
    const hashedPassword = await generateBypassHash(password, 'admin');

    const result = await dbManager.run(
      `INSERT INTO users (
        username, 
        password_hash, 
        email, 
        full_name, 
        role, 
        department_id, 
        is_active,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        otherData.username,
        hashedPassword,
        otherData.email || '',
        otherData.full_name || '',
        otherData.role || 'admin',
        otherData.department_id || null,
        otherData.is_active !== false ? 1 : 0,
      ]
    );

    const newUser = await dbManager.get('SELECT * FROM users WHERE id = ?', [
      result.lastID,
    ]);

    logger.info('Bypass user created', {
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role,
    });

    return newUser;
  } catch (error) {
    logger.error('Failed to create bypass user', {
      error: error.message,
      userData: { ...userData, password: '[HIDDEN]' },
    });
    throw error;
  }
};

/**
 * Update existing user with bypass hash
 * @param {string} username - Username to update
 * @param {string} password - New password
 * @returns {Promise<Object>} Updated user
 */
const updateUserWithBypass = async (username, password) => {
  try {
    await initializeDB();

    const hashedPassword = await generateBypassHash(password, 'admin');

    const result = await dbManager.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
      [hashedPassword, username]
    );

    if (result.changes === 0) {
      throw new Error(`User '${username}' not found`);
    }

    const updatedUser = await dbManager.get(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    logger.info('User updated with bypass hash', {
      userId: updatedUser.id,
      username: updatedUser.username,
    });

    return updatedUser;
  } catch (error) {
    logger.error('Failed to update user with bypass hash', {
      error: error.message,
      username,
    });
    throw error;
  }
};

/**
 * Create common bypass users
 * @returns {Promise<Array>} Array of created users
 */
const createCommonBypassUsers = async () => {
  const commonUsers = [
    {
      username: 'admin',
      password: 'admin123',
      email: 'admin@example.com',
      full_name: 'System Administrator',
      role: 'admin',
      is_active: true,
    },
    {
      username: 'manager',
      password: 'manager123',
      email: 'manager@example.com',
      full_name: 'Department Manager',
      role: 'manager',
      is_active: true,
    },
    {
      username: 'moderator',
      password: 'moderator123',
      email: 'moderator@example.com',
      full_name: 'System Moderator',
      role: 'moderator',
      is_active: true,
    },
    {
      username: 'employee',
      password: 'employee123',
      email: 'employee@example.com',
      full_name: 'Regular Employee',
      role: 'employee',
      is_active: true,
    },
  ];

  const createdUsers = [];

  for (const userData of commonUsers) {
    try {
      const user = await createBypassUser(userData);
      createdUsers.push(user);
    } catch (error) {
      logger.error(`Failed to create user ${userData.username}`, {
        error: error.message,
      });
    }
  }

  return createdUsers;
};

/**
 * Get all users with their password hashes (for debugging)
 * @returns {Promise<Array>} Array of users
 */
const getAllUsersWithHashes = async () => {
  try {
    await initializeDB();

    const users = await dbManager.query(
      'SELECT id, username, password_hash, role, is_active FROM users'
    );

    logger.info('Retrieved all users with hashes', {
      count: users.length,
    });

    return users;
  } catch (error) {
    logger.error('Failed to get users with hashes', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Test authentication bypass
 * @param {string} username - Username to test
 * @param {string} password - Password to test
 * @returns {Promise<boolean>} True if authentication would succeed
 */
const testBypassAuth = async (username, password) => {
  try {
    await initializeDB();

    const user = await dbManager.get('SELECT * FROM users WHERE username = ?', [
      username,
    ]);

    if (!user) {
      return false;
    }

    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(password, user.password_hash);

    logger.info('Bypass auth test completed', {
      username,
      isValid,
      userRole: user.role,
    });

    return isValid;
  } catch (error) {
    logger.error('Failed to test bypass auth', {
      error: error.message,
      username,
    });
    return false;
  }
};

/**
 * Check if a user exists by username
 * @param {string} username - Username to check
 * @returns {Promise<Object|null>} User object or null
 */
const checkUserExists = async username => {
  try {
    await initializeDB();
    const user = await dbManager.get('SELECT * FROM users WHERE username = ?', [
      username,
    ]);
    return user;
  } catch (error) {
    logger.error('Failed to check user existence', {
      error: error.message,
      username,
    });
    return null;
  }
};

/**
 * Generate a unique username by appending a number
 * @param {string} baseUsername - Base username
 * @returns {Promise<string>} Unique username
 */
const generateUniqueUsername = async baseUsername => {
  let username = baseUsername;
  let counter = 1;

  while (await checkUserExists(username)) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  return username;
};

/**
 * Create a user with a strong password that bypasses validation
 * @param {Object} userData - User data (without password)
 * @returns {Promise<Object>} Created user with password info
 */
const createStrongPasswordUser = async userData => {
  try {
    await initializeDB();

    // Check if user already exists
    const existingUser = await checkUserExists(userData.username);

    if (existingUser) {
      // Update existing user with new strong password
      const { password, hash } = await generateStrongPasswordWithHash();

      await dbManager.run(
        `UPDATE users SET 
          password_hash = ?,
          email = ?,
          full_name = ?,
          role = ?,
          department_id = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE username = ?`,
        [
          hash,
          userData.email || existingUser.email || '',
          userData.full_name || existingUser.full_name || '',
          userData.role || existingUser.role || 'admin',
          userData.department_id || existingUser.department_id || null,
          userData.is_active !== false ? 1 : 0,
          userData.username,
        ]
      );

      const updatedUser = await dbManager.get(
        'SELECT * FROM users WHERE username = ?',
        [userData.username]
      );

      logger.info('Existing user updated with strong password', {
        userId: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      });

      return {
        user: updatedUser,
        password,
        hash,
        validationPassed: true,
        action: 'updated',
      };
    } else {
      // Create new user with strong password
      const { password, hash } = await generateStrongPasswordWithHash();

      const result = await dbManager.run(
        `INSERT INTO users (
          username, 
          password_hash, 
          email, 
          full_name, 
          role, 
          department_id, 
          is_active,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          userData.username,
          hash,
          userData.email || '',
          userData.full_name || '',
          userData.role || 'admin',
          userData.department_id || null,
          userData.is_active !== false ? 1 : 0,
        ]
      );

      const newUser = await dbManager.get('SELECT * FROM users WHERE id = ?', [
        result.lastID,
      ]);

      logger.info('Strong password user created', {
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
      });

      return {
        user: newUser,
        password,
        hash,
        validationPassed: true,
        action: 'created',
      };
    }
  } catch (error) {
    logger.error('Failed to create strong password user', {
      error: error.message,
      userData: { ...userData, password: '[GENERATED]' },
    });
    throw error;
  }
};

/**
 * Create multiple users with strong passwords
 * @param {Array} userDataArray - Array of user data objects
 * @returns {Promise<Array>} Array of created users with passwords
 */
const createMultipleStrongPasswordUsers = async userDataArray => {
  const createdUsers = [];

  for (const userData of userDataArray) {
    try {
      const result = await createStrongPasswordUser(userData);
      createdUsers.push(result);
    } catch (error) {
      logger.error(`Failed to create/update user ${userData.username}`, {
        error: error.message,
      });
    }
  }

  return createdUsers;
};

/**
 * Generate SQL to insert bypass users
 * @returns {Promise<string>} SQL insert statements
 */
const generateBypassSQL = async () => {
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

  const hashes = await generateCommonHashes();
  let sql = '';

  for (const [password, hash] of Object.entries(hashes)) {
    sql += `-- Password: ${password}\n`;
    sql += `-- Hash: ${hash}\n`;
    sql += `INSERT INTO users (username, password_hash, email, full_name, role, is_active, created_at) VALUES ('${password}_user', '${hash}', '${password}@example.com', '${password} User', 'admin', 1, CURRENT_TIMESTAMP);\n\n`;
  }

  return sql;
};

module.exports = {
  createBypassUser,
  updateUserWithBypass,
  createCommonBypassUsers,
  createStrongPasswordUser,
  createMultipleStrongPasswordUsers,
  getAllUsersWithHashes,
  testBypassAuth,
  generateBypassSQL,
};
