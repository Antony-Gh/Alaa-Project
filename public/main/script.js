// Import utilities
import {
  escapeHtml,
  setTextContent,
  setInnerHTML,
  createElement,
  sanitizeFormData,
  validateDateTime,
  validateEmployeeId,
  validateArabicText,
} from './utils/sanitize.js';

// Fallback for createElement in case import fails
const safeCreateElement =
  createElement ||
  ((tag, attributes = {}) => {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (key === 'className') {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    }
    return element;
  });

// Client-side validation functions
function validateEmail(email) {
  if (!email || email.trim() === '') {
    return { isValid: false, message: t('auth.email_required') };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, message: t('auth.invalid_email') };
  }

  return { isValid: true, message: '' };
}

function validateUsername(username) {
  if (!username || username.trim() === '') {
    return { isValid: false, message: t('auth.username_required') };
  }

  if (username.length < 6) {
    return { isValid: false, message: t('auth.username_too_short') };
  }

  // Check if username contains only English letters, numbers, and underscores
  const englishRegex = /^[a-zA-Z0-9_]+$/;
  if (!englishRegex.test(username)) {
    return { isValid: false, message: t('auth.username_english_only') };
  }

  return { isValid: true, message: '' };
}

function validatePassword(password) {
  if (!password || password.trim() === '') {
    return { isValid: false, message: t('auth.password_required') };
  }

  // Password strength requirements
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { isValid: false, message: t('auth.password_too_short') };
  }

  if (!hasUpperCase) {
    return { isValid: false, message: t('auth.password_no_uppercase') };
  }

  if (!hasLowerCase) {
    return { isValid: false, message: t('auth.password_no_lowercase') };
  }

  if (!hasNumbers) {
    return { isValid: false, message: t('auth.password_no_number') };
  }

  if (!hasSpecialChar) {
    return { isValid: false, message: t('auth.password_no_special') };
  }

  return { isValid: true, message: t('auth.password_valid') };
}

function validatePasswordConfirmation(password, confirmPassword) {
  if (!confirmPassword || confirmPassword.trim() === '') {
    return { isValid: false, message: t('auth.confirm_password_required') };
  }

  if (password !== confirmPassword) {
    return { isValid: false, message: t('auth.passwords_not_match') };
  }

  return { isValid: true, message: '' };
}

function checkPasswordStrength(password) {
  if (!password) return 'empty';

  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  // Check for consecutive numbers or letters
  const hasConsecutive =
    /(.)\1{2,}/.test(password) ||
    /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
      password
    ) ||
    /(123|234|345|456|567|678|789|012)/.test(password);

  if (!hasConsecutive) score += 1;

  // Check for dictionary words (basic check)
  const commonWords = [
    'password',
    '123456',
    'qwerty',
    'admin',
    'user',
    'test',
    'hello',
    'world',
  ];
  const hasDictionaryWord = commonWords.some(word =>
    password.toLowerCase().includes(word)
  );

  if (!hasDictionaryWord) score += 1;

  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
}

function updatePasswordStrengthIndicator(password) {
  const strengthIndicator = document.getElementById('passwordStrength');
  if (!strengthIndicator) return;

  const strength = checkPasswordStrength(password);

  // Create bullet list for password criteria
  const criteria = [
    {
      id: 'length',
      text: t('password.criteria.length'),
      valid: password.length >= 8,
    },
    {
      id: 'length12',
      text: t('password.criteria.length12'),
      valid: password.length >= 12,
    },
    {
      id: 'uppercase',
      text: t('password.criteria.uppercase'),
      valid: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      text: t('password.criteria.lowercase'),
      valid: /[a-z]/.test(password),
    },
    {
      id: 'numbers',
      text: t('password.criteria.numbers'),
      valid: /\d/.test(password),
    },
    {
      id: 'special',
      text: t('password.criteria.special'),
      valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
    {
      id: 'consecutive',
      text: t('password.criteria.consecutive'),
      valid:
        !/(.)\1{2,}/.test(password) &&
        !/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(
          password
        ) &&
        !/(123|234|345|456|567|678|789|012)/.test(password),
    },
    {
      id: 'dictionary',
      text: t('password.criteria.dictionary'),
      valid: ![
        'password',
        '123456',
        'qwerty',
        'admin',
        'user',
        'test',
        'hello',
        'world',
      ].some(word => password.toLowerCase().includes(word)),
    },
  ];

  // Create HTML for bullet list
  const html = `
    <ul>
      ${criteria
        .map(
          criterion => `
        <li class="${criterion.valid ? 'valid' : 'invalid'}" id="${
          criterion.id
        }">
          ${criterion.text}
        </li>
      `
        )
        .join('')}
    </ul>
  `;

  strengthIndicator.innerHTML = html;
  strengthIndicator.className = `password-strength ${strength}`;
}

function updatePasswordMatchIndicator(password, confirmPassword) {
  const matchIndicator = document.getElementById('passwordMatch');
  if (!matchIndicator) return;

  if (!confirmPassword) {
    matchIndicator.textContent = '';
    matchIndicator.className = 'password-match empty';
    return;
  }

  // Create criteria for password matching
  const criteria = [
    {
      id: 'length',
      text: t('password.match.length'),
      valid: confirmPassword.length === password.length,
    },
    {
      id: 'exact',
      text: t('password.match.exact'),
      valid: password === confirmPassword,
    },
    {
      id: 'not_empty',
      text: t('password.match.not_empty'),
      valid: confirmPassword.length > 0,
    },
  ];

  // Create HTML for bullet list
  const html = `
    <ul>
      ${criteria
        .map(
          criterion => `
        <li class="${criterion.valid ? 'valid' : 'invalid'}" id="${
          criterion.id
        }">
          ${criterion.text}
        </li>
      `
        )
        .join('')}
    </ul>
  `;

  matchIndicator.innerHTML = html;

  if (password === confirmPassword && confirmPassword.length > 0) {
    matchIndicator.className = 'password-match match';
  } else {
    matchIndicator.className = 'password-match no-match';
  }
}

function generateStrongPassword() {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

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
}

function setupPasswordGenerator() {
  const generatorBtn = document.getElementById('passwordGeneratorBtn');
  if (!generatorBtn) return;

  generatorBtn.addEventListener('click', function () {
    const passwordInput = document.getElementById('registerPassword');
    const passwordConfirmationInput = document.getElementById(
      'registerConfirmPassword'
    );
    if (!passwordInput) return;
    if (!passwordConfirmationInput) return;

    const newPassword = generateStrongPassword();
    passwordInput.value = newPassword;
    passwordConfirmationInput.value = newPassword;

    // Trigger input event to update strength indicator
    passwordInput.dispatchEvent(new Event('input'));
    passwordConfirmationInput.dispatchEvent(new Event('input'));

    // Show success message
    showMessage(t('password.generated'), 'success');
  });
}

