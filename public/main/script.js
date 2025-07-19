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
} from "./utils/sanitize.js";

// Fallback for createElement in case import fails
const safeCreateElement =
  createElement ||
  ((tag, attributes = {}) => {
    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (key === "className") {
        element.className = value;
      } else {
        element.setAttribute(key, value);
      }
    }
    return element;
  });

// Global variables
let departments = [];
let locations = [];
let appointments = [];
let currentUser = null;
let authToken = localStorage.getItem("authToken");

// DOM elements
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const authTabBtns = document.querySelectorAll(".auth-tab-btn");
const authContents = document.querySelectorAll(".auth-content");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const logoutBtn = document.getElementById("logoutBtn");
const userDisplayName = document.getElementById("userDisplayName");
const userRole = document.getElementById("userRole");
const adminTab = document.getElementById("adminTab");

const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const appointmentForm = document.getElementById("appointmentForm");
const adminForm = document.getElementById("adminForm");
const statusBtns = document.querySelectorAll(".status-btn");
const appointmentModal = document.getElementById("appointmentModal");
const adminModal = document.getElementById("adminModal");
const modalContent = document.getElementById("modalContent");

// Profile elements
const profileForm = document.getElementById("profileForm");
const changePasswordForm = document.getElementById("changePasswordForm");

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

async function initializeApp() {
  try {
    // Create language switcher
    createModernLangSwitcher();

    // Set initial language
    const lang = localStorage.getItem("language") || "ar";
    setLanguage(lang);

    // Setup event listeners
    setupEventListeners();

    // Check authentication status
    await checkAuthStatus();

    console.log(t("system.ready"));
  } catch (error) {
    console.error(t("console.error.app_initialization"), error);
  }
}

function setupEventListeners() {
  // Authentication event listeners
  authTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchAuthTab(btn.dataset.auth));
  });

  loginForm.addEventListener("submit", handleLogin);
  registerForm.addEventListener("submit", handleRegister);
  logoutBtn.addEventListener("click", handleLogout);

  // Profile event listeners
  profileForm.addEventListener("submit", handleProfileUpdate);
  changePasswordForm.addEventListener("submit", handlePasswordChange);

  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Form submissions
  appointmentForm.addEventListener("submit", handleAppointmentSubmit);
  adminForm.addEventListener("submit", handleAdminFormSubmit);

  // Status filters
  statusBtns.forEach((btn) => {
    btn.addEventListener("click", () => filterAppointments(btn.dataset.status));
  });

  // Modal close buttons
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", closeModals);
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeModals();
    }
  });

  // Admin form status change
  document
    .getElementById("statusSelect")
    .addEventListener("change", handleStatusChange);

  // Event delegation for appointment card buttons
  document.addEventListener("click", (e) => {
    // Admin modal button
    if (e.target.closest(".admin-modal-btn")) {
      const appointmentId =
        e.target.closest(".admin-modal-btn").dataset.appointmentId;
      openAdminModal(appointmentId);
    }

    // View details button
    if (e.target.closest(".view-details-btn")) {
      const appointmentId =
        e.target.closest(".view-details-btn").dataset.appointmentId;
      viewAppointmentDetails(appointmentId);
    }
  });
}

