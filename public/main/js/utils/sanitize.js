// HTML sanitization utility to prevent XSS attacks
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sanitize object properties recursively
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return escapeHtml(obj);
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = escapeHtml(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

// Safe DOM manipulation functions
function setTextContent(element, text) {
    if (element) {
        element.textContent = text || '';
    }
}

function setInnerHTML(element, html) {
    if (element) {
        element.innerHTML = escapeHtml(html) || '';
    }
}

function createElement(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    
    // Set attributes
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        } else {
            element.setAttribute(key, value);
        }
    }
    
    // Set text content
    if (textContent) {
        element.textContent = textContent;
    }
    
    return element;
}

// Validate and sanitize form data
function sanitizeFormData(formData) {
    const sanitized = {};
    
    for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
            // Remove any HTML tags and trim whitespace
            sanitized[key] = value.replace(/<[^>]*>/g, '').trim();
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

// Validate date and time inputs
function validateDateTime(date, time) {
    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    
    // Check if selected date/time is in the future
    if (selectedDateTime <= now) {
        return {
            valid: false,
            message: 'validation.date_time_future'
        };
    }
    
    // Check if date is not more than 1 year in the future
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (selectedDateTime > oneYearFromNow) {
        return {
            valid: false,
            message: 'validation.date_time_max_year'
        };
    }
    
    return { valid: true };
}

// Validate employee ID format
function validateEmployeeId(employeeId) {
    const pattern = /^[A-Z0-9]{3,10}$/;
    if (!pattern.test(employeeId)) {
        return {
            valid: false,
            message: 'validation.employee_id_format'
        };
    }
    return { valid: true };
}

// Validate Arabic text
function validateArabicText(text, minLength = 2, maxLength = 100) {
    const arabicPattern = /^[\u0600-\u06FF\s]+$/;
    
    if (!text || text.length < minLength) {
        return {
            valid: false,
            message: `validation.text_min_length_${minLength}`
        };
    }
    
    if (text.length > maxLength) {
        return {
            valid: false,
            message: `validation.text_max_length_${maxLength}`
        };
    }
    
    if (!arabicPattern.test(text)) {
        return {
            valid: false,
            message: 'validation.arabic_text_required'
        };
    }
    
    return { valid: true };
}

export {
    escapeHtml,
    sanitizeObject,
    setTextContent,
    setInnerHTML,
    createElement,
    sanitizeFormData,
    validateDateTime,
    validateEmployeeId,
    validateArabicText
}; 