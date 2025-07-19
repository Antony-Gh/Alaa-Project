// Import utilities
import { 
    escapeHtml, 
    setTextContent, 
    setInnerHTML, 
    createElement, 
    sanitizeFormData,
    validateDateTime,
    validateEmployeeId,
    validateArabicText
} from './utils/sanitize.js';

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

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Check if user is already authenticated
        if (authToken) {
            await checkAuthStatus();
        } else {
            showAuthSection();
        }

        // Set up event listeners
        setupEventListeners();

        console.log('نظام حجز المواعيد جاهز للاستخدام');
    } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
        showMessage('حدث خطأ في تحميل البيانات', 'error');
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
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });

    // Admin form status change
    document.getElementById('statusSelect').addEventListener('change', handleStatusChange);
}

// Authentication functions
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
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
    } catch (error) {
        console.error('Error checking auth status:', error);
        localStorage.removeItem('authToken');
        authToken = null;
        showAuthSection();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const loginData = sanitizeFormData(new FormData(loginForm));

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();
        
        if (response.ok) {
            authToken = result.data.token;
            currentUser = result.data.user;
            localStorage.setItem('authToken', authToken);
            
            showMessage('login_success', 'success');
            showAppSection();
            await loadInitialData();
        } else {
            if (result.errors) {
                showApiErrors(result.errors);
            }
            showMessage(result.message || 'login_failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('server_error', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const registerData = sanitizeFormData(new FormData(registerForm));

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
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
            if (result.errors) {
                showApiErrors(result.errors);
            }
            showMessage(result.message || 'register_failed', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showMessage('server_error', 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showAuthSection();
    showMessage('logout_success', 'info');
}

function showAuthSection() {
    authSection.style.display = 'block';
    appSection.style.display = 'none';
}

function showAppSection() {
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    
    // Update user info
    if (currentUser) {
        setTextContent(userDisplayName, `مرحباً ${currentUser.username}`);
        setTextContent(userRole, currentUser.role === 'admin' ? 'مدير' : 'موظف');
        
        // Show/hide admin tab based on role
        if (currentUser.role === 'admin') {
            adminTab.style.display = 'inline-flex';
        } else {
            adminTab.style.display = 'none';
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
    if (profileData.department_id) profileData.department_id = parseInt(profileData.department_id);

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showMessage('profile_update_success', 'success');
            currentUser = { ...currentUser, ...result.data };
        } else {
            showMessage(result.message || 'profile_update_failed', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
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
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(passwordData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showMessage('password_change_success', 'success');
            changePasswordForm.reset();
        } else {
            showMessage(result.message || 'password_change_failed', 'error');
        }
    } catch (error) {
        console.error('Password change error:', error);
        showMessage('server_error', 'error');
    }
}

// Data loading functions
async function loadInitialData() {
    try {
        // Load departments and locations
        await Promise.all([
            loadDepartments(),
            loadLocations()
        ]);

        // Load appointments
        await loadAppointments();

        // Load dashboard stats
        await loadDashboardStats();

        // Load user profile data
        await loadUserProfile();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showMessage('data_loading_error', 'error');
    }
}

async function loadUserProfile() {
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            const user = result.data;
            
            // Populate profile form
            setTextContent(document.getElementById('profileUsername'), user.username);
            setTextContent(document.getElementById('profileEmail'), user.email || '');
            
            // Set department if available
            if (user.department_id) {
                document.getElementById('profileDepartment').value = user.department_id;
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
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
        console.error('خطأ في تحميل الأقسام:', error);
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
        console.error('خطأ في تحميل المواقع:', error);
    }
}

async function loadAppointments() {
    try {
        const response = await fetch('/api/appointments', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const result = await response.json();
        
        if (response.ok) {
            appointments = result.data || result;
        displayMyAppointments();
        }
    } catch (error) {
        console.error('خطأ في تحميل المواعيد:', error);
    }
}

async function loadAdminAppointments() {
    try {
        const response = await fetch('/api/appointments', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const result = await response.json();
        
        if (response.ok) {
            appointments = result.data || result;
        displayAdminAppointments();
        }
    } catch (error) {
        console.error('خطأ في تحميل مواعيد الإدارة:', error);
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/appointments/stats', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const result = await response.json();
        
        if (response.ok) {
            const stats = result.data || result;
            updateDashboardStats(stats.stats || stats);
            displayRecentAppointments(stats.recentAppointments || []);
        }
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// Populate form selects
function populateDepartmentSelect() {
    const select = document.getElementById('department');
    const profileSelect = document.getElementById('profileDepartment');
    
    const options = departments.map(dept => 
        `<option value="${dept.id}">${escapeHtml(dept.name)}</option>`
    ).join('');
    
    select.innerHTML = `<option value="">${escapeHtml(t('select_department'))}</option>` + options;
    profileSelect.innerHTML = `<option value="">${escapeHtml(t('select_department'))}</option>` + options;
}

function populateLocationSelect() {
    const select = document.getElementById('location');
    
    const options = locations.map(loc => 
        `<option value="${loc.id}">${escapeHtml(loc.name)} (${loc.capacity} شخص)</option>`
    ).join('');
    
    select.innerHTML = `<option value="">${escapeHtml(t('select_location'))}</option>` + options;
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
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(appointmentData)
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
        console.error('خطأ في إرسال الطلب:', error);
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
            message: 'title_validation_length'
        };
    }

    // Validate date and time
    const dateTimeValidation = validateDateTime(data.requested_date, data.requested_time);
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
        admin_notes: adminNotes
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
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(updateDataToSend)
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
        console.error('خطأ في تحديث الحالة:', error);
        showMessage('server_error', 'error');
    }
}

// Display functions with XSS protection
function displayMyAppointments() {
    const container = document.getElementById('myAppointmentsList');
    
    if (appointments.length === 0) {
        setInnerHTML(container, `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${t('no_appointments')}</h3>
                <p>${t('start_booking')}</p>
            </div>
        `);
        return;
    }

    const appointmentCards = appointments
        .filter(apt => apt.employee_id === currentUser.username || currentUser.role === 'admin')
        .map(appointment => createAppointmentCard(appointment, false))
        .join('');

    setInnerHTML(container, appointmentCards);
}

function displayAdminAppointments() {
    const container = document.getElementById('adminAppointmentsList');
    
    if (appointments.length === 0) {
        setInnerHTML(container, `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${t('no_appointments')}</h3>
                <p>${t('no_appointments_created')}</p>
            </div>
        `);
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
        setInnerHTML(container, `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>${t('no_recent_appointments')}</h3>
            </div>
        `);
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
                    <div class="appointment-title">${escapeHtml(appointment.title)}</div>
                    <span class="appointment-status ${statusClass}">${escapeHtml(statusText)}</span>
                </div>
                ${isAdmin ? `
                    <button class="btn btn-primary" onclick="openAdminModal('${appointment.id}')">
                        <i class="fas fa-edit"></i> ${t('update_status')}
                    </button>
                ` : ''}
            </div>
            
            <div class="appointment-details">
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span class="detail-label">${t('employee')}:</span>
                    <span class="detail-value">${escapeHtml(appointment.employee_name)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-building"></i>
                    <span class="detail-label">${t('department')}:</span>
                    <span class="detail-value">${escapeHtml(department ? department.name : t('not_specified'))}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="detail-label">${t('location')}:</span>
                    <span class="detail-value">${escapeHtml(location ? location.name : t('not_specified'))}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span class="detail-label">${t('requested_date')}:</span>
                    <span class="detail-value">${formatDate(appointment.requested_date)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span class="detail-label">${t('requested_time')}:</span>
                    <span class="detail-value">${escapeHtml(appointment.requested_time)}</span>
                </div>
                ${appointment.approved_date ? `
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        <span class="detail-label">${t('approved_date')}:</span>
                        <span class="detail-value">${formatDate(appointment.approved_date)}</span>
                    </div>
                ` : ''}
                ${appointment.approved_time ? `
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        <span class="detail-label">${t('approved_time')}:</span>
                        <span class="detail-value">${escapeHtml(appointment.approved_time)}</span>
                    </div>
                ` : ''}
            </div>
            
            ${appointment.description ? `
                <div class="detail-item">
                    <i class="fas fa-info-circle"></i>
                    <span class="detail-label">${t('description')}:</span>
                    <span class="detail-value">${escapeHtml(appointment.description)}</span>
                </div>
            ` : ''}
            
            ${appointment.rejection_reason ? `
                <div class="detail-item">
                    <i class="fas fa-times-circle"></i>
                    <span class="detail-label">${t('rejection_reason')}:</span>
                    <span class="detail-value">${escapeHtml(appointment.rejection_reason)}</span>
                </div>
            ` : ''}
            
            ${appointment.admin_notes ? `
                <div class="detail-item">
                    <i class="fas fa-sticky-note"></i>
                    <span class="detail-label">${t('admin_notes')}:</span>
                    <span class="detail-value">${escapeHtml(appointment.admin_notes)}</span>
                </div>
            ` : ''}
            
            <div class="appointment-actions">
                <button class="btn btn-primary" onclick="viewAppointmentDetails('${appointment.id}')">
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
    
    const filteredAppointments = appointments.filter(apt => apt.status === status);
    
    if (filteredAppointments.length === 0) {
        setInnerHTML(container, `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h3>${t('no_appointments_with_status')}</h3>
                <p>${t('no_appointments_with_status_message', { status: t(getStatusText(status)) })}</p>
            </div>
        `);
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
    document.getElementById('rejectionReason').value = appointment.rejection_reason || '';
    
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
                <span class="detail-value">${escapeHtml(appointment.employee_name)}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-id-card"></i>
                <span class="detail-label">${t('employee_id')}:</span>
                <span class="detail-value">${escapeHtml(appointment.employee_id)}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-building"></i>
                <span class="detail-label">${t('department')}:</span>
                <span class="detail-value">${escapeHtml(department ? department.name : t('not_specified'))}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <span class="detail-label">${t('location')}:</span>
                <span class="detail-value">${escapeHtml(location ? location.name : t('not_specified'))}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-calendar"></i>
                <span class="detail-label">${t('requested_date')}:</span>
                <span class="detail-value">${formatDate(appointment.requested_date)}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-clock"></i>
                <span class="detail-label">${t('requested_time')}:</span>
                <span class="detail-value">${escapeHtml(appointment.requested_time)}</span>
            </div>
            ${appointment.description ? `
                <div class="detail-item">
                    <i class="fas fa-info-circle"></i>
                    <span class="detail-label">${t('description')}:</span>
                    <span class="detail-value">${escapeHtml(appointment.description)}</span>
                </div>
            ` : ''}
            <div class="detail-item">
                <i class="fas fa-calendar-check"></i>
                <span class="detail-label">${t('created_at')}:</span>
                <span class="detail-value">${formatDateTime(appointment.created_at)}</span>
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
        'pending': 'pending_status',
        'approved': 'approved_status',
        'rejected': 'rejected_status',
        'done': 'done_status',
        'missed': 'missed_status'
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
  const res = await fetch(`/main/${lang}.json`);
  translations[lang] = await res.json();
}

function setLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  // Update all UI text
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = translations[lang][key] || key;
  });
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = translations[lang][key] || key;
  });
  // Update button values if needed
  document.querySelectorAll('button[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.title = translations[lang][key] || key;
  });
  localStorage.setItem('lang', lang);
  // If logged in, update user profile language
  if (window.currentUser) {
    fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body: JSON.stringify({ language: lang })
    });
  }
}

// Refactor showMessage to use translation keys and support error-list inside error message
function showMessage(message, type = 'info') {
  // Remove existing messages
  const existingMessages = document.querySelectorAll('.message');
  existingMessages.forEach(msg => msg.remove());
  // Translate message if it's a key
  const msgText = translations[localStorage.getItem('lang') || 'ar'][message] || message;
  // Create new message
  const messageDiv = createElement('div', {
    className: `message ${type}`
  }, msgText);
  // If error-list exists, move it inside the error message
  if (type === 'error') {
    let errorList = document.getElementById('error-list');
    if (errorList) {
      messageDiv.appendChild(errorList);
      errorList.style.display = 'block';
    }
  }
  // Insert at the top of the container
  const container = document.querySelector('.container');
  container.insertBefore(messageDiv, container.firstChild);
  // Auto remove after 5 seconds (except for error with error-list)
  if (!(type === 'error' && document.getElementById('error-list'))) {
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }
}

// Refactor showApiErrors to use translation keys and always show inside .message error
function showApiErrors(errors) {
  let errorList = document.getElementById('error-list');
  if (!errorList) {
    errorList = document.createElement('ul');
    errorList.id = 'error-list';
    errorList.style.color = 'red';
    errorList.style.margin = '10px 0';
  }
  errorList.innerHTML = '';
  if (Array.isArray(errors)) {
    errors.forEach(err => {
      const li = document.createElement('li');
      // Translate error message if it's a key
      li.textContent = t(err.message);
      errorList.appendChild(li);
      // Optionally highlight the field
      if (err.field) {
        const field = document.querySelector(`[name="${err.field}"]`);
        if (field) {
          field.style.borderColor = 'red';
        }
      }
    });
    errorList.style.display = 'block';
    // Always show error-list inside a .message error
    showMessage('error.validation', 'error');
  } else {
    errorList.style.display = 'none';
  }
}

// Modern language switcher with flags and better UX
function createModernLangSwitcher() {
  let langSwitcher = document.getElementById('lang-switch');
  if (langSwitcher) langSwitcher.remove();
  // Create a modern dropdown
  const switcher = document.createElement('div');
  switcher.id = 'lang-switch';
  switcher.style.display = 'flex';
  switcher.style.alignItems = 'center';
  switcher.style.gap = '8px';
  switcher.style.position = 'absolute';
  switcher.style.top = '16px';
  switcher.style.right = '24px';
  switcher.style.zIndex = '1000';
  // Language options
  const langs = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' }
  ];
  langs.forEach(lang => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${lang.flag} ${lang.label}`;
    btn.style.background = 'none';
    btn.style.border = 'none';
    btn.style.fontSize = '1rem';
    btn.style.cursor = 'pointer';
    btn.style.padding = '4px 8px';
    btn.style.borderRadius = '6px';
    btn.style.transition = 'background 0.2s';
    btn.setAttribute('data-lang', lang.code);
    btn.onclick = () => setLanguage(lang.code);
    switcher.appendChild(btn);
  });
  document.body.prepend(switcher);
  updateLangSwitcherActive();
}

function updateLangSwitcherActive() {
  const lang = localStorage.getItem('lang') || 'ar';
  document.querySelectorAll('#lang-switch button').forEach(btn => {
    if (btn.getAttribute('data-lang') === lang) {
      btn.style.background = '#007bff';
      btn.style.color = '#fff';
      btn.style.fontWeight = 'bold';
    } else {
      btn.style.background = 'none';
      btn.style.color = '#222';
      btn.style.fontWeight = 'normal';
    }
  });
}

// Patch setLanguage to update switcher
const _originalSetLanguage = setLanguage;
setLanguage = function(lang) {
  _originalSetLanguage(lang);
  updateLangSwitcherActive();
};

// On load, create modern language switcher
createModernLangSwitcher();

// On load, set language
(async () => {
  await loadTranslations('en');
  await loadTranslations('ar');
  const lang = localStorage.getItem('lang') || 'ar';
  document.getElementById('lang-switch').value = lang;
  setLanguage(lang);
})();

// Helper to get translation
function t(key) {
  const lang = localStorage.getItem('lang') || 'ar';
  return translations[lang][key] || key;
}

// Example usage in a form submit handler:
// fetch('/api/auth/register', { ... })
//   .then(res => res.json())
//   .then(data => {
//     if (!data.success && data.errors) {
//       showApiErrors(data.errors);
//     }
//   });