// Authentication functions
async function checkAuthStatus() {
  try {
    const response = await fetch("/api/auth/profile", {
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
      localStorage.removeItem("authToken");
      authToken = null;
      showAuthSection();
    }
  } catch (error) {
    console.error(t("console.error.auth_status_check"), error);
    localStorage.removeItem("authToken");
    authToken = null;
    showAuthSection();
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const loginData = sanitizeFormData(new FormData(loginForm));

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    });

    const result = await response.json();
    console.log("Login response status:", response.status);
    console.log("Login response:", result);

    if (response.ok) {
      authToken = result.data.token;
      currentUser = result.data.user;
      localStorage.setItem("authToken", authToken);

      showMessage("login_success", "success");
      showAppSection();
      await loadInitialData();
    } else {
      console.log("Login failed - Status:", response.status);
      console.log("Login failed - Response:", result);

      // Handle error response - the message from backend is a translation key
      if (result.message) {
        // The backend sends translation keys, so we need to translate them
        const translatedMessage = t(result.message);
        showMessage(translatedMessage, "error");
      } else {
        showMessage("login_failed", "error");
      }

      // Only show one type of error message, prioritize API errors over general message
      if (
        result.errors &&
        Array.isArray(result.errors) &&
        result.errors.length > 0
      ) {
        console.log("Showing API errors:", result.errors);
        showApiErrors(result.errors);
      }
    }
  } catch (error) {
    console.error("Login fetch error:", error);
    console.error(t("console.error.login"), error);
    showMessage("server_error", "error");
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const registerData = sanitizeFormData(new FormData(registerForm));

  console.log("Register data:", registerData);

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerData),
    });

    const result = await response.json();

    if (response.ok) {
      authToken = result.data.token;
      currentUser = result.data.user;
      localStorage.setItem("authToken", authToken);

      showMessage("register_success", "success");
      showAppSection();
      await loadInitialData();
    } else {
      console.log(result);

      // Handle error response - the message from backend is a translation key
      if (result.message) {
        // The backend sends translation keys, so we need to translate them
        const translatedMessage = t(result.message);
        showMessage(translatedMessage, "error");
      } else {
        showMessage("register_failed", "error");
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
    console.error(t("console.error.register"), error);
    showMessage("server_error", "error");
  }
}

function handleLogout() {
  localStorage.removeItem("authToken");
  authToken = null;
  currentUser = null;
  showAuthSection();
  showMessage("logout_success", "info");
}

function showAuthSection() {
  authSection.style.display = "block";
  appSection.classList.add("app-section-hidden");
}

function showAppSection() {
  authSection.style.display = "none";
  appSection.classList.remove("app-section-hidden");

  // Update user info
  if (currentUser) {
    setTextContent(userDisplayName, `مرحباً ${currentUser.username}`);
    setTextContent(userRole, currentUser.role === "admin" ? "مدير" : "موظف");

    // Show/hide admin tab based on role
    if (currentUser.role === "admin") {
      adminTab.classList.remove("admin-tab-hidden");
    } else {
      adminTab.classList.add("admin-tab-hidden");
    }
  }
}

function switchAuthTab(tabName) {
  authTabBtns.forEach((btn) => btn.classList.remove("active"));
  authContents.forEach((content) => content.classList.remove("active"));

  document.querySelector(`[data-auth="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}-content`).classList.add("active");
}

// Profile management
async function handleProfileUpdate(e) {
  e.preventDefault();

  const profileData = sanitizeFormData(new FormData(profileForm));
  if (profileData.department_id)
    profileData.department_id = parseInt(profileData.department_id);

  try {
    const response = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(profileData),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage("profile_update_success", "success");
      currentUser = { ...currentUser, ...result.data };
    } else {
      showMessage(result.message || "profile_update_failed", "error");
    }
  } catch (error) {
    console.error(t("console.error.profile_update"), error);
    showMessage("server_error", "error");
  }
}

async function handlePasswordChange(e) {
  e.preventDefault();

  const passwordData = sanitizeFormData(new FormData(changePasswordForm));
  const confirmPassword = passwordData.confirmPassword;

  if (passwordData.newPassword !== confirmPassword) {
    showMessage("password_mismatch", "error");
    return;
  }

  try {
    const response = await fetch("/api/auth/change-password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(passwordData),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage("password_change_success", "success");
      changePasswordForm.reset();
    } else {
      showMessage(result.message || "password_change_failed", "error");
    }
  } catch (error) {
    console.error(t("console.error.password_change"), error);
    showMessage("server_error", "error");
  }
}

