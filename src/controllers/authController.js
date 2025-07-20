const {
  generateToken,
  hashPassword,
  comparePassword,
} = require('../middleware/auth');
// const { validateLogin, validateUser } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  NotFoundError,
  AuthenticationError,
  ValidationError,
} = require('../middleware/errorHandler');
const ResponseHandler = require('../utils/responseHandler');
const dbManager = require('../utils/database');
const logger = require('../utils/logger');

// Validation helper functions
const validateEmail = email => {
  if (!email || email.trim() === '') {
    throw new ValidationError('Email is required', 'auth.email_required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'auth.invalid_email');
  }
};

const validateUsername = username => {
  if (!username || username.trim() === '') {
    throw new ValidationError('Username is required', 'auth.username_required');
  }

  if (username.length < 6) {
    throw new ValidationError(
      'Username must be at least 6 characters',
      'auth.username_too_short'
    );
  }

  // Check if username contains only English letters, numbers, and underscores
  const englishRegex = /^[a-zA-Z0-9_]+$/;
  if (!englishRegex.test(username)) {
    throw new ValidationError(
      'Username must contain only English letters, numbers, and underscores',
      'auth.username_english_only'
    );
  }
};

const validatePassword = password => {
  if (!password || password.trim() === '') {
    throw new ValidationError('Password is required', 'auth.password_required');
  }

  // Password strength requirements
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    throw new ValidationError(
      'Password must be at least 8 characters long',
      'auth.password_too_short'
    );
  }

  if (!hasUpperCase) {
    throw new ValidationError(
      'Password must contain at least one uppercase letter',
      'auth.password_no_uppercase'
    );
  }

  if (!hasLowerCase) {
    throw new ValidationError(
      'Password must contain at least one lowercase letter',
      'auth.password_no_lowercase'
    );
  }

  if (!hasNumbers) {
    throw new ValidationError(
      'Password must contain at least one number',
      'auth.password_no_number'
    );
  }

  if (!hasSpecialChar) {
    throw new ValidationError(
      'Password must contain at least one special character',
      'auth.password_no_special'
    );
  }
};

const validatePasswordConfirmation = (password, password_confirmation) => {
  if (!password_confirmation || password_confirmation.trim() === '') {
    throw new ValidationError(
      'Password confirmation is required',
      'auth.confirm_password_required'
    );
  }

  if (password !== password_confirmation) {
    throw new ValidationError(
      'Passwords do not match',
      'auth.passwords_not_match'
    );
  }
};

const validateFullName = full_name => {
  if (!full_name || full_name.trim() === '') {
    throw new ValidationError(
      'Full name is required',
      'validation.field_required'
    );
  }

  if (full_name.length < 2) {
    throw new ValidationError(
      'Full name must be at least 2 characters long',
      'validation.name_min_length'
    );
  }

  if (full_name.length > 100) {
    throw new ValidationError(
      'Full name cannot exceed 100 characters',
      'validation.name_max_length'
    );
  }

  // Check if full name contains only letters and spaces
  const nameRegex = /^[a-zA-Z\u0600-\u06FF\s]+$/;
  if (!nameRegex.test(full_name)) {
    throw new ValidationError(
      'Full name must contain only letters and spaces',
      'validation.name_pattern'
    );
  }
};

const validatePhone = phone => {
  if (phone && phone.trim() !== '') {
    // Check if phone number is valid (basic validation)
    const phoneRegex = /^[+]?[0-9\s\-()]{8,15}$/;
    if (!phoneRegex.test(phone)) {
      throw new ValidationError(
        'Please enter a valid phone number',
        'validation.phone_format'
      );
    }
  }
};

// Login user
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  validateUsername(username);
  validatePassword(password);

  // Find user by username
  const user = await dbManager.get('SELECT * FROM users WHERE username = ?', [
    username,
  ]);
  if (!user) {
    logger.warn('Login attempt with invalid username', { username });
    const authError = new AuthenticationError(
      'Invalid username or password',
      'auth.invalid_credentials'
    );
    logger.debug('AuthenticationError created with translation key:', {
      message: authError.message,
      translationKey: authError.translationKey,
    });
    throw authError;
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password_hash);
  if (!isPasswordValid) {
    logger.warn('Login attempt with invalid password', { username });
    const authError = new AuthenticationError(
      'Invalid username or password',
      'auth.invalid_credentials'
    );
    logger.debug('AuthenticationError created with translation key:', {
      message: authError.message,
      translationKey: authError.translationKey,
    });
    throw authError;
  }

  // Generate token
  const token = generateToken(user);

  // Log successful login
  logger.info('User logged in successfully', {
    userId: user.id,
    username: user.username,
  });

  // Return user data (without password) and token
  const userData = {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone,
    role: user.role,
    department_id: user.department_id,
  };

  return ResponseHandler.success(
    res,
    {
      user: userData,
      token,
    },
    req.t('auth.login_success')
  );
});

