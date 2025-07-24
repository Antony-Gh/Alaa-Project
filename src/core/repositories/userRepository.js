/**
 * User Repository
 *
 * Provides data access methods for the User model
 */
const bcrypt = require('bcryptjs');
const BaseRepository = require('./baseRepository');
const logger = require('../../utils/logger');
const config = require('../../config/config');

/**
 * User repository class
 */
class UserRepository extends BaseRepository {
  /**
   * Create a new UserRepository
   *
   * @param {Object} dbManager - Database manager instance
   */
  constructor(dbManager) {
    super('users', dbManager);
    this.bcryptRounds = config.security.bcryptRounds;
  }

  /**
   * Find user by username
   *
   * @param {string} username - Username to find
   * @returns {Promise<Object|null>} - User object or null
   */
  async findByUsername(username) {
    try {
      return await this.findOne({ username });
    } catch (error) {
      logger.error('Error finding user by username:', {
        username,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find user by email
   *
   * @param {string} email - Email to find
   * @returns {Promise<Object|null>} - User object or null
   */
  async findByEmail(email) {
    try {
      return await this.findOne({ email });
    } catch (error) {
      logger.error('Error finding user by email:', {
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Find user by username or email
   *
   * @param {string} username - Username to find
   * @param {string} email - Email to find
   * @returns {Promise<Object|null>} - User object or null
   */
  async findByUsernameOrEmail(username, email) {
    try {
      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE username = ? OR email = ?
        LIMIT 1
      `;
      return await this.db.get(query, [username, email]);
    } catch (error) {
      logger.error('Error finding user by username or email:', {
        username,
        email,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get users by department ID
   *
   * @param {number} departmentId - Department ID
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} - Array of users
   */
  async findByDepartment(departmentId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'created_at',
        direction = 'DESC',
      } = options;

      return await this.find(
        { department_id: departmentId },
        ['*'],
        limit,
        offset,
        orderBy,
        direction
      );
    } catch (error) {
      logger.error('Error finding users by department:', {
        departmentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search users by name, username, or email
   *
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Object with users array and total count
   */
  async searchUsers(searchTerm, options = {}) {
    try {
      const { limit = 50, offset = 0, role = null } = options;

      const searchPattern = `%${searchTerm}%`;

      // Build the query based on role filter
      let query = `
        SELECT * FROM ${this.tableName}
        WHERE (username LIKE ? OR email LIKE ? OR full_name LIKE ?)
      `;

      const params = [searchPattern, searchPattern, searchPattern];

      if (role) {
        query += ' AND role = ?';
        params.push(role);
      }

      // Add active filter and pagination
      query += ' AND is_active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const users = await this.db.query(query, params);

      // Count total results
      let countQuery = `
        SELECT COUNT(*) as total FROM ${this.tableName}
        WHERE (username LIKE ? OR email LIKE ? OR full_name LIKE ?)
      `;

      const countParams = [searchPattern, searchPattern, searchPattern];

      if (role) {
        countQuery += ' AND role = ?';
        countParams.push(role);
      }

      countQuery += ' AND is_active = 1';

      const countResult = await this.db.get(countQuery, countParams);
      const total = countResult ? countResult.total : 0;

      return {
        users,
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error searching users:', {
        searchTerm,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create a new user
   *
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  async createUser(userData) {
    try {
      const { password, ...otherData } = userData;

      // Hash the password
      const passwordHash = await this.hashPassword(password);

      // Create user with hashed password
      const user = await this.create({
        ...otherData,
        password_hash: passwordHash,
      });

      return user;
    } catch (error) {
      logger.error('Error creating user:', {
        username: userData.username,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update user's last login time
   *
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  async updateLastLogin(userId) {
    try {
      await this.update(userId, {
        last_login: new Date().toISOString(),
        login_attempts: 0,
        locked_until: null,
      });
      return true;
    } catch (error) {
      logger.error('Error updating user last login:', {
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Increment login attempts and lock account if needed
   *
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} - Success status
   */
  async incrementLoginAttempts(userId) {
    try {
      // Get current attempts
      const user = await this.findById(userId);
      if (!user) return false;

      const attempts = (user.login_attempts || 0) + 1;

      // Update attempts
      const updates = { login_attempts: attempts };

      // Lock account if max attempts reached
      if (attempts >= 5) {
        // Lock for 15 minutes
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 15);

        updates.locked_until = lockUntil.toISOString();

        logger.warn('User account locked due to failed login attempts', {
          userId,
          attempts,
          lockedUntil: lockUntil,
        });
      }

      await this.update(userId, updates);
      return true;
    } catch (error) {
      logger.error('Error incrementing login attempts:', {
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Update user password
   *
   * @param {number} userId - User ID
   * @param {string} new_password - New password
   * @returns {Promise<boolean>} - Success status
   */
  async updatePassword(userId, new_password) {
    try {
      // Hash the new password
      const passwordHash = await this.hashPassword(new_password);

      // Update the password hash
      await this.update(userId, {
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      logger.error('Error updating password:', {
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Hash a password
   *
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  /**
   * Verify a password against a hash
   *
   * @param {string} password - Plain text password
   * @param {string} hash - Stored password hash
   * @returns {Promise<boolean>} - Whether password is valid
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Get users by role
   *
   * @param {string} role - User role
   * @param {Object} options - Query options
   * @returns {Promise<Array<Object>>} - Array of users
   */
  async findByRole(role, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'created_at',
        direction = 'DESC',
      } = options;

      return await this.find(
        { role },
        ['*'],
        limit,
        offset,
        orderBy,
        direction
      );
    } catch (error) {
      logger.error('Error finding users by role:', {
        role,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all users with pagination
   *
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Object with users array and pagination info
   */
  async getAllWithPagination(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        orderBy = 'created_at',
        direction = 'DESC',
        role = null,
        departmentId = null,
        isActive = true,
      } = options;

      const offset = (page - 1) * limit;

      // Build criteria object
      const criteria = { is_active: isActive ? 1 : 0 };
      if (role) criteria.role = role;
      if (departmentId) criteria.department_id = departmentId;

      // Get users
      const users = await this.find(
        criteria,
        ['*'],
        limit,
        offset,
        orderBy,
        direction
      );

      // Get total count
      const total = await this.count(criteria);

      return {
        users,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting paginated users:', {
        options,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get active user count
   *
   * @returns {Promise<number>} - Count of active users
   */
  async getActiveUserCount() {
    try {
      return await this.count({ is_active: 1 });
    } catch (error) {
      logger.error('Error counting active users:', { error: error.message });
      throw error;
    }
  }
}

module.exports = UserRepository;
