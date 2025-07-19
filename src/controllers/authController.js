const { generateToken, hashPassword, comparePassword } = require('../middleware/auth');
const { validateLogin, validateUser } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, AuthenticationError } = require('../middleware/errorHandler');
const ResponseHandler = require('../utils/responseHandler');
const dbManager = require('../utils/database');
const logger = require('../utils/logger');

// Login user
const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Find user by username
    const user = await dbManager.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
        logger.warn('Login attempt with invalid username', { username });
        throw new AuthenticationError(req.t('auth.invalid_credentials'));
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
        logger.warn('Login attempt with invalid password', { username });
        throw new AuthenticationError(req.t('auth.invalid_credentials'));
    }

    // Generate token
    const token = generateToken(user);

    // Log successful login
    logger.info('User logged in successfully', { userId: user.id, username: user.username });

    // Return user data (without password) and token
    const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        department_id: user.department_id
    };

    return ResponseHandler.success(res, {
        user: userData,
        token
    }, req.t('auth.login_success'));
});

// Register new user
const register = asyncHandler(async (req, res) => {
    const { username, password, email, role, department_id } = req.body;

    // Check if username already exists
    const existingUser = await dbManager.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
        throw new AuthenticationError(req.t('auth.username_exists'));
    }

    // Check if email already exists (if provided)
    if (email) {
        const existingEmail = await dbManager.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingEmail) {
            throw new AuthenticationError(req.t('auth.email_exists'));
        }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert new user
    const result = await dbManager.run(
        'INSERT INTO users (username, password_hash, email, role, department_id) VALUES (?, ?, ?, ?, ?)',
        [username, passwordHash, email, role || 'employee', department_id]
    );

    // Get the created user
    const newUser = await dbManager.get('SELECT * FROM users WHERE id = ?', [result.id]);

    // Generate token
    const token = generateToken(newUser);

    // Log user registration
    logger.info('New user registered', { userId: newUser.id, username: newUser.username, role: newUser.role });

    const userData = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        department_id: newUser.department_id
    };

    return ResponseHandler.created(res, {
        user: userData,
        token
    }, req.t('auth.register_success'));
});

// Get current user profile
const getProfile = asyncHandler(async (req, res) => {
    const user = await dbManager.get(
        'SELECT id, username, email, role, department_id, created_at FROM users WHERE id = ?',
        [req.user.id]
    );

    if (!user) {
        throw new NotFoundError('User');
    }

    // Get department name if user has department
    if (user.department_id) {
        const department = await dbManager.get('SELECT name FROM departments WHERE id = ?', [user.department_id]);
        user.department_name = department?.name;
    }

    return ResponseHandler.success(res, user, req.t('auth.profile_fetched'));
});

// Update user profile
const updateProfile = asyncHandler(async (req, res) => {
    const { email, department_id } = req.body;

    // Check if email already exists (if changing email)
    if (email) {
        const existingEmail = await dbManager.get(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, req.user.id]
        );
        if (existingEmail) {
            throw new AuthenticationError(req.t('auth.email_exists'));
        }
    }

    // Update user
    const result = await dbManager.run(
        'UPDATE users SET email = ?, department_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [email, department_id, req.user.id]
    );

    if (result.changes === 0) {
        throw new NotFoundError('User');
    }

    // Get updated user
    const updatedUser = await dbManager.get(
        'SELECT id, username, email, role, department_id, created_at FROM users WHERE id = ?',
        [req.user.id]
    );

    logger.info('User profile updated', { userId: req.user.id });

    return ResponseHandler.success(res, updatedUser, req.t('auth.profile_updated'));
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Get current user with password
    const user = await dbManager.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
        throw new NotFoundError('User');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
        throw new AuthenticationError(req.t('auth.password_incorrect'));
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await dbManager.run(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, req.user.id]
    );

    logger.info('User password changed', { userId: req.user.id });

    return ResponseHandler.success(res, null, req.t('auth.password_changed'));
});

module.exports = {
    login,
    register,
    getProfile,
    updateProfile,
    changePassword
}; 