function setupPasswordToggles() {
  // Get all password toggle buttons
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');

  toggleButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      const input = button.parentElement.querySelector(
        'input[type="password"], input[type="text"]'
      );
      const icon = button.querySelector('i');

      if (!input) return;

      if (input.type === 'password') {
        // Show password
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
        button.title = 'Hide password';
      } else {
        // Hide password
        input.type = 'password';
        icon.className = 'fas fa-eye';
        button.title = 'Show password';
      }
    });
  });
}

function setupFormValidation() {
  // Username validation
  const usernameInputs = document.querySelectorAll(
    '#loginUsername, #registerUsername'
  );
  usernameInputs.forEach(input => {
    input.addEventListener('input', function () {
      const validation = validateUsername(this.value);
      if (validation.isValid) {
        this.classList.remove('error');
        this.classList.add('valid');
      } else {
        this.classList.remove('valid');
        this.classList.add('error');
      }
    });
  });

  // Email validation
  const emailInput = document.getElementById('registerEmail');
  if (emailInput) {
    emailInput.addEventListener('input', function () {
      const validation = validateEmail(this.value);
      if (validation.isValid) {
        this.classList.remove('error');
        this.classList.add('valid');
      } else {
        this.classList.remove('valid');
        this.classList.add('error');
      }
    });
  }

  // Password validation
  const passwordInput = document.getElementById('registerPassword');
  if (passwordInput) {
    passwordInput.addEventListener('input', function () {
      const validation = validatePassword(this.value);
      updatePasswordStrengthIndicator(this.value);

      if (validation.isValid) {
        this.classList.remove('error');
        this.classList.add('valid');
      } else {
        this.classList.remove('valid');
        this.classList.add('error');
      }

      // Update password match indicator if confirm password exists
      const confirmPasswordInput = document.getElementById(
        'registerConfirmPassword'
      );
      if (confirmPasswordInput && confirmPasswordInput.value) {
        updatePasswordMatchIndicator(this.value, confirmPasswordInput.value);
      }
    });
  }

  // Password confirmation validation
  const confirmPasswordInput = document.getElementById(
    'registerConfirmPassword'
  );
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener('input', function () {
      const passwordInput = document.getElementById('registerPassword');
      const validation = validatePasswordConfirmation(
        passwordInput.value,
        this.value
      );
      updatePasswordMatchIndicator(passwordInput.value, this.value);

      if (validation.isValid) {
        this.classList.remove('error');
        this.classList.add('valid');
      } else {
        this.classList.remove('valid');
        this.classList.add('error');
      }
    });
  }
}

// Global variables
let departments = [];
let locations = [];
let appointments = [];
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// DOM elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authTabBtns = document.querySelectorAll('.auth-tab-btn');
const authContents = document.querySelectorAll('.auth-content');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutBtn = document.getElementById('logoutBtn');
const userDisplayName = document.getElementById('userDisplayName');
const userRole = document.getElementById('userRole');
const adminTab = document.getElementById('adminTab');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const appointmentForm = document.getElementById('appointmentForm');
const adminForm = document.getElementById('adminForm');
const statusBtns = document.querySelectorAll('.status-btn');
const appointmentModal = document.getElementById('appointmentModal');
const adminModal = document.getElementById('adminModal');
const modalContent = document.getElementById('modalContent');

// Profile elements
const profileForm = document.getElementById('profileForm');
const changePasswordForm = document.getElementById('changePasswordForm');

// User management elements
const userForm = document.getElementById('userForm');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
  // Scroll to top on page load
  window.scrollTo(0, 0);
  initializeApp();
});

async function initializeApp() {
  try {
    // Create language switcher
    createModernLangSwitcher();

    // Set initial language
    const lang = localStorage.getItem('language') || 'ar';
    setLanguage(lang);

    // Setup event listeners
    setupEventListeners();

    // Setup form validation
    setupFormValidation();

    // Setup password generator
    setupPasswordGenerator();

    // Load departments for registration form (available to all users)
    await loadDepartments();

    // Check authentication status
    await checkAuthStatus();

    console.log(t('system.ready'));
  } catch (error) {
    console.error(t('console.error.app_initialization'), error);
  }
}

function setupEventListeners() {
  // Authentication event listeners
  authTabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.auth));
  });

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  logoutBtn.addEventListener('click', handleLogout);

  // Profile event listeners
  profileForm.addEventListener('submit', handleProfileUpdate);
  changePasswordForm.addEventListener('submit', handlePasswordChange);

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Form submissions
  appointmentForm.addEventListener('submit', handleAppointmentSubmit);
  adminForm.addEventListener('submit', handleAdminFormSubmit);

  // Status filters
  statusBtns.forEach(btn => {
    btn.addEventListener('click', () => filterAppointments(btn.dataset.status));
  });

  // Modal close buttons
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', closeModals);
  });

  // Close modal when clicking outside
  window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) {
      closeModals();
    }
  });

  // Admin form status change
  document
    .getElementById('statusSelect')
    .addEventListener('change', handleStatusChange);

  // Event delegation for appointment card buttons
  document.addEventListener('click', e => {
    // Admin modal button
    if (e.target.closest('.admin-modal-btn')) {
      const appointmentId =
        e.target.closest('.admin-modal-btn').dataset.appointmentId;
      openAdminModal(appointmentId);
    }

    // View details button
    if (e.target.closest('.view-details-btn')) {
      const appointmentId =
        e.target.closest('.view-details-btn').dataset.appointmentId;
      viewAppointmentDetails(appointmentId);
    }
  });

  // Setup password toggle functionality
  setupPasswordToggles();

  // Setup user management functionality
  setupUserManagement();
}

// Authentication functions
async function checkAuthStatus() {
  try {
    if (authToken) {
      const response = await fetch('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        currentUser = data.data;
        showAppSection();
        await loadInitialData();
      } else {
        localStorage.removeItem('authToken');
        authToken = null;
        showAuthSection();
      }
    }
  } catch (error) {
    console.error(t('console.error.auth_status_check'), error);
    localStorage.removeItem('authToken');
    authToken = null;
    showAuthSection();
  }
}