// Register new user
const register = asyncHandler(async (req, res) => {
  const {
    username,
    password,
    password_confirmation,
    email,
    full_name,
    phone,
    department_id,
  } = req.body;

  // Validate input
  validateUsername(username);
  validateEmail(email);
  validateFullName(full_name);
  validatePhone(phone);
  validatePassword(password);
  validatePasswordConfirmation(password, password_confirmation);

  // Check if username already exists
  const existingUser = await dbManager.get(
    'SELECT id FROM users WHERE username = ?',
    [username]
  );
  if (existingUser) {
    throw new AuthenticationError(
      'Username already exists',
      'auth.username_exists'
    );
  }

  // Check if email already exists
  const existingEmail = await dbManager.get(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existingEmail) {
    throw new AuthenticationError('Email already exists', 'auth.email_exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // All new registrations are employees by default
  const role = 'employee';

  // Insert new user
  const result = await dbManager.run(
    'INSERT INTO users (username, password_hash, email, full_name, phone, role, department_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      username,
      passwordHash,
      email,
      full_name || null,
      phone || null,
      role,
      department_id || null,
    ]
  );

  logger.debug('User insert result:', { result, username, email, role });

  // Check if insert was successful
  if (!result || !result.lastID) {
    logger.error('Failed to insert new user', {
      username,
      email,
      role,
      result,
    });
    throw new Error('Failed to create user account');
  }

  // Get the created user
  const newUser = await dbManager.get('SELECT * FROM users WHERE id = ?', [
    result.lastID,
  ]);

  logger.debug('Retrieved new user:', { newUser, userId: result.lastID });

  // Check if user was retrieved successfully
  if (!newUser) {
    logger.error('Failed to retrieve newly created user', {
      userId: result.lastID,
    });
    throw new Error('Failed to retrieve user account');
  }

  // Generate token
  const token = generateToken(newUser);

  // Log user registration
  logger.info('New user registered', {
    userId: newUser.id,
    username: newUser.username,
    role: newUser.role,
  });

  const userData = {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    full_name: newUser.full_name,
    phone: newUser.phone,
    role: newUser.role,
    department_id: newUser.department_id,
  };

  return ResponseHandler.created(
    res,
    {
      user: userData,
      token,
    },
    req.t('auth.register_success')
  );
});

// Get current user profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await dbManager.get(
    'SELECT id, username, email, full_name, phone, role, department_id, created_at FROM users WHERE id = ?',
    [req.user.id]
  );

  if (!user) {
    throw new NotFoundError(req.t('user.notfound'));
  }

  // Get department name if user has department
  if (user.department_id) {
    const department = await dbManager.get(
      'SELECT name FROM departments WHERE id = ?',
      [user.department_id]
    );
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
      throw new AuthenticationError(
        'Email already exists',
        'auth.email_exists'
      );
    }
  }

  // Update user
  const result = await dbManager.run(
    'UPDATE users SET email = ?, department_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [email, department_id, req.user.id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(req.t('user.notfound'));
  }

  // Get updated user
  const updatedUser = await dbManager.get(
    'SELECT id, username, email, role, department_id, created_at FROM users WHERE id = ?',
    [req.user.id]
  );

  logger.info('User profile updated', { userId: req.user.id });

  return ResponseHandler.success(
    res,
    updatedUser,
    req.t('auth.profile_updated')
  );
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get current user with password hash
  const user = await dbManager.get(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!user) {
    throw new NotFoundError(req.t('user.notfound'));
  }

  // Verify current password
  const isCurrentPasswordValid = await comparePassword(
    currentPassword,
    user.password_hash
  );
  if (!isCurrentPasswordValid) {
    throw new AuthenticationError(
      'Incorrect password',
      'auth.password_incorrect'
    );
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  const result = await dbManager.run(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newPasswordHash, req.user.id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(req.t('user.notfound'));
  }

  logger.info('User password changed', { userId: req.user.id });

  return ResponseHandler.success(res, null, req.t('auth.password_changed'));
});

module.exports = {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
};
