/**
 * Utility functions for sanitizing user input
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 *
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize all properties of an object
 *
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const result = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        result[key] = escapeHtml(value);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Set text content safely
 *
 * @param {HTMLElement} element - Element to update
 * @param {string} text - Text content to set
 */
function setTextContent(element, text) {
  if (!element || !text) return;
  element.textContent = text;
}

/**
 * Create element with sanitized attributes
 *
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string} textContent - Text content
 * @returns {HTMLElement} - Created element
 */
function createElement(tag, attributes = {}, textContent = '') {
  const element = document.createElement(tag);

  // Set sanitized attributes
  for (const key in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, key)) {
      const value = attributes[key];

      if (typeof value === 'string') {
        element.setAttribute(key, escapeHtml(value));
      } else {
        element.setAttribute(key, value);
      }
    }
  }

  // Set text content if provided
  if (textContent) {
    setTextContent(element, textContent);
  }

  return element;
}

/**
 * Sanitize form data
 *
 * @param {FormData} formData - Form data to sanitize
 * @returns {Object} - Sanitized form data as object
 */
function sanitizeFormData(formData) {
  const result = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      result[key] = escapeHtml(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validate date and time
 *
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {string} time - Time string (HH:MM)
 * @returns {Object} - Object with valid flag and message
 */
function validateDateTime(date, time) {
  // Validate date format
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      valid: false,
      message: 'date_format_invalid',
    };
  }

  // Validate time format
  if (!time || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    return {
      valid: false,
      message: 'time_format_invalid',
    };
  }

  // Create Date object for further validation
  const dateObj = new Date(`${date}T${time}:00`);

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return {
      valid: false,
      message: 'date_invalid',
    };
  }

  // Check if date is not in the past
  const now = new Date();
  if (dateObj < now) {
    return {
      valid: false,
      message: 'date_in_past',
    };
  }

  return {
    valid: true,
    message: 'datetime_valid',
  };
}

/**
 * Validate employee ID
 *
 * @param {string} employee_id - Employee ID to validate
 * @returns {Object} - Object with valid flag and message
 */
function validateEmployeeId(employee_id) {
  if (!employee_id || typeof employee_id !== 'string') {
    return {
      valid: false,
      message: 'employee_id_required',
    };
  }

  // Employee ID should be 3-10 characters of letters and numbers
  if (!/^[A-Za-z0-9]{3,10}$/.test(employee_id)) {
    return {
      valid: false,
      message: 'employee_id_invalid_format',
    };
  }

  return {
    valid: true,
    message: 'employee_id_valid',
  };
}

/**
 * Validate Arabic text (contains Arabic and possibly English characters)
 *
 * @param {string} text - Text to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {Object} - Object with valid flag and message
 */
function validateArabicText(text, minLength = 2, maxLength = 100) {
  if (!text || typeof text !== 'string') {
    return {
      valid: false,
      message: 'text_required',
    };
  }

  // Check length
  if (text.length < minLength) {
    return {
      valid: false,
      message: 'text_too_short',
    };
  }

  if (text.length > maxLength) {
    return {
      valid: false,
      message: 'text_too_long',
    };
  }

  // Check for Arabic characters (Unicode range for Arabic: \u0600-\u06FF)
  // Also allow English letters and spaces
  if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(text)) {
    return {
      valid: false,
      message: 'text_invalid_characters',
    };
  }

  return {
    valid: true,
    message: 'text_valid',
  };
}

/**
 * Validate employee name (specific validation for employee names)
 *
 * @param {string} name - Name to validate
 * @returns {Object} - Object with valid flag and message
 */
function validateEmployeeName(name) {
  const validation = validateArabicText(name, 2, 100);

  // Customize message for employee name
  if (!validation.valid) {
    if (validation.message === 'text_required') {
      return {
        valid: false,
        message: 'employee_name_required',
      };
    } else if (validation.message === 'text_too_short') {
      return {
        valid: false,
        message: 'employee_name_too_short',
      };
    } else if (validation.message === 'text_too_long') {
      return {
        valid: false,
        message: 'employee_name_too_long',
      };
    } else if (validation.message === 'text_invalid_characters') {
      return {
        valid: false,
        message: 'employee_name_invalid_characters',
      };
    }
  }

  return {
    valid: true,
    message: 'employee_name_valid',
  };
}

// Export functions for use in other scripts
window.escapeHtml = escapeHtml;
window.sanitizeObject = sanitizeObject;
window.setTextContent = setTextContent;
window.createElement = createElement;
window.sanitizeFormData = sanitizeFormData;
window.validateDateTime = validateDateTime;
window.validateEmployeeId = validateEmployeeId;
window.validateArabicText = validateArabicText;
window.validateEmployeeName = validateEmployeeName;