async function handleLogin(e) {
  e.preventDefault();

  clearAllMessages();

  const loginData = sanitizeFormData(new FormData(loginForm));

  // Client-side validation
  const usernameValidation = validateUsername(loginData.username);
  const passwordValidation = validatePassword(loginData.password);

  if (!usernameValidation.isValid) {
    showMessage(usernameValidation.message, 'error');
    return;
  }

  if (!passwordValidation.isValid) {
    showMessage(passwordValidation.message, 'error');
    return;
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    const result = await response.json();
    console.log('Login response status:', response.status);
    console.log('Login response:', result);

    if (response.ok) {
      authToken = result.data.token;
      currentUser = result.data.user;
      localStorage.setItem('authToken', authToken);

      showMessage('login_success', 'success');
      showAppSection();
      await loadInitialData();
    } else {
      console.log('Login failed - Status:', response.status);
      console.log('Login failed - Response:', result);

      // Handle error response - the message from backend is a translation key
      if (result.message) {
        // The backend sends translation keys, so we need to translate them
        const translatedMessage = t(result.message);
        showMessage(translatedMessage, 'error');
      } else {
        showMessage('login_failed', 'error');
      }

      // Only show one type of error message, prioritize API errors over general message
      if (
        result.errors &&
        Array.isArray(result.errors) &&
        result.errors.length > 0
      ) {
        console.log('Showing API errors:', result.errors);
        showApiErrors(result.errors);
      }
    }
  } catch (error) {
    console.error('Login fetch error:', error);
    console.error(t('console.error.login'), error);
    showMessage('server_error', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();

  clearAllMessages();

  const registerData = sanitizeFormData(new FormData(registerForm));

  // Convert department_id to integer if provided
  if (registerData.department_id) {
    registerData.department_id = parseInt(registerData.department_id);
  }

  // Client-side validation
  const usernameValidation = validateUsername(registerData.username);
  const emailValidation = validateEmail(registerData.email);
  const passwordValidation = validatePassword(registerData.password);
  const confirmPasswordValidation = validatePasswordConfirmation(
    registerData.password,
    registerData.confirmPassword
  );

  if (!usernameValidation.isValid) {
    showMessage(usernameValidation.message, 'error');
    return;
  }

  if (!emailValidation.isValid) {
    showMessage(emailValidation.message, 'error');
    return;
  }

  if (!passwordValidation.isValid) {
    showMessage(passwordValidation.message, 'error');
    return;
  }

  if (!confirmPasswordValidation.isValid) {
    showMessage(confirmPasswordValidation.message, 'error');
    return;
  }

  console.log('Register data:', registerData);

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registerData),
    });

    const result = await response.json();

    if (response.ok) {
      authToken = result.data.token;
      currentUser = result.data.user;
      localStorage.setItem('authToken', authToken);

      showMessage('register_success', 'success');
      showAppSection();
      await loadInitialData();
    } else {
      console.log(result);

      // Handle error response - the message from backend is a translation key
      if (result.message) {
        // The backend sends translation keys, so we need to translate them
        const translatedMessage = t(result.message);
        showMessage(translatedMessage, 'error');
      } else {
        showMessage('register_failed', 'error');
      }

      // Only show one type of error message, prioritize API errors over general message
      if (
        result.errors &&
        Array.isArray(result.errors) &&
        result.errors.length > 0
      ) {
        showApiErrors(result.errors);
      }
    }
  } catch (error) {
    console.error(t('console.error.register'), error);
    showMessage('server_error', 'error');
  }
}

function handleLogout() {
  clearAllMessages();
  localStorage.removeItem('authToken');
  authToken = null;
  currentUser = null;
  showAuthSection();
  showMessage('logout_success', 'info');
}

function showAuthSection() {
  authSection.style.display = 'block';
  appSection.classList.add('app-section-hidden');
}

function showAppSection() {
  authSection.style.display = 'none';
  appSection.classList.remove('app-section-hidden');

  // Scroll to top when showing app section
  window.scrollTo(0, 0);

  // Update user info
  if (currentUser) {
    setTextContent(userDisplayName, `مرحباً ${currentUser.username}`);
    setTextContent(
      userRole,
      currentUser.role === 'admin'
        ? 'مدير'
        : currentUser.role === 'moderator'
          ? 'مشرف'
          : 'موظف'
    );

    // Show/hide admin tab based on role
    if (currentUser.role === 'admin') {
      adminTab.classList.remove('admin-tab-hidden');
    } else {
      adminTab.classList.add('admin-tab-hidden');
    }

    // Show/hide user management tab based on role
    const userManagementTab = document.getElementById('userManagementTab');
    if (userManagementTab) {
      if (currentUser.role === 'admin' || currentUser.role === 'moderator') {
        userManagementTab.classList.remove('admin-moderator-tab-hidden');
      } else {
        userManagementTab.classList.add('admin-moderator-tab-hidden');
      }
    }
  }
}

function switchAuthTab(tabName) {
  authTabBtns.forEach(btn => btn.classList.remove('active'));
  authContents.forEach(content => content.classList.remove('active'));

  document.querySelector(`[data-auth="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-content`).classList.add('active');
}

// Profile management
async function handleProfileUpdate(e) {
  e.preventDefault();

  const profileData = sanitizeFormData(new FormData(profileForm));
  if (profileData.department_id)
    profileData.department_id = parseInt(profileData.department_id);

  try {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(profileData),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage('profile_update_success', 'success');
      currentUser = { ...currentUser, ...result.data };
    } else {
      showMessage(result.message || 'profile_update_failed', 'error');
    }
  } catch (error) {
    console.error(t('console.error.profile_update'), error);
    showMessage('server_error', 'error');
  }
}

async function handlePasswordChange(e) {
  e.preventDefault();

  const passwordData = sanitizeFormData(new FormData(changePasswordForm));
  const confirmPassword = passwordData.confirmPassword;

  if (passwordData.newPassword !== confirmPassword) {
    showMessage('password_mismatch', 'error');
    return;
  }

  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(passwordData),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage('password_change_success', 'success');
      changePasswordForm.reset();
    } else {
      showMessage(result.message || 'password_change_failed', 'error');
    }
  } catch (error) {
    console.error(t('console.error.password_change'), error);
    showMessage('server_error', 'error');
  }
}

// Data loading functions
async function loadInitialData() {
  try {
    // Load locations (departments already loaded during initialization)
    await loadLocations();

    // Load appointments
    await loadAppointments();

    // Load dashboard stats
    await loadDashboardStats();

    // Load user profile data
    await loadUserProfile();
  } catch (error) {
    console.error(t('console.error.data_loading'), error);
    showMessage('data_loading_error', 'error');
  }
}

