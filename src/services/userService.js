/**
 * User Service
 *
 * Provides user management functionality with caching and repository pattern
 */
const bcrypt = require('bcryptjs');
const UserRepository = require('../core/repositories/userRepository');
const cacheService = require('./cacheService');
const config = require('../config/config');
const logger = require('../utils/logger');
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  DatabaseError,
} = require('../utils/errorHandler');

/**
 * User service class
 */
class UserService {
  constructor() {
    this.repository = new UserRepository();
    this.cacheTTL = 3600; // Cache for 1 hour by default
    this.cachePrefix = 'user:';
  }

  /**
   * Get user by ID with caching
   *
   * @param {number} id - User ID
   * @param {boolean} [withCache=true] - Whether to use cache
   * @returns {Promise<Object>} - User object
   * @throws {NotFoundError} - If user not found
   */
  async getUserById(id, withCache = true) {
    const cacheKey = `${this.cachePrefix}${id}`;

    // Try to get from cache if enabled
    if (withCache) {
      const cachedUser = await cacheService.get(cacheKey);
      if (cachedUser) {
        return cachedUser;
      }
    }

    // Get from database
    const user = await this.repository.findById(id);

    if (!user) {
      throw new NotFoundError('User not found', 'user.not_found');
    }

    // Never return password hash
    if (user.password_hash) {
      delete user.password_hash;
    }

    // Cache the result
    if (withCache) {
      await cacheService.set(cacheKey, user, this.cacheTTL);
    }

    return user;
  }

  /**
   * Get user by username with caching
   *
   * @param {string} username - Username
   * @param {boolean} [withCache=true] - Whether to use cache
   * @param {boolean} [includePassword=false] - Whether to include password hash
   * @returns {Promise<Object>} - User object
   * @throws {NotFoundError} - If user not found
   */
  async getUserByUsername(username, withCache = true, includePassword = false) {
    const cacheKey = `${this.cachePrefix}username:${username}`;

    // Only use cache if we don't need the password
    if (withCache && !includePassword) {
      const cachedUser = await cacheService.get(cacheKey);
      if (cachedUser) {
        return cachedUser;
      }
    }

    // Get from database
    const user = await this.repository.findOne({ username });

    if (!user) {
      throw new NotFoundError('User not found', 'user.not_found');
    }

    // Remove password hash unless explicitly requested
    if (!includePassword && user.password_hash) {
      delete user.password_hash;
    }

    // Cache the result (never cache with password)
    if (withCache && !includePassword) {
      const userToCache = { ...user };
      if (userToCache.password_hash) {
        delete userToCache.password_hash;
      }
      await cacheService.set(cacheKey, userToCache, this.cacheTTL);
    }

    return user;
  }

  /**
   * Get user by email with caching
   *
   * @param {string} email - Email address
   * @param {boolean} [withCache=true] - Whether to use cache
   * @returns {Promise<Object>} - User object
   * @throws {NotFoundError} - If user not found
   */
  async getUserByEmail(email, withCache = true) {
    const cacheKey = `${this.cachePrefix}email:${email}`;

    // Try to get from cache
    if (withCache) {
      const cachedUser = await cacheService.get(cacheKey);
      if (cachedUser) {
        return cachedUser;
      }
    }

    // Get from database
    const user = await this.repository.findOne({ email });

    if (!user) {
      throw new NotFoundError('User not found', 'user.not_found');
    }

    // Never return password hash
    if (user.password_hash) {
      delete user.password_hash;
    }

    // Cache the result
    if (withCache) {
      await cacheService.set(cacheKey, user, this.cacheTTL);
    }

    return user;
  }

