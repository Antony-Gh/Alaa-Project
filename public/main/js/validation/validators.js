// Validation module for form validation
import { CONFIG } from '../config/config.js';
import { t } from '../utils/i18n.js';

class Validators {
    constructor() {
        this.config = CONFIG.VALIDATION;
    }

    // Email validation
    validateEmail(email) {
        if (!email || email.trim() === "") {
            return { isValid: false, message: t("auth.email_required") };
        }

        if (!this.config.EMAIL.PATTERN.test(email)) {
            return { isValid: false, message: t("auth.invalid_email") };
        }

        return { isValid: true, message: "" };
    }

    // Username validation
    validateUsername(username) {
        if (!username || username.trim() === "") {
            return { isValid: false, message: t("auth.username_required") };
        }

        if (username.length < this.config.USERNAME.MIN_LENGTH) {
            return { isValid: false, message: t("auth.username_too_short") };
        }

        if (username.length > this.config.USERNAME.MAX_LENGTH) {
            return { isValid: false, message: t("auth.username_too_long") };
        }

        if (!this.config.USERNAME.PATTERN.test(username)) {
            return { isValid: false, message: t("auth.username_english_only") };
        }

        return { isValid: true, message: "" };
    }

    // Password validation
    validatePassword(password) {
        if (!password || password.trim() === "") {
            return { isValid: false, message: t("auth.password_required") };
        }

        const config = this.config.PASSWORD;

        if (password.length < config.MIN_LENGTH) {
            return { isValid: false, message: t("auth.password_too_short") };
        }

        if (config.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            return { isValid: false, message: t("auth.password_no_uppercase") };
        }

        if (config.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
            return { isValid: false, message: t("auth.password_no_lowercase") };
        }

        if (config.REQUIRE_NUMBERS && !/\d/.test(password)) {
            return { isValid: false, message: t("auth.password_no_number") };
        }

        if (config.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            return { isValid: false, message: t("auth.password_no_special") };
        }

        return { isValid: true, message: "" };
    }

    // Password confirmation validation
    validatePasswordConfirmation(password, confirmPassword) {
        if (!confirmPassword || confirmPassword.trim() === "") {
            return { isValid: false, message: t("auth.confirm_password_required") };
        }

        if (password !== confirmPassword) {
            return { isValid: false, message: t("auth.passwords_not_match") };
        }

        return { isValid: true, message: "" };
    }

    // Employee ID validation
    validateEmployeeId(employeeId) {
        if (!employeeId || employeeId.trim() === "") {
            return { isValid: false, message: t("validation.employee_id_required") };
        }

        if (!this.config.EMPLOYEE_ID.PATTERN.test(employeeId)) {
            return { isValid: false, message: t("validation.employee_id_format") };
        }

        return { isValid: true, message: "" };
    }