async function loadUserProfile() {
  try {
    if (authToken) {
      const response = await fetch('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const user = result.data;

        // Populate profile form
        setTextContent(
          document.getElementById('profileUsername'),
          user.username
        );
        setTextContent(
          document.getElementById('profileEmail'),
          user.email || ''
        );

        // Set department if available
        if (user.department_id) {
          document.getElementById('profileDepartment').value =
            user.department_id;
        }
      }
    }
  } catch (error) {
    console.error(t('console.error.user_profile'), error);
  }
}

async function loadDepartments() {
  try {
    const response = await fetch('/api/appointments/departments');
    const result = await response.json();

    if (response.ok) {
      departments = result.data || result;
      populateDepartmentSelect();
    }
  } catch (error) {
    console.error(t('console.error.departments'), error);
  }
}

async function loadLocations() {
  try {
    const response = await fetch('/api/appointments/locations');
    const result = await response.json();

    if (response.ok) {
      locations = result.data || result;
      populateLocationSelect();
    }
  } catch (error) {
    console.error(t('console.error.locations'), error);
  }
}

async function loadAppointments() {
  try {
    const response = await fetch('/api/appointments', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const result = await response.json();

    if (response.ok) {
      appointments = result.data || result;
      displayMyAppointments();
    }
  } catch (error) {
    console.error(t('console.error.appointments'), error);
  }
}

async function loadAdminAppointments() {
  try {
    const response = await fetch('/api/appointments', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const result = await response.json();

    if (response.ok) {
      appointments = result.data || result;
      displayAdminAppointments();
    }
  } catch (error) {
    console.error(t('console.error.admin_appointments'), error);
  }
}

async function loadDashboardStats() {
  try {
    const response = await fetch('/api/appointments/stats', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const result = await response.json();

    if (response.ok) {
      const stats = result.data || result;
      updateDashboardStats(stats.stats || stats);
      displayRecentAppointments(stats.recentAppointments || []);
    }
  } catch (error) {
    console.error(t('console.error.dashboard_stats'), error);
  }
}

// Populate form selects
function populateDepartmentSelect() {
  const select = document.getElementById('department');
  const profileSelect = document.getElementById('profileDepartment');
  const registerSelect = document.getElementById('registerDepartment');

  const options = departments
    .map(dept => `<option value="${dept.id}">${escapeHtml(dept.name)}</option>`)
    .join('');

  select.innerHTML = `<option value="">${escapeHtml(t('select_department'))}</option>${options}`;
  profileSelect.innerHTML = `<option value="">${escapeHtml(t('select_department'))}</option>${options}`;
  if (registerSelect) {
    registerSelect.innerHTML = `<option value="">${escapeHtml(t('select_department'))}</option>${options}`;
  }
}

function populateLocationSelect() {
  const select = document.getElementById('location');

  const options = locations
    .map(
      loc =>
        `<option value="${loc.id}">${escapeHtml(loc.name)} (${
          loc.capacity
        } شخص)</option>`
    )
    .join('');

  select.innerHTML = `<option value="">${escapeHtml(t('select_location'))}</option>${options}`;
}

// Form handling with validation
async function handleAppointmentSubmit(e) {
  e.preventDefault();

  const appointmentData = sanitizeFormData(new FormData(appointmentForm));
  appointmentData.department_id = parseInt(appointmentData.department_id);
  appointmentData.location_id = parseInt(appointmentData.location_id);

  // Validate input
  const validation = validateAppointmentData(appointmentData);
  if (!validation.valid) {
    showMessage(validation.message, 'error');
    return;
  }

  try {
    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(appointmentData),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage('appointment_submit_success', 'success');
      appointmentForm.reset();
      await loadAppointments();
    } else {
      showMessage(result.message || 'appointment_submit_failed', 'error');
    }
  } catch (error) {
    console.error(t('console.error.appointment_submit'), error);
    showMessage('server_error', 'error');
  }
}

function validateAppointmentData(data) {
  // Validate employee name (Arabic text)
  const nameValidation = validateArabicText(data.employee_name, 2, 100);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  // Validate employee ID
  const idValidation = validateEmployeeId(data.employee_id);
  if (!idValidation.valid) {
    return idValidation;
  }

  // Validate title
  if (!data.title || data.title.length < 5) {
    return {
      valid: false,
      message: 'title_validation_length',
    };
  }

  // Validate date and time
  const dateTimeValidation = validateDateTime(
    data.requested_date,
    data.requested_time
  );
  if (!dateTimeValidation.valid) {
    return dateTimeValidation;
  }

  return { valid: true };
}

async function handleAdminFormSubmit(e) {
  e.preventDefault();

  const updateData = sanitizeFormData(new FormData(adminForm));
  const appointmentId = updateData.appointmentId;
  const status = updateData.status;
  const adminNotes = updateData.admin_notes;

  const updateDataToSend = {
    status,
    admin_notes: adminNotes,
  };

  // Add specific fields based on status
  if (status === 'approved') {
    updateDataToSend.approved_date = updateData.approved_date;
    updateDataToSend.approved_time = updateData.approved_time;
  } else if (status === 'rejected') {
    updateDataToSend.rejection_reason = updateData.rejection_reason;
  }

  try {
    const response = await fetch(`/api/appointments/${appointmentId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updateDataToSend),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage('admin_form_update_success', 'success');
      closeModals();
      await loadAdminAppointments();
      await loadDashboardStats();
    } else {
      showMessage(result.message || 'admin_form_update_failed', 'error');
    }
  } catch (error) {
    console.error(t('console.error.status_update'), error);
    showMessage('server_error', 'error');
  }
}

// Display functions with XSS protection
function displayMyAppointments() {
  const container = document.getElementById('myAppointmentsList');

  if (appointments.length === 0) {
    setInnerHTML(
      container,
      `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${t('no_appointments')}</h3>
                <p>${t('start_booking')}</p>
            </div>
        `
    );
    return;
  }

  const appointmentCards = appointments
    .filter(
      apt =>
        apt.employee_id === currentUser.username || currentUser.role === 'admin'
    )
    .map(appointment => createAppointmentCard(appointment, false))
    .join('');

  setInnerHTML(container, appointmentCards);
}

function displayAdminAppointments() {
  const container = document.getElementById('adminAppointmentsList');

  if (appointments.length === 0) {
    setInnerHTML(
      container,
      `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${t('no_appointments')}</h3>
                <p>${t('no_appointments_created')}</p>
            </div>
        `
    );
    return;
  }

  const appointmentCards = appointments
    .map(appointment => createAppointmentCard(appointment, true))
    .join('');

  setInnerHTML(container, appointmentCards);
}

function displayRecentAppointments(recentAppointments = []) {
  const container = document.getElementById('recentAppointmentsList');

  if (recentAppointments.length === 0) {
    setInnerHTML(
      container,
      `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${t('no_recent_appointments')}</h3>
            </div>
        `
    );
    return;
  }

  const appointmentCards = recentAppointments
    .map(appointment => createAppointmentCard(appointment, false))
    .join('');

  setInnerHTML(container, appointmentCards);
}

function createAppointmentCard(appointment, isAdmin = false) {
  const department = departments.find(d => d.id === appointment.department_id);
  const location = locations.find(l => l.id === appointment.location_id);

  const statusText = getStatusText(appointment.status);
  const statusClass = `status-${appointment.status}`;

  const card = `
        <div class="appointment-card" data-id="${appointment.id}">
            <div class="appointment-header">
                <div>
                    <div class="appointment-title">${escapeHtml(
                      appointment.title
                    )}</div>
                    <span class="appointment-status ${statusClass}">${escapeHtml(
                      statusText
                    )}</span>
                </div>
                ${
                  isAdmin
                    ? `
                    <button class="btn btn-primary admin-modal-btn" data-appointment-id="${
                      appointment.id
                    }">
                        <i class="fas fa-edit"></i> ${t('update_status')}
                    </button>
                `
                    : ''
                }
            </div>
            
            <div class="appointment-details">
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span class="detail-label">${t('employee')}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.employee_name
                    )}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-building"></i>
                    <span class="detail-label">${t('department')}:</span>
                    <span class="detail-value">${escapeHtml(
                      department ? department.name : t('not_specified')
                    )}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="detail-label">${t('location')}:</span>
                    <span class="detail-value">${escapeHtml(
                      location ? location.name : t('not_specified')
                    )}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span class="detail-label">${t('requested_date')}:</span>
                    <span class="detail-value">${formatDate(
                      appointment.requested_date
                    )}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span class="detail-label">${t('requested_time')}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.requested_time
                    )}</span>
                </div>
                ${
                  appointment.approved_date
                    ? `
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        <span class="detail-label">${t('approved_date')}:</span>
                        <span class="detail-value">${formatDate(
                          appointment.approved_date
                        )}</span>
                    </div>
                `
                    : ''
                }
                ${
                  appointment.approved_time
                    ? `
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        <span class="detail-label">${t('approved_time')}:</span>
                        <span class="detail-value">${escapeHtml(
                          appointment.approved_time
                        )}</span>
                    </div>
                `
                    : ''
                }
            </div>
            
            ${
              appointment.description
                ? `
                <div class="detail-item">
                    <i class="fas fa-info-circle"></i>
                    <span class="detail-label">${t('description')}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.description
                    )}</span>
                </div>
            `
                : ''
            }
            
            ${
              appointment.rejection_reason
                ? `
                <div class="detail-item">
                    <i class="fas fa-times-circle"></i>
                    <span class="detail-label">${t('rejection_reason')}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.rejection_reason
                    )}</span>
                </div>
            `
                : ''
            }
            
            ${
              appointment.admin_notes
                ? `
                <div class="detail-item">
                    <i class="fas fa-sticky-note"></i>
                    <span class="detail-label">${t('admin_notes')}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.admin_notes
                    )}</span>
                </div>
            `
                : ''
            }
            
            <div class="appointment-actions">
                <button class="btn btn-primary view-details-btn" data-appointment-id="${
                  appointment.id
                }">
                    <i class="fas fa-eye"></i> ${t('view_details')}
                </button>
            </div>
        </div>
    `;

  return card;
}

// Tab switching functionality
function switchTab(tabName) {
  // Remove active class from all tabs and contents
  tabBtns.forEach(btn => btn.classList.remove('active'));
  tabContents.forEach(content => content.classList.remove('active'));

  // Add active class to selected tab and content
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');

  // Scroll to top when switching tabs
  window.scrollTo(0, 0);

  // Load specific data based on tab
  if (tabName === 'admin') {
    loadAdminAppointments();
  } else if (tabName === 'dashboard') {
    loadDashboardStats();
  }
}

// Filter appointments by status
function filterAppointments(status) {
  // Update active button
  statusBtns.forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  const container = document.getElementById('adminAppointmentsList');

  if (status === 'all') {
    displayAdminAppointments();
    return;
  }

  const filteredAppointments = appointments.filter(
    apt => apt.status === status
  );

  if (filteredAppointments.length === 0) {
    setInnerHTML(
      container,
      `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h3>${t('no_appointments_with_status')}</h3>
                <p>${t('no_appointments_with_status_message', {
                  status: t(getStatusText(status)),
                })}</p>
            </div>
        `
    );
    return;
  }

  const appointmentCards = filteredAppointments
    .map(appointment => createAppointmentCard(appointment, true))
    .join('');

  setInnerHTML(container, appointmentCards);
}

// Modal functions
function openAdminModal(appointmentId) {
  const appointment = appointments.find(apt => apt.id === appointmentId);
  if (!appointment) return;

  document.getElementById('appointmentId').value = appointmentId;
  document.getElementById('statusSelect').value = appointment.status;
  document.getElementById('adminNotes').value = appointment.admin_notes || '';
  document.getElementById('rejectionReason').value =
    appointment.rejection_reason || '';

  handleStatusChange(); // Show/hide relevant fields
  adminModal.style.display = 'block';
}

function viewAppointmentDetails(appointmentId) {
  const appointment = appointments.find(apt => apt.id === appointmentId);
  if (!appointment) return;

  const department = departments.find(d => d.id === appointment.department_id);
  const location = locations.find(l => l.id === appointment.location_id);

  const modalHtml = `
        <h2>${t('appointment_details')}</h2>
        <div class="appointment-details">
            <div class="detail-item">
                <i class="fas fa-user"></i>
                <span class="detail-label">${t('employee')}:</span>
                <span class="detail-value">${escapeHtml(
                  appointment.employee_name
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-id-card"></i>
                <span class="detail-label">${t('employee_id')}:</span>
                <span class="detail-value">${escapeHtml(
                  appointment.employee_id
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-building"></i>
                <span class="detail-label">${t('department')}:</span>
                <span class="detail-value">${escapeHtml(
                  department ? department.name : t('not_specified')
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <span class="detail-label">${t('location')}:</span>
                <span class="detail-value">${escapeHtml(
                  location ? location.name : t('not_specified')
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-calendar"></i>
                <span class="detail-label">${t('requested_date')}:</span>
                <span class="detail-value">${formatDate(
                  appointment.requested_date
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-clock"></i>
                <span class="detail-label">${t('requested_time')}:</span>
                <span class="detail-value">${escapeHtml(
                  appointment.requested_time
                )}</span>
            </div>
            ${
              appointment.description
                ? `
                <div class="detail-item">
                    <i class="fas fa-info-circle"></i>
                    <span class="detail-label">${t('description')}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.description
                    )}</span>
                </div>
            `
                : ''
            }
            <div class="detail-item">
                <i class="fas fa-calendar-check"></i>
                <span class="detail-label">${t('created_at')}:</span>
                <span class="detail-value">${formatDateTime(
                  appointment.created_at
                )}</span>
            </div>
        </div>
    `;

  setInnerHTML(modalContent, modalHtml);
  appointmentModal.style.display = 'block';
}

function closeModals() {
  appointmentModal.style.display = 'none';
  adminModal.style.display = 'none';
}

// Admin form status change handler
function handleStatusChange() {
  const status = document.getElementById('statusSelect').value;
  const approvedDateGroup = document.getElementById('approvedDateGroup');
  const approvedTimeGroup = document.getElementById('approvedTimeGroup');
  const rejectionReasonGroup = document.getElementById('rejectionReasonGroup');

  // Hide all conditional fields
  approvedDateGroup.classList.add('hidden');
  approvedTimeGroup.classList.add('hidden');
  rejectionReasonGroup.classList.add('hidden');

  // Show relevant fields based on status
  if (status === 'approved') {
    approvedDateGroup.classList.remove('hidden');
    approvedTimeGroup.classList.remove('hidden');
  } else if (status === 'rejected') {
    rejectionReasonGroup.classList.remove('hidden');
  }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
  const pendingCount = stats.find(s => s.status === 'pending')?.count || 0;
  const approvedCount = stats.find(s => s.status === 'approved')?.count || 0;
  const rejectedCount = stats.find(s => s.status === 'rejected')?.count || 0;
  const doneCount = stats.find(s => s.status === 'done')?.count || 0;

  setTextContent(document.getElementById('pendingCount'), pendingCount);
  setTextContent(document.getElementById('approvedCount'), approvedCount);
  setTextContent(document.getElementById('rejectedCount'), rejectedCount);
  setTextContent(document.getElementById('doneCount'), doneCount);
}

// Utility functions
function getStatusText(status) {
  const statusMap = {
    pending: 'pending_status',
    approved: 'approved_status',
    rejected: 'rejected_status',
    done: 'done_status',
    missed: 'missed_status',
  };
  return statusMap[status] || status;
}

function formatDate(dateString) {
  if (!dateString) return t('not_specified');
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA');
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return t('not_specified');
  const date = new Date(dateTimeString);
  return date.toLocaleString('ar-SA');
}

// Language switcher and translation system
const translations = { en: {}, ar: {} };

async function loadTranslations(lang) {
  try {
    const response = await fetch(`${lang}.json`);
    const data = await response.json();
    translations[lang] = data;
  } catch (error) {
    console.error(t('console.error.translation_loading'), error);
  }
}

function updateAllTranslatableElements() {
  const lang = localStorage.getItem('language') || 'ar';

  // Update all translatable text elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang] && translations[lang][key]) {
      el.placeholder = translations[lang][key];
    }
  });

  // Update button titles
  document.querySelectorAll('button[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.title = translations[lang][key];
    }
  });

  // Update user profile language if logged in
  if (currentUser && authToken) {
    fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ language: lang }),
    }).catch(error => {
      console.error(t('console.error.language_preference'), error);
    });
  }
}

// Utility function to clear all messages
function clearAllMessages() {
  const messageContainer = document.getElementById('messageContainer');
  if (messageContainer) {
    const allMessages = messageContainer.querySelectorAll('.message');
    allMessages.forEach(msg => msg.remove());
  }
}

// Utility function to clear specific message types
function clearMessagesByType(type) {
  const messageContainer = document.getElementById('messageContainer');
  if (messageContainer) {
    const messages = messageContainer.querySelectorAll(`.message.${type}`);
    messages.forEach(msg => msg.remove());
  }
}

// Refactor showMessage to use translation keys and support error-list inside error message
function showMessage(message, type = 'info') {
  const messageContainer = document.getElementById('messageContainer');
  if (!messageContainer) return;

  // If showing a success message, clear any existing error messages
  if (type === 'success') {
    clearMessagesByType('error');
  }

  // Remove existing messages of the same type
  const existingMessages = messageContainer.querySelectorAll(
    `.message.${type}[data-type="user-message"]`
  );
  existingMessages.forEach(msg => msg.remove());

  // Translate message if it's a key
  const lang = localStorage.getItem('language') || 'ar';
  const msgText =
    translations[lang] && translations[lang][message]
      ? translations[lang][message]
      : message;

  // Create new message
  const messageDiv = safeCreateElement('div', {
    className: `message ${type}`,
    'data-type': 'user-message',
  });

  // Add close button and message title
  messageDiv.innerHTML = `
        <button class="close-btn">&times;</button>
        <div class="message-title">${escapeHtml(msgText)}</div>
    `;

  // Add event listener to close button
  const closeBtn = messageDiv.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      messageDiv.remove();
    });
  }

  // Insert at the top of the container
  messageContainer.appendChild(messageDiv);

  // Auto remove after 5 seconds for non-error messages, 8 seconds for error messages
  const autoRemoveTime = type === 'error' ? 8000 : 5000;
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, autoRemoveTime);
}

// Refactor showApiErrors to use translation keys and work alongside showMessage
function showApiErrors(errors) {
  const messageContainer = document.getElementById('messageContainer');
  if (!messageContainer) {
    console.warn('Message container not found');
    return;
  }

  // Ensure errors is valid
  if (!errors) {
    console.warn('No errors provided to showApiErrors');
    return;
  }

  // Remove only existing API error messages, not all messages
  const existingApiMessages = messageContainer.querySelectorAll(
    '.message.error[data-type="api-error"]'
  );
  existingApiMessages.forEach(msg => msg.remove());

  // Create error message
  const messageDiv = safeCreateElement('div', {
    className: 'message error',
    'data-type': 'api-error',
  });

  let errorContent = '<button class="close-btn">&times;</button>';
  errorContent += '<div class="message-content">';

  try {
    if (Array.isArray(errors)) {
      errorContent += '<ul style="margin: 0; padding-right: 1rem;">';
      errors.forEach(err => {
        if (err && err.message) {
          // Map Arabic validation messages to translation keys
          const mappedMessage = mapValidationMessage(err.message);
          const displayMessage = t(mappedMessage);
          errorContent += `<li>${escapeHtml(displayMessage)}</li>`;

          // Optionally highlight the field
          if (err.field) {
            const field = document.querySelector(`[name="${err.field}"]`);
            if (field) {
              field.style.borderColor = 'red';
            }
          }
        }
      });
      errorContent += '</ul>';
    } else if (typeof errors === 'object') {
      errorContent += '<ul style="margin: 0; padding-right: 1rem;">';
      Object.entries(errors).forEach(([field, fieldErrors]) => {
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach(error => {
            if (error) {
              const mappedMessage = mapValidationMessage(error);
              const displayMessage = t(mappedMessage);
              errorContent += `<li>${escapeHtml(displayMessage)}</li>`;
            }
          });
        } else if (fieldErrors) {
          const mappedMessage = mapValidationMessage(fieldErrors);
          const displayMessage = t(mappedMessage);
          errorContent += `<li>${escapeHtml(displayMessage)}</li>`;
        }
      });
      errorContent += '</ul>';
    } else if (typeof errors === 'string') {
      const mappedMessage = mapValidationMessage(errors);
      const displayMessage = t(mappedMessage);
      errorContent += escapeHtml(displayMessage);
    } else {
      errorContent += escapeHtml(t('error.validation'));
    }
  } catch (error) {
    console.error('Error processing API errors:', error);
    errorContent += escapeHtml(t('error.validation'));
  }

  errorContent += '</div>';
  messageDiv.innerHTML = errorContent;

  // Add event listener to close button
  const closeBtn = messageDiv.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      messageDiv.remove();
    });
  }

  messageContainer.appendChild(messageDiv);

  // Auto-remove after 8 seconds for error messages
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, 8000);
}

// Modern language switcher with flags and better UX
function createModernLangSwitcher() {
  const languageSwitcher = document.getElementById('languageSwitcher');
  if (!languageSwitcher) return;

  const currentLang = localStorage.getItem('language') || 'ar';

  const langSwitcherHTML = `
        <button class="lang-btn ${
          currentLang === 'ar' ? 'active' : ''
        }" data-lang="ar" title="العربية">
            <img src="./icons/egypt.svg" alt="العربية">
            العربية
        </button>
        <button class="lang-btn ${
          currentLang === 'en' ? 'active' : ''
        }" data-lang="en" title="English">
            <img src="./icons/usa.svg" alt="English">
            English
        </button>
    `;

  languageSwitcher.innerHTML = langSwitcherHTML;

  // Add event listeners
  languageSwitcher.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      setLanguage(lang, true); // Show notification when user changes language
    });
  });
}

function updateLangSwitcherActive() {
  const currentLang = localStorage.getItem('language') || 'ar';
  const languageSwitcher = document.getElementById('languageSwitcher');
  if (!languageSwitcher) return;

  languageSwitcher.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

function setLanguage(lang, showNotification = false) {
  // Store language preference
  localStorage.setItem('language', lang);

  // Add transition class for smooth direction change
  document.body.classList.add('language-transitioning');

  // Update HTML lang and dir attributes
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Update body direction for proper RTL/LTR support
  document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.body.lang = lang;

  // Load translations
  loadTranslations(lang);

  // Update language switcher active state
  updateLangSwitcherActive();

  // Update all translatable elements
  updateAllTranslatableElements();

  // Remove transition class after animation completes
  setTimeout(() => {
    document.body.classList.remove('language-transitioning');
  }, 300);

  // Only show notification if explicitly requested (user action)
  if (showNotification) {
    const langName = lang === 'ar' ? 'العربية' : 'English';
    showMessage(`${langName} - ${t('language_changed')}`, 'info');
  }
}

// Helper to get translation
function t(key) {
  try {
    const lang = localStorage.getItem('language') || 'ar';
    if (!translations || !translations[lang]) {
      // Fallback to key if translations not loaded yet
      console.error('Translation error:\n', 'Language: ', lang, 'Key:', key);
      return key;
    }
    return translations[lang] && translations[lang][key]
      ? translations[lang][key]
      : key;
  } catch (error) {
    console.error('Translation error:', error);
    return key;
  }
}

// Helper to map backend Arabic validation messages to translation keys
function mapValidationMessage(message) {
  const arabicToKeyMap = {
    'اسم المستخدم يجب أن يحتوي على أحرف وأرقام وشرطة سفلية فقط':
      'validation.username_pattern',
    'اسم المستخدم يجب أن يكون على الأقل 3 أحرف': 'validation.username_min',
    'اسم المستخدم يجب أن لا يتجاوز 50 حرف': 'validation.username_max',
    'كلمة المرور يجب أن تكون على الأقل 6 أحرف': 'validation.password_min',
    'البريد الإلكتروني يجب أن يكون صحيحاً': 'validation.email_format',
    'الدور يجب أن يكون employee أو admin': 'validation.role_invalid',
    'اسم المستخدم مطلوب': 'validation.field_required',
    'كلمة المرور مطلوبة': 'validation.field_required',
  };

  return arabicToKeyMap[message] || message;
}

// Initialize language system
(async () => {
  try {
    await loadTranslations('en');
    await loadTranslations('ar');
    const lang = localStorage.getItem('language') || 'ar';
    setLanguage(lang);
  } catch (error) {
    console.error(t('console.error.language_system'), error);
  }
})();

// Example usage in a form submit handler:
// fetch('/api/auth/register', { ... })
//   .then(res => res.json())
//   .then(data => {
//     if (!data.success && data.errors) {
//       showApiErrors(data.errors);
//     }
//   });

// User Management Functions
function setupUserManagement() {
  const createUserBtn = document.getElementById('createUserBtn');
  const userModal = document.getElementById('userModal');
  const roleFilterBtns = document.querySelectorAll('.role-filter-btn');
  const moderatorOption = document.getElementById('moderatorOption');
  const userPasswordGroup = document.getElementById('userPasswordGroup');
  const userModalTitle = document.getElementById('userModalTitle');
  const userId = document.getElementById('userId');

  // Show/hide moderator option based on current user role
  if (currentUser && currentUser.role === 'admin') {
    moderatorOption.style.display = 'block';
  } else {
    moderatorOption.style.display = 'none';
  }

  // Create user button
  if (createUserBtn) {
    createUserBtn.addEventListener('click', () => {
      openUserModal();
    });
  }

  // Role filter buttons
  roleFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      roleFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadUsers(btn.dataset.role);
    });
  });

  // User form submission
  if (userForm) {
    userForm.addEventListener('submit', e => {
      e.preventDefault();
      handleUserFormSubmit();
    });
  }

  // Close modal when clicking close button or outside
  if (userModal) {
    userModal.addEventListener('click', e => {
      if (e.target === userModal || e.target.classList.contains('close')) {
        closeUserModal();
      }
    });
  }

  // Load users when user management tab is shown
  document.addEventListener('click', e => {
    if (e.target.closest('[data-tab="user-management"]')) {
      loadUsers('all');
    }
  });

  // User action buttons (edit, delete, password)
  document.addEventListener('click', e => {
    if (e.target.closest('.btn-edit')) {
      const userId = e.target.closest('.btn-edit').dataset.userId;
      editUser(userId);
    }

    if (e.target.closest('.btn-delete')) {
      const userId = e.target.closest('.btn-delete').dataset.userId;
      deleteUser(userId);
    }

    if (e.target.closest('.btn-password')) {
      const userId = e.target.closest('.btn-password').dataset.userId;
      changeUserPassword(userId);
    }
  });
}

async function loadUsers(roleFilter = 'all') {
  try {
    const response = await fetch('/api/user-management', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      let users = data.data || [];

      // Filter users based on role
      if (roleFilter !== 'all') {
        users = users.filter(user => user.role === roleFilter);
      }

      displayUsers(users);
    } else {
      const error = await response.json();
      showMessage(error.message || 'Failed to load users', 'error');
    }
  } catch (error) {
    console.error('Error loading users:', error);
    showMessage('Failed to load users', 'error');
  }
}

function displayUsers(users) {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;

  if (users.length === 0) {
    usersList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>${t('no_users_found')}</h3>
        <p>${t('no_users_found_description')}</p>
      </div>
    `;
    return;
  }

  usersList.innerHTML = users.map(user => createUserCard(user)).join('');
}

function createUserCard(user) {
  const isActive = user.is_active ? '' : 'inactive';
  const roleClass = user.role;

  return `
    <div class="user-card ${roleClass} ${isActive}">
      <div class="user-header">
        <div class="user-info">
          <div class="user-name">${user.full_name || user.username}</div>
          <div class="user-username">@${user.username}</div>
          <span class="user-role-badge ${user.role}">${t(user.role)}</span>
        </div>
        <div class="user-actions">
          <button class="btn-edit" data-user-id="${user.id}" title="${t(
            'edit_user'
          )}">
            <i class="fas fa-edit"></i>
            ${t('edit')}
          </button>
          <button class="btn-password" data-user-id="${user.id}" title="${t(
            'change_password'
          )}">
            <i class="fas fa-key"></i>
            ${t('password')}
          </button>
          <button class="btn-delete" data-user-id="${user.id}" title="${t(
            'delete_user'
          )}">
            <i class="fas fa-trash"></i>
            ${t('delete')}
          </button>
        </div>
      </div>
      <div class="user-details">
        <div class="user-detail">
          <label>${t('email')}</label>
          <span>${user.email || t('not_provided')}</span>
        </div>
        <div class="user-detail">
          <label>${t('department')}</label>
          <span>${user.department_name || t('not_assigned')}</span>
        </div>
        <div class="user-detail">
          <label>${t('status')}</label>
          <span>${user.is_active ? t('active') : t('inactive')}</span>
        </div>
        <div class="user-detail">
          <label>${t('created_at')}</label>
          <span>${formatDate(user.created_at)}</span>
        </div>
      </div>
    </div>
  `;
}

function openUserModal(user = null) {
  const userModal = document.getElementById('userModal');
  const userModalTitle = document.getElementById('userModalTitle');
  const userId = document.getElementById('userId');
  const userPasswordGroup = document.getElementById('userPasswordGroup');

  if (user) {
    // Edit mode
    userModalTitle.textContent = t('edit_user');
    userId.value = user.id;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userFullName').value = user.full_name || '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('userDepartment').value = user.department_id || '';
    document.getElementById('userIsActive').checked = user.is_active;

    // Hide password field for editing
    userPasswordGroup.style.display = 'none';
  } else {
    // Create mode
    userModalTitle.textContent = t('create_user');
    userId.value = '';
    userForm.reset();

    // Show password field for new users
    userPasswordGroup.style.display = 'block';
  }

  userModal.style.display = 'block';
}

function closeUserModal() {
  const userModal = document.getElementById('userModal');
  userModal.style.display = 'none';
  userForm.reset();
}

async function handleUserFormSubmit() {
  const formData = new FormData(userForm);
  const userData = Object.fromEntries(formData.entries());
  const userId = userData.userId;

  try {
    const url = userId
      ? `/api/user-management/${userId}`
      : '/api/user-management';
    const method = userId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage(userId ? 'user_updated' : 'user_created', 'success');
      closeUserModal();
      loadUsers('all');
    } else {
      showMessage(result.message || 'Failed to save user', 'error');
    }
  } catch (error) {
    console.error('Error saving user:', error);
    showMessage('Failed to save user', 'error');
  }
}

async function editUser(userId) {
  try {
    const response = await fetch(`/api/user-management/${userId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      openUserModal(data.data);
    } else {
      const error = await response.json();
      showMessage(error.message || 'Failed to load user', 'error');
    }
  } catch (error) {
    console.error('Error loading user:', error);
    showMessage('Failed to load user', 'error');
  }
}

async function deleteUser(userId) {
  if (!confirm(t('confirm_delete_user'))) {
    return;
  }

  try {
    const response = await fetch(`/api/user-management/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const result = await response.json();

    if (response.ok) {
      showMessage('user_deleted', 'success');
      loadUsers('all');
    } else {
      showMessage(result.message || 'Failed to delete user', 'error');
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    showMessage('Failed to delete user', 'error');
  }
}

async function changeUserPassword(userId) {
  const newPassword = prompt(t('enter_new_password'));
  if (!newPassword) return;

  try {
    const response = await fetch(`/api/user-management/${userId}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ newPassword }),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage('password_changed', 'success');
    } else {
      showMessage(result.message || 'Failed to change password', 'error');
    }
  } catch (error) {
    console.error('Error changing password:', error);
    showMessage('Failed to change password', 'error');
  }
}