// Data loading functions
async function loadInitialData() {
  try {
    // Load departments and locations
    await Promise.all([loadDepartments(), loadLocations()]);

    // Load appointments
    await loadAppointments();

    // Load dashboard stats
    await loadDashboardStats();

    // Load user profile data
    await loadUserProfile();
  } catch (error) {
    console.error(t("console.error.data_loading"), error);
    showMessage("data_loading_error", "error");
  }
}

async function loadUserProfile() {
  try {
    const response = await fetch("/api/auth/profile", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      const user = result.data;

      // Populate profile form
      setTextContent(document.getElementById("profileUsername"), user.username);
      setTextContent(document.getElementById("profileEmail"), user.email || "");

      // Set department if available
      if (user.department_id) {
        document.getElementById("profileDepartment").value = user.department_id;
      }
    }
  } catch (error) {
    console.error(t("console.error.user_profile"), error);
  }
}

async function loadDepartments() {
  try {
    const response = await fetch("/api/appointments/departments");
    const result = await response.json();

    if (response.ok) {
      departments = result.data || result;
      populateDepartmentSelect();
    }
  } catch (error) {
    console.error(t("console.error.departments"), error);
  }
}

async function loadLocations() {
  try {
    const response = await fetch("/api/appointments/locations");
    const result = await response.json();

    if (response.ok) {
      locations = result.data || result;
      populateLocationSelect();
    }
  } catch (error) {
    console.error(t("console.error.locations"), error);
  }
}