    // Appointment data validation
    validateAppointmentData(data) {
        const errors = {};

        // Employee name validation
        if (!data.employee_name || data.employee_name.trim() === "") {
            errors.employee_name = t("validation.employee_name_required");
        } else if (data.employee_name.length < 2) {
            errors.employee_name = t("validation.employee_name_too_short");
        }

        // Employee ID validation
        const employeeIdValidation = this.validateEmployeeId(data.employee_id);
        if (!employeeIdValidation.isValid) {
            errors.employee_id = employeeIdValidation.message;
        }

        // Title validation
        if (!data.title || data.title.trim() === "") {
            errors.title = t("validation.title_required");
        } else if (data.title.length < 3) {
            errors.title = t("validation.title_too_short");
        }

        // Date and time validation
        if (!data.requested_date) {
            errors.requested_date = t("validation.date_required");
        }

        if (!data.requested_time) {
            errors.requested_time = t("validation.time_required");
        }

        // Department validation
        if (!data.department_id) {
            errors.department_id = t("validation.department_required");
        }

        // Location validation
        if (!data.location_id) {
            errors.location_id = t("validation.location_required");
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    // Department data validation
    validateDepartmentData(data) {
        const errors = {};

        if (!data.name || data.name.trim() === "") {
            errors.name = t("validation.department_name_required");
        } else if (data.name.length < 2) {
            errors.name = t("validation.department_name_too_short");
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    // Location data validation
    validateLocationData(data) {
        const errors = {};

        if (!data.name || data.name.trim() === "") {
            errors.name = t("validation.location_name_required");
        } else if (data.name.length < 2) {
            errors.name = t("validation.location_name_too_short");
        }

        if (data.capacity && (isNaN(data.capacity) || data.capacity < 1)) {
            errors.capacity = t("validation.capacity_invalid");
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    // Password strength checker
    checkPasswordStrength(password) {
        if (!password) return "empty";

        let score = 0;

        // Length check
        if (password.length >= this.config.PASSWORD.MIN_LENGTH) score += 1;
        if (password.length >= 12) score += 1;

        // Character variety checks
        if (/[A-Z]/.test(password)) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

        if (score <= 2) return "weak";
        if (score <= 4) return "medium";
        return "strong";
    }

    // Update password strength indicator
    updatePasswordStrengthIndicator(password) {
        const strengthIndicator = document.getElementById("passwordStrength");
        if (!strengthIndicator) return;

        const strength = this.checkPasswordStrength(password);
        const strengthText = {
            empty: "",
            weak: t("auth.password_too_short"),
            medium: t("auth.password_no_special"),
            strong: "", // Empty when password is strong
        };

        strengthIndicator.textContent = strengthText[strength];
        strengthIndicator.className = `password-strength ${strength}`;
    }

    // Update password match indicator
    updatePasswordMatchIndicator(password, confirmPassword) {
        const matchIndicator = document.getElementById("passwordMatch");
        if (!matchIndicator) return;

        if (!confirmPassword) {
            matchIndicator.textContent = "";
            matchIndicator.className = "password-match empty";
            return;
        }

        if (password === confirmPassword) {
            matchIndicator.textContent = ""; // Empty when passwords match
            matchIndicator.className = "password-match match";
        } else {
            matchIndicator.textContent = t("auth.passwords_not_match");
            matchIndicator.className = "password-match no-match";
        }
    }

    // Setup form validation listeners
    setupFormValidation() {
        // Username validation
        const usernameInputs = document.querySelectorAll("#loginUsername, #registerUsername");
        usernameInputs.forEach((input) => {
            input.addEventListener("input", function () {
                const validation = this.validateUsername(this.value);
                this.updateInputValidation(this, validation.isValid);
            }.bind(this));
        });

        // Email validation
        const emailInput = document.getElementById("registerEmail");
        if (emailInput) {
            emailInput.addEventListener("input", function () {
                const validation = this.validateEmail(this.value);
                this.updateInputValidation(this, validation.isValid);
            }.bind(this));
        }

        // Password validation
        const passwordInput = document.getElementById("registerPassword");
        if (passwordInput) {
            passwordInput.addEventListener("input", function () {
                const validation = this.validatePassword(this.value);
                this.updatePasswordStrengthIndicator(this.value);
                this.updateInputValidation(this, validation.isValid);
            }.bind(this));
        }

        // Confirm password validation
        const confirmPasswordInput = document.getElementById("registerConfirmPassword");
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener("input", function () {
                const password = document.getElementById("registerPassword")?.value || "";
                const validation = this.validatePasswordConfirmation(password, this.value);
                this.updatePasswordMatchIndicator(password, this.value);
                this.updateInputValidation(this, validation.isValid);
            }.bind(this));
        }
    }

    // Update input validation styling
    updateInputValidation(input, isValid) {
        if (isValid) {
            input.classList.remove("error");
            input.classList.add("valid");
        } else {
            input.classList.remove("valid");
            input.classList.add("error");
        }
    }
}

// Create singleton instance
const validators = new Validators();

// Export for ES6 modules
export { validators }; 