  /**
   * Get all users with pagination and optional filtering
   *
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Results per page
   * @param {string} [options.role] - Filter by role
   * @param {number} [options.department_id] - Filter by department ID
   * @param {boolean} [options.is_active] - Filter by active status
   * @param {string} [options.search] - Search term for username, email or full_name
   * @returns {Promise<Object>} - Paginated results
   */
  async getUsers({
    page = 1,
    limit = 20,
    role,
    department_id,
    is_active,
    search,
  }) {
    // Prepare search criteria
    const criteria = {};
    if (role) criteria.role = role;
    if (department_id) criteria.department_id = Number(department_id);
    if (is_active !== undefined) criteria.is_active = Boolean(is_active);

    // Calculate pagination
    const offset = (page - 1) * limit;

    let users = [];
    let totalCount = 0;

    try {
      if (search) {
        // Handle search (can't effectively use the repository pattern here)
        // This is a custom query that needs to be executed directly
        const query = `
          SELECT * FROM users 
          WHERE (username LIKE ? OR email LIKE ? OR full_name LIKE ?)
          ${role ? 'AND role = ?' : ''}
          ${department_id ? 'AND department_id = ?' : ''}
          ${is_active !== undefined ? 'AND is_active = ?' : ''}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;

        const params = [`%${search}%`, `%${search}%`, `%${search}%`];

        if (role) params.push(role);
        if (department_id) params.push(Number(department_id));
        if (is_active !== undefined) params.push(is_active ? 1 : 0);

        params.push(limit, offset);

        users = await this.repository.db.query(query, params);

        const countQuery = `
          SELECT COUNT(*) as count FROM users 
          WHERE (username LIKE ? OR email LIKE ? OR full_name LIKE ?)
          ${role ? 'AND role = ?' : ''}
          ${department_id ? 'AND department_id = ?' : ''}
          ${is_active !== undefined ? 'AND is_active = ?' : ''}
        `;

        const countParams = [`%${search}%`, `%${search}%`, `%${search}%`];

        if (role) countParams.push(role);
        if (department_id) countParams.push(Number(department_id));
        if (is_active !== undefined) countParams.push(is_active ? 1 : 0);

        const countResult = await this.repository.db.get(
          countQuery,
          countParams
        );
        totalCount = countResult.count;
      } else {
        // Use repository for simple queries
        users = await this.repository.find(
          criteria,
          [
            'id',
            'username',
            'email',
            'full_name',
            'role',
            'department_id',
            'is_active',
            'created_at',
          ],
          limit,
          offset,
          'created_at',
          'DESC'
        );

        totalCount = await this.repository.count(criteria);
      }

      // Remove password hashes
      users = users.map(user => {
        const { password_hash, ...userData } = user;
        return userData;
      });

      return {
        users,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting users:', { error });
      throw new DatabaseError(
        'Failed to retrieve users',
        'user.retrieve_failed'
      );
    }
  }

  /**
   * Create a new user
   *
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   * @throws {ConflictError} - If username or email already exists
   */
  async createUser(userData) {
    // Check for existing username
    const existingUsername = await this.repository.findOne({
      username: userData.username,
    });
    if (existingUsername) {
      throw new ConflictError(
        'Username already exists',
        'user.username_exists'
      );
    }

    // Check for existing email if provided
    if (userData.email) {
      const existingEmail = await this.repository.findOne({
        email: userData.email,
      });
      if (existingEmail) {
        throw new ConflictError('Email already exists', 'user.email_exists');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(
      userData.password,
      config.security.bcryptRounds
    );

    // Prepare user data
    const newUser = {
      username: userData.username,
      password_hash: passwordHash,
      email: userData.email,
      full_name: userData.full_name,
      phone: userData.phone,
      role: userData.role || 'employee',
      department_id: userData.department_id,
      is_active: userData.is_active !== undefined ? userData.is_active : true,
    };

    // Create user
    const createdUser = await this.repository.create(newUser);
    if (!createdUser) {
      throw new DatabaseError('Failed to create user', 'user.create_failed');
    }

    // Remove password hash from result
    delete createdUser.password_hash;

    logger.info('User created:', {
      userId: createdUser.id,
      username: createdUser.username,
    });

    return createdUser;
  }

  /**
   * Update a user
   *
   * @param {number} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} - Updated user
   * @throws {NotFoundError} - If user not found
   * @throws {ConflictError} - If email already exists
   */
  async updateUser(id, userData) {
    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new NotFoundError('User not found', 'user.not_found');
    }

    // Check for email uniqueness if changing email
    if (userData.email && userData.email !== existingUser.email) {
      const existingEmail = await this.repository.findOne({
        email: userData.email,
      });
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictError('Email already exists', 'user.email_exists');
      }
    }

    // Prepare update data
    const updateData = { ...userData };

    // Handle password update if provided
    if (updateData.password) {
      updateData.password_hash = await bcrypt.hash(
        updateData.password,
        config.security.bcryptRounds
      );
      delete updateData.password;
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.username; // Don't allow username change
    delete updateData.id;

    // Update user
    const updatedUser = await this.repository.update(id, updateData);
    if (!updatedUser) {
      throw new DatabaseError('Failed to update user', 'user.update_failed');
    }

    // Remove password hash from result
    delete updatedUser.password_hash;

    // Clear user cache
    await this._clearUserCache(updatedUser);

    logger.info('User updated:', {
      userId: id,
      username: existingUser.username,
    });

    return updatedUser;
  }

  /**
   * Change user password
   *
   * @param {number} id - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   * @throws {NotFoundError} - If user not found
   * @throws {ValidationError} - If current password is incorrect
   */
  async changePassword(id, currentPassword, newPassword) {
    // Get user with password hash
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found', 'user.not_found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );
    if (!isPasswordValid) {
      throw new ValidationError(
        'Current password is incorrect',
        'user.incorrect_password'
      );
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(
      newPassword,
      config.security.bcryptRounds
    );

    // Update user password
    const updatedUser = await this.repository.update(id, {
      password_hash: newPasswordHash,
    });

    if (!updatedUser) {
      throw new DatabaseError(
        'Failed to update password',
        'user.password_change_failed'
      );
    }

    // Clear user cache
    await this._clearUserCache(user);

    logger.info('User password changed:', {
      userId: id,
      username: user.username,
    });

    return true;
  }

  /**
   * Deactivate a user
   *
   * @param {number} id - User ID
   * @returns {Promise<boolean>} - Success status
   * @throws {NotFoundError} - If user not found
   */
  async deactivateUser(id) {
    // Check if user exists
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found', 'user.not_found');
    }

    // Deactivate user
    const updatedUser = await this.repository.update(id, { is_active: false });
    if (!updatedUser) {
      throw new DatabaseError(
        'Failed to deactivate user',
        'user.deactivate_failed'
      );
    }

    // Clear user cache
    await this._clearUserCache(user);

    logger.info('User deactivated:', { userId: id, username: user.username });

    return true;
  }

  /**
   * Delete a user (soft delete)
   *
   * @param {number} id - User ID
   * @returns {Promise<boolean>} - Success status
   * @throws {NotFoundError} - If user not found
   */
  async deleteUser(id) {
    // Check if user exists
    const user = await this.repository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found', 'user.not_found');
    }

    // Perform soft delete
    const result = await this.repository.softDelete(id);
    if (!result) {
      throw new DatabaseError('Failed to delete user', 'user.delete_failed');
    }

    // Clear user cache
    await this._clearUserCache(user);

    logger.info('User deleted:', { userId: id, username: user.username });

    return true;
  }

  /**
   * Clear user cache
   *
   * @private
   * @param {Object} user - User object
   */
  async _clearUserCache(user) {
    if (!user) return;

    const cacheKeys = [
      `${this.cachePrefix}${user.id}`,
      `${this.cachePrefix}username:${user.username}`,
    ];

    if (user.email) {
      cacheKeys.push(`${this.cachePrefix}email:${user.email}`);
    }

    for (const key of cacheKeys) {
      await cacheService.del(key);
    }
  }
}

module.exports = new UserService();