async function loadAppointments() {
  try {
    const response = await fetch("/api/appointments", {
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
    console.error(t("console.error.appointments"), error);
  }
}

async function loadAdminAppointments() {
  try {
    const response = await fetch("/api/appointments", {
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
    console.error(t("console.error.admin_appointments"), error);
  }
}

async function loadDashboardStats() {
  try {
    const response = await fetch("/api/appointments/stats", {
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
    console.error(t("console.error.dashboard_stats"), error);
  }
}

// Populate form selects
function populateDepartmentSelect() {
  const select = document.getElementById("department");
  const profileSelect = document.getElementById("profileDepartment");

  const options = departments
    .map(
      (dept) => `<option value="${dept.id}">${escapeHtml(dept.name)}</option>`
    )
    .join("");

  select.innerHTML =
    `<option value="">${escapeHtml(t("select_department"))}</option>` + options;
  profileSelect.innerHTML =
    `<option value="">${escapeHtml(t("select_department"))}</option>` + options;
}

function populateLocationSelect() {
  const select = document.getElementById("location");

  const options = locations
    .map(
      (loc) =>
        `<option value="${loc.id}">${escapeHtml(loc.name)} (${
          loc.capacity
        } شخص)</option>`
    )
    .join("");

  select.innerHTML =
    `<option value="">${escapeHtml(t("select_location"))}</option>` + options;
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
    showMessage(validation.message, "error");
    return;
  }

  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(appointmentData),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage("appointment_submit_success", "success");
      appointmentForm.reset();
      await loadAppointments();
    } else {
      showMessage(result.message || "appointment_submit_failed", "error");
    }
  } catch (error) {
    console.error(t("console.error.appointment_submit"), error);
    showMessage("server_error", "error");
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
      message: "title_validation_length",
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

  let updateDataToSend = {
    status: status,
    admin_notes: adminNotes,
  };

  // Add specific fields based on status
  if (status === "approved") {
    updateDataToSend.approved_date = updateData.approved_date;
    updateDataToSend.approved_time = updateData.approved_time;
  } else if (status === "rejected") {
    updateDataToSend.rejection_reason = updateData.rejection_reason;
  }

  try {
    const response = await fetch(`/api/appointments/${appointmentId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updateDataToSend),
    });

    const result = await response.json();

    if (response.ok) {
      showMessage("admin_form_update_success", "success");
      closeModals();
      await loadAdminAppointments();
      await loadDashboardStats();
    } else {
      showMessage(result.message || "admin_form_update_failed", "error");
    }
  } catch (error) {
    console.error(t("console.error.status_update"), error);
    showMessage("server_error", "error");
  }
}

// Display functions with XSS protection
function displayMyAppointments() {
  const container = document.getElementById("myAppointmentsList");

  if (appointments.length === 0) {
    setInnerHTML(
      container,
      `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${t("no_appointments")}</h3>
                <p>${t("start_booking")}</p>
            </div>
        `
    );
    return;
  }

  const appointmentCards = appointments
    .filter(
      (apt) =>
        apt.employee_id === currentUser.username || currentUser.role === "admin"
    )
    .map((appointment) => createAppointmentCard(appointment, false))
    .join("");

  setInnerHTML(container, appointmentCards);
}

function displayAdminAppointments() {
  const container = document.getElementById("adminAppointmentsList");

  if (appointments.length === 0) {
    setInnerHTML(
      container,
      `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${t("no_appointments")}</h3>
                <p>${t("no_appointments_created")}</p>
            </div>
        `
    );
    return;
  }

  const appointmentCards = appointments
    .map((appointment) => createAppointmentCard(appointment, true))
    .join("");

  setInnerHTML(container, appointmentCards);
}

function displayRecentAppointments(recentAppointments = []) {
  const container = document.getElementById("recentAppointmentsList");

  if (recentAppointments.length === 0) {
    setInnerHTML(
      container,
      `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${t("no_recent_appointments")}</h3>
            </div>
        `
    );
    return;
  }

  const appointmentCards = recentAppointments
    .map((appointment) => createAppointmentCard(appointment, false))
    .join("");

  setInnerHTML(container, appointmentCards);
}

function createAppointmentCard(appointment, isAdmin = false) {
  const department = departments.find(
    (d) => d.id === appointment.department_id
  );
  const location = locations.find((l) => l.id === appointment.location_id);

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
                        <i class="fas fa-edit"></i> ${t("update_status")}
                    </button>
                `
                    : ""
                }
            </div>
            
            <div class="appointment-details">
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span class="detail-label">${t("employee")}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.employee_name
                    )}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-building"></i>
                    <span class="detail-label">${t("department")}:</span>
                    <span class="detail-value">${escapeHtml(
                      department ? department.name : t("not_specified")
                    )}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="detail-label">${t("location")}:</span>
                    <span class="detail-value">${escapeHtml(
                      location ? location.name : t("not_specified")
                    )}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span class="detail-label">${t("requested_date")}:</span>
                    <span class="detail-value">${formatDate(
                      appointment.requested_date
                    )}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span class="detail-label">${t("requested_time")}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.requested_time
                    )}</span>
                </div>
                ${
                  appointment.approved_date
                    ? `
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        <span class="detail-label">${t("approved_date")}:</span>
                        <span class="detail-value">${formatDate(
                          appointment.approved_date
                        )}</span>
                    </div>
                `
                    : ""
                }
                ${
                  appointment.approved_time
                    ? `
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        <span class="detail-label">${t("approved_time")}:</span>
                        <span class="detail-value">${escapeHtml(
                          appointment.approved_time
                        )}</span>
                    </div>
                `
                    : ""
                }
            </div>
            
            ${
              appointment.description
                ? `
                <div class="detail-item">
                    <i class="fas fa-info-circle"></i>
                    <span class="detail-label">${t("description")}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.description
                    )}</span>
                </div>
            `
                : ""
            }
            
            ${
              appointment.rejection_reason
                ? `
                <div class="detail-item">
                    <i class="fas fa-times-circle"></i>
                    <span class="detail-label">${t("rejection_reason")}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.rejection_reason
                    )}</span>
                </div>
            `
                : ""
            }
            
            ${
              appointment.admin_notes
                ? `
                <div class="detail-item">
                    <i class="fas fa-sticky-note"></i>
                    <span class="detail-label">${t("admin_notes")}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.admin_notes
                    )}</span>
                </div>
            `
                : ""
            }
            
            <div class="appointment-actions">
                <button class="btn btn-primary view-details-btn" data-appointment-id="${
                  appointment.id
                }">
                    <i class="fas fa-eye"></i> ${t("view_details")}
                </button>
            </div>
        </div>
    `;

  return card;
}

// Tab switching functionality
function switchTab(tabName) {
  // Remove active class from all tabs and contents
  tabBtns.forEach((btn) => btn.classList.remove("active"));
  tabContents.forEach((content) => content.classList.remove("active"));

  // Add active class to selected tab and content
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");
  document.getElementById(`${tabName}-tab`).classList.add("active");

  // Load specific data based on tab
  if (tabName === "admin") {
    loadAdminAppointments();
  } else if (tabName === "dashboard") {
    loadDashboardStats();
  }
}

// Filter appointments by status
function filterAppointments(status) {
  // Update active button
  statusBtns.forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  const container = document.getElementById("adminAppointmentsList");

  if (status === "all") {
    displayAdminAppointments();
    return;
  }

  const filteredAppointments = appointments.filter(
    (apt) => apt.status === status
  );

  if (filteredAppointments.length === 0) {
    setInnerHTML(
      container,
      `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h3>${t("no_appointments_with_status")}</h3>
                <p>${t("no_appointments_with_status_message", {
                  status: t(getStatusText(status)),
                })}</p>
            </div>
        `
    );
    return;
  }

  const appointmentCards = filteredAppointments
    .map((appointment) => createAppointmentCard(appointment, true))
    .join("");

  setInnerHTML(container, appointmentCards);
}

// Modal functions
function openAdminModal(appointmentId) {
  const appointment = appointments.find((apt) => apt.id === appointmentId);
  if (!appointment) return;

  document.getElementById("appointmentId").value = appointmentId;
  document.getElementById("statusSelect").value = appointment.status;
  document.getElementById("adminNotes").value = appointment.admin_notes || "";
  document.getElementById("rejectionReason").value =
    appointment.rejection_reason || "";

  handleStatusChange(); // Show/hide relevant fields
  adminModal.style.display = "block";
}

function viewAppointmentDetails(appointmentId) {
  const appointment = appointments.find((apt) => apt.id === appointmentId);
  if (!appointment) return;

  const department = departments.find(
    (d) => d.id === appointment.department_id
  );
  const location = locations.find((l) => l.id === appointment.location_id);

  const modalHtml = `
        <h2>${t("appointment_details")}</h2>
        <div class="appointment-details">
            <div class="detail-item">
                <i class="fas fa-user"></i>
                <span class="detail-label">${t("employee")}:</span>
                <span class="detail-value">${escapeHtml(
                  appointment.employee_name
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-id-card"></i>
                <span class="detail-label">${t("employee_id")}:</span>
                <span class="detail-value">${escapeHtml(
                  appointment.employee_id
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-building"></i>
                <span class="detail-label">${t("department")}:</span>
                <span class="detail-value">${escapeHtml(
                  department ? department.name : t("not_specified")
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <span class="detail-label">${t("location")}:</span>
                <span class="detail-value">${escapeHtml(
                  location ? location.name : t("not_specified")
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-calendar"></i>
                <span class="detail-label">${t("requested_date")}:</span>
                <span class="detail-value">${formatDate(
                  appointment.requested_date
                )}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-clock"></i>
                <span class="detail-label">${t("requested_time")}:</span>
                <span class="detail-value">${escapeHtml(
                  appointment.requested_time
                )}</span>
            </div>
            ${
              appointment.description
                ? `
                <div class="detail-item">
                    <i class="fas fa-info-circle"></i>
                    <span class="detail-label">${t("description")}:</span>
                    <span class="detail-value">${escapeHtml(
                      appointment.description
                    )}</span>
                </div>
            `
                : ""
            }
            <div class="detail-item">
                <i class="fas fa-calendar-check"></i>
                <span class="detail-label">${t("created_at")}:</span>
                <span class="detail-value">${formatDateTime(
                  appointment.created_at
                )}</span>
            </div>
        </div>
    `;

  setInnerHTML(modalContent, modalHtml);
  appointmentModal.style.display = "block";
}

function closeModals() {
  appointmentModal.style.display = "none";
  adminModal.style.display = "none";
}

// Admin form status change handler
function handleStatusChange() {
  const status = document.getElementById("statusSelect").value;
  const approvedDateGroup = document.getElementById("approvedDateGroup");
  const approvedTimeGroup = document.getElementById("approvedTimeGroup");
  const rejectionReasonGroup = document.getElementById("rejectionReasonGroup");

  // Hide all conditional fields
  approvedDateGroup.classList.add("hidden");
  approvedTimeGroup.classList.add("hidden");
  rejectionReasonGroup.classList.add("hidden");

  // Show relevant fields based on status
  if (status === "approved") {
    approvedDateGroup.classList.remove("hidden");
    approvedTimeGroup.classList.remove("hidden");
  } else if (status === "rejected") {
    rejectionReasonGroup.classList.remove("hidden");
  }
}

// Update dashboard statistics
function updateDashboardStats(stats) {
  const pendingCount = stats.find((s) => s.status === "pending")?.count || 0;
  const approvedCount = stats.find((s) => s.status === "approved")?.count || 0;
  const rejectedCount = stats.find((s) => s.status === "rejected")?.count || 0;
  const doneCount = stats.find((s) => s.status === "done")?.count || 0;

  setTextContent(document.getElementById("pendingCount"), pendingCount);
  setTextContent(document.getElementById("approvedCount"), approvedCount);
  setTextContent(document.getElementById("rejectedCount"), rejectedCount);
  setTextContent(document.getElementById("doneCount"), doneCount);
}

// Utility functions
function getStatusText(status) {
  const statusMap = {
    pending: "pending_status",
    approved: "approved_status",
    rejected: "rejected_status",
    done: "done_status",
    missed: "missed_status",
  };
  return statusMap[status] || status;
}

function formatDate(dateString) {
  if (!dateString) return t("not_specified");
  const date = new Date(dateString);
  return date.toLocaleDateString("ar-SA");
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return t("not_specified");
  const date = new Date(dateTimeString);
  return date.toLocaleString("ar-SA");
}

// Language switcher and translation system
const translations = { en: {}, ar: {} };

async function loadTranslations(lang) {
  try {
    const response = await fetch(`${lang}.json`);
    const data = await response.json();
    translations[lang] = data;
  } catch (error) {
    console.error(t("console.error.translation_loading"), error);
  }
}

function updateAllTranslatableElements() {
  const lang = localStorage.getItem("language") || "ar";

  // Update all translatable text elements
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      el.textContent = translations[lang][key];
    }
  });

  // Update placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[lang] && translations[lang][key]) {
      el.placeholder = translations[lang][key];
    }
  });

  // Update button titles
  document.querySelectorAll("button[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      el.title = translations[lang][key];
    }
  });

  // Update user profile language if logged in
  if (currentUser && authToken) {
    fetch("/api/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ language: lang }),
    }).catch((error) => {
      console.error(t("console.error.language_preference"), error);
    });
  }
}

// Utility function to clear all messages
function clearAllMessages() {
  const messageContainer = document.getElementById("messageContainer");
  if (messageContainer) {
    const allMessages = messageContainer.querySelectorAll(".message");
    allMessages.forEach((msg) => msg.remove());
  }
}

// Utility function to clear specific message types
function clearMessagesByType(type) {
  const messageContainer = document.getElementById("messageContainer");
  if (messageContainer) {
    const messages = messageContainer.querySelectorAll(`.message.${type}`);
    messages.forEach((msg) => msg.remove());
  }
}

// Refactor showMessage to use translation keys and support error-list inside error message
function showMessage(message, type = "info") {
  const messageContainer = document.getElementById("messageContainer");
  if (!messageContainer) return;

  // If showing a success message, clear any existing error messages
  if (type === "success") {
    clearMessagesByType("error");
  }

  // Remove existing messages of the same type
  const existingMessages = messageContainer.querySelectorAll(
    `.message.${type}[data-type="user-message"]`
  );
  existingMessages.forEach((msg) => msg.remove());

  // Translate message if it's a key
  const lang = localStorage.getItem("language") || "ar";
  const msgText =
    translations[lang] && translations[lang][message]
      ? translations[lang][message]
      : message;

  // Create new message
  const messageDiv = safeCreateElement("div", {
    className: `message ${type}`,
    "data-type": "user-message",
  });

  // Add close button and message title
  messageDiv.innerHTML = `
        <button class="close-btn">&times;</button>
        <div class="message-title">${escapeHtml(msgText)}</div>
    `;

  // Add event listener to close button
  const closeBtn = messageDiv.querySelector(".close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      messageDiv.remove();
    });
  }

  // Insert at the top of the container
  messageContainer.appendChild(messageDiv);

  // Auto remove after 5 seconds for non-error messages, 8 seconds for error messages
  const autoRemoveTime = type === "error" ? 8000 : 5000;
  setTimeout(() => {
    if (messageDiv.parentElement) {
      messageDiv.remove();
    }
  }, autoRemoveTime);
}

// Refactor showApiErrors to use translation keys and work alongside showMessage
function showApiErrors(errors) {
  const messageContainer = document.getElementById("messageContainer");
  if (!messageContainer) {
    console.warn("Message container not found");
    return;
  }

  // Ensure errors is valid
  if (!errors) {
    console.warn("No errors provided to showApiErrors");
    return;
  }

  // Remove only existing API error messages, not all messages
  const existingApiMessages = messageContainer.querySelectorAll(
    '.message.error[data-type="api-error"]'
  );
  existingApiMessages.forEach((msg) => msg.remove());

  // Create error message
  const messageDiv = safeCreateElement("div", {
    className: "message error",
    "data-type": "api-error",
  });

  let errorContent = '<button class="close-btn">&times;</button>';
  errorContent += '<div class="message-content">';

  try {
    if (Array.isArray(errors)) {
      errorContent += '<ul style="margin: 0; padding-right: 1rem;">';
      errors.forEach((err) => {
        if (err && err.message) {
          // Map Arabic validation messages to translation keys
          const mappedMessage = mapValidationMessage(err.message);
          const displayMessage = t(mappedMessage);
          errorContent += `<li>${escapeHtml(displayMessage)}</li>`;

          // Optionally highlight the field
          if (err.field) {
            const field = document.querySelector(`[name="${err.field}"]`);
            if (field) {
              field.style.borderColor = "red";
            }
          }
        }
      });
      errorContent += "</ul>";
    } else if (typeof errors === "object") {
      errorContent += '<ul style="margin: 0; padding-right: 1rem;">';
      Object.entries(errors).forEach(([field, fieldErrors]) => {
        if (Array.isArray(fieldErrors)) {
          fieldErrors.forEach((error) => {
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
      errorContent += "</ul>";
    } else if (typeof errors === "string") {
      const mappedMessage = mapValidationMessage(errors);
      const displayMessage = t(mappedMessage);
      errorContent += escapeHtml(displayMessage);
    } else {
      errorContent += escapeHtml(t("error.validation"));
    }
  } catch (error) {
    console.error("Error processing API errors:", error);
    errorContent += escapeHtml(t("error.validation"));
  }

  errorContent += "</div>";
  messageDiv.innerHTML = errorContent;

  // Add event listener to close button
  const closeBtn = messageDiv.querySelector(".close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
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
  const languageSwitcher = document.getElementById("languageSwitcher");
  if (!languageSwitcher) return;

  const currentLang = localStorage.getItem("language") || "ar";

  const langSwitcherHTML = `
        <button class="lang-btn ${
          currentLang === "ar" ? "active" : ""
        }" data-lang="ar" title="العربية">
            <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 600'><rect width='900' height='600' fill='%23ce1126'/><rect width='900' height='400' fill='%23fff'/><rect width='900' height='200' fill='%23000'/><circle cx='450' cy='300' r='90' fill='%23000'/><circle cx='450' cy='300' r='60' fill='%23fff'/><circle cx='450' cy='300' r='30' fill='%23000'/></svg>" alt="العربية">
            العربية
        </button>
        <button class="lang-btn ${
          currentLang === "en" ? "active" : ""
        }" data-lang="en" title="English">
            <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 600'><rect width='900' height='600' fill='%23012169'/><rect width='900' height='46.15' y='46.15' fill='%23fff'/><rect width='900' height='46.15' y='138.45' fill='%23fff'/><rect width='900' height='46.15' y='230.75' fill='%23fff'/><rect width='900' height='46.15' y='323.05' fill='%23fff'/><rect width='900' height='46.15' y='415.35' fill='%23fff'/><rect width='900' height='46.15' y='507.65' fill='%23fff'/><rect width='346.15' height='323.05' fill='%23c8102e'/><rect width='46.15' height='323.05' x='46.15' fill='%23fff'/><rect width='46.15' height='323.05' x='92.3' fill='%23c8102e'/></svg>" alt="English">
            English
        </button>
    `;

  languageSwitcher.innerHTML = langSwitcherHTML;

  // Add event listeners
  languageSwitcher.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      setLanguage(lang);
    });
  });
}

function updateLangSwitcherActive() {
  const currentLang = localStorage.getItem("language") || "ar";
  const languageSwitcher = document.getElementById("languageSwitcher");
  if (!languageSwitcher) return;

  languageSwitcher.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}

function setLanguage(lang) {
  // Store language preference
  localStorage.setItem("language", lang);

  // Add transition class for smooth direction change
  document.body.classList.add("language-transitioning");

  // Update HTML lang and dir attributes
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  // Update body direction for proper RTL/LTR support
  document.body.dir = lang === "ar" ? "rtl" : "ltr";
  document.body.lang = lang;

  // Load translations
  loadTranslations(lang);

  // Update language switcher active state
  updateLangSwitcherActive();

  // Update all translatable elements
  updateAllTranslatableElements();

  // Remove transition class after animation completes
  setTimeout(() => {
    document.body.classList.remove("language-transitioning");
  }, 300);

  // Show a brief notification about language change
  const langName = lang === "ar" ? "العربية" : "English";
  showMessage(`${langName} - ${t("language_changed")}`, "info");
}

// Helper to get translation
function t(key) {
  try {
    const lang = localStorage.getItem("language") || "ar";
    if (!translations || !translations[lang]) {
      // Fallback to key if translations not loaded yet
      return key;
    }
    return translations[lang] && translations[lang][key]
      ? translations[lang][key]
      : key;
  } catch (error) {
    console.error("Translation error:", error);
    return key;
  }
}

// Helper to map backend Arabic validation messages to translation keys
function mapValidationMessage(message) {
  const arabicToKeyMap = {
    "اسم المستخدم يجب أن يحتوي على أحرف وأرقام وشرطة سفلية فقط":
      "validation.username_pattern",
    "اسم المستخدم يجب أن يكون على الأقل 3 أحرف": "validation.username_min",
    "اسم المستخدم يجب أن لا يتجاوز 50 حرف": "validation.username_max",
    "كلمة المرور يجب أن تكون على الأقل 6 أحرف": "validation.password_min",
    "البريد الإلكتروني يجب أن يكون صحيحاً": "validation.email_format",
    "الدور يجب أن يكون employee أو admin": "validation.role_invalid",
    "اسم المستخدم مطلوب": "validation.field_required",
    "كلمة المرور مطلوبة": "validation.field_required",
  };

  return arabicToKeyMap[message] || message;
}

// Initialize language system
(async () => {
  try {
    await loadTranslations("en");
    await loadTranslations("ar");
    const lang = localStorage.getItem("language") || "ar";
    setLanguage(lang);
  } catch (error) {
    console.error(t("console.error.language_system"), error);
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
