// Main Application Entry Point
// This file orchestrates all the modular components

// Import all modules
import { CONFIG } from './config/config.js';
import { apiService } from './api/apiService.js';
import { validators } from './validation/validators.js';
import { i18n, t } from './utils/i18n.js';
import { Helpers } from './utils/helpers.js';
import { 
    escapeHtml, 
    sanitizeFormData, 
    validateDateTime, 
    validateEmployeeId, 
    validateArabicText 
} from './utils/sanitize.js';

// Application state
const AppState = {
    currentUser: null,
    departments: [],
    locations: [],
    appointments: [],
    currentTab: 'employee',
    isLoading: false
};

// Main Application Class
class App {
    constructor() {
        this.state = AppState;
        this.initialize();
    }

    // Initialize the application
    async initialize() {
        try {
            console.log('🚀 Initializing Employee Scheduling System...');
            
            // Initialize i18n first
            await i18n.initialize();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check authentication status
            await this.checkAuthStatus();
            
            // Setup form validation
            validators.setupFormValidation();
            
            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            showMessage(t('error.initialization_failed'), 'error');
        }
    }

    // Setup all event listeners
    setupEventListeners() {
        // Authentication form listeners
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // Auth tab switching
        const authTabButtons = document.querySelectorAll('.auth-tab-btn');
        authTabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-auth');
                this.switchAuthTab(tabName);
            });
        });

        // Appointment form
        const appointmentForm = document.getElementById('appointmentForm');
        if (appointmentForm) {
            appointmentForm.addEventListener('submit', this.handleAppointmentSubmit.bind(this));
        }

        // Admin form
        const adminForm = document.getElementById('adminForm');
        if (adminForm) {
            adminForm.addEventListener('submit', this.handleAdminFormSubmit.bind(this));
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterAppointments(e.target.value);
            });
        }
    }

    // Check authentication status
    async checkAuthStatus() {
        try {
            const token = apiService.getAuthToken();
            if (!token) {
                this.showAuthSection();
                return;
            }

            // Verify token with backend
            const response = await apiService.get('/auth/verify');
            if (response.user) {
                this.state.currentUser = response.user;
                this.showAppSection();
                await this.loadInitialData();
            } else {
                this.showAuthSection();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showAuthSection();
        }
    }

    // Handle login
    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = sanitizeFormData(formData);

        try {
            Helpers.showLoading(form.querySelector('button[type="submit"]'));
            
            const response = await apiService.login(data);
            
            if (response.token) {
                apiService.setAuthToken(response.token);
                this.state.currentUser = response.user;
                this.showAppSection();
                await this.loadInitialData();
                showMessage(t('auth.login_success'), 'success');
            }
        } catch (error) {
            console.error('Login failed:', error);
            showMessage(error.message || t('auth.login_failed'), 'error');
        } finally {
            Helpers.hideLoading(form.querySelector('button[type="submit"]'));
        }
    }

    // Handle register
    async handleRegister(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = sanitizeFormData(formData);

        try {
            Helpers.showLoading(form.querySelector('button[type="submit"]'));
            
            const response = await apiService.register(data);
            
            if (response.token) {
                apiService.setAuthToken(response.token);
                this.state.currentUser = response.user;
                this.showAppSection();
                await this.loadInitialData();
                showMessage(t('auth.register_success'), 'success');
            }
        } catch (error) {
            console.error('Registration failed:', error);
            showMessage(error.message || t('auth.register_failed'), 'error');
        } finally {
            Helpers.hideLoading(form.querySelector('button[type="submit"]'));
        }
    }

    // Handle logout
    async handleLogout() {
        try {
            await apiService.logout();
            this.state.currentUser = null;
            this.showAuthSection();
            showMessage(t('auth.logout_success'), 'success');
        } catch (error) {
            console.error('Logout failed:', error);
            // Force logout even if API call fails
            this.state.currentUser = null;
            this.showAuthSection();
        }
    }

    // Show authentication section
    showAuthSection() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('app-section').classList.add('app-section-hidden');
    }

    // Show application section
    showAppSection() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('app-section').classList.remove('app-section-hidden');
        
        // Update user info
        if (this.state.currentUser) {
            const userDisplayName = document.getElementById('userDisplayName');
            const userRole = document.getElementById('userRole');
            
            if (userDisplayName) {
                userDisplayName.textContent = t('welcome_user', { name: this.state.currentUser.username });
            }
            
            if (userRole) {
                userRole.textContent = t(`role.${this.state.currentUser.role}`);
            }
        }
    }

    // Switch authentication tab
    switchAuthTab(tabName) {
        const authTabs = document.querySelectorAll('.auth-tab-btn');
        const authContents = document.querySelectorAll('.auth-content');
        
        authTabs.forEach(tab => tab.classList.remove('active'));
        authContents.forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-auth="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-content`).classList.add('active');
    }

    // Load initial data
    async loadInitialData() {
        try {
            this.state.isLoading = true;
            
            await Promise.all([
                this.loadDepartments(),
                this.loadLocations(),
                this.loadAppointments()
            ]);
            
            this.populateSelects();
            this.displayAppointments();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            showMessage(t('error.data_load_failed'), 'error');
        } finally {
            this.state.isLoading = false;
        }
    }

    // Load departments
    async loadDepartments() {
        try {
            const departments = await apiService.getDepartments();
            this.state.departments = departments;
        } catch (error) {
            console.error('Failed to load departments:', error);
        }
    }

    // Load locations
    async loadLocations() {
        try {
            const locations = await apiService.getLocations();
            this.state.locations = locations;
        } catch (error) {
            console.error('Failed to load locations:', error);
        }
    }

    // Load appointments
    async loadAppointments() {
        try {
            const appointments = await apiService.getAppointments();
            this.state.appointments = appointments;
        } catch (error) {
            console.error('Failed to load appointments:', error);
        }
    }

    // Populate select dropdowns
    populateSelects() {
        this.populateDepartmentSelect();
        this.populateLocationSelect();
    }

    // Populate department select
    populateDepartmentSelect() {
        const select = document.getElementById('departmentSelect');
        if (!select) return;

        select.innerHTML = '<option value="">' + t('select_department') + '</option>';
        
        this.state.departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });
    }

    // Populate location select
    populateLocationSelect() {
        const select = document.getElementById('locationSelect');
        if (!select) return;

        select.innerHTML = '<option value="">' + t('select_location') + '</option>';
        
        this.state.locations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc.id;
            option.textContent = loc.name;
            select.appendChild(option);
        });
    }

    // Handle appointment submission
    async handleAppointmentSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = sanitizeFormData(formData);

        // Validate appointment data
        const validation = validators.validateAppointmentData(data);
        if (!validation.isValid) {
            showApiErrors(validation.errors);
            return;
        }

        try {
            Helpers.showLoading(form.querySelector('button[type="submit"]'));
            
            const response = await apiService.createAppointment(data);
            
            showMessage(t('appointment.created_success'), 'success');
            form.reset();
            
            // Reload appointments
            await this.loadAppointments();
            this.displayAppointments();
            
        } catch (error) {
            console.error('Appointment creation failed:', error);
            showMessage(error.message || t('appointment.creation_failed'), 'error');
        } finally {
            Helpers.hideLoading(form.querySelector('button[type="submit"]'));
        }
    }

    // Handle admin form submission
    async handleAdminFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const data = sanitizeFormData(formData);
        const appointmentId = form.getAttribute('data-appointment-id');

        try {
            Helpers.showLoading(form.querySelector('button[type="submit"]'));
            
            await apiService.updateAppointmentStatus(appointmentId, data);
            
            showMessage(t('appointment.status_updated'), 'success');
            this.closeModals();
            
            // Reload appointments
            await this.loadAppointments();
            this.displayAppointments();
            
        } catch (error) {
            console.error('Status update failed:', error);
            showMessage(error.message || t('appointment.status_update_failed'), 'error');
        } finally {
            Helpers.hideLoading(form.querySelector('button[type="submit"]'));
        }
    }

    // Display appointments
    displayAppointments() {
        if (this.state.currentUser?.role === 'admin') {
            this.displayAdminAppointments();
        } else {
            this.displayMyAppointments();
        }
    }

    // Display user's appointments
    displayMyAppointments() {
        const container = document.getElementById('myAppointments');
        if (!container) return;

        const userAppointments = this.state.appointments.filter(
            apt => apt.employee_id === this.state.currentUser?.username
        );

        container.innerHTML = '';
        
        if (userAppointments.length === 0) {
            container.innerHTML = '<p class="no-data">' + t('appointment.no_appointments') + '</p>';
            return;
        }

        userAppointments.forEach(appointment => {
            const card = this.createAppointmentCard(appointment);
            container.appendChild(card);
        });
    }

    // Display admin appointments
    displayAdminAppointments() {
        const container = document.getElementById('adminAppointments');
        if (!container) return;

        container.innerHTML = '';
        
        if (this.state.appointments.length === 0) {
            container.innerHTML = '<p class="no-data">' + t('appointment.no_appointments') + '</p>';
            return;
        }

        this.state.appointments.forEach(appointment => {
            const card = this.createAppointmentCard(appointment, true);
            container.appendChild(card);
        });
    }

    // Create appointment card
    createAppointmentCard(appointment, isAdmin = false) {
        const card = document.createElement('div');
        card.className = 'appointment-card';
        card.setAttribute('data-appointment-id', appointment.id);

        const statusClass = Helpers.getStatusColor(appointment.status);
        const statusText = Helpers.getStatusText(appointment.status);

        card.innerHTML = `
            <div class="card-header">
                <h3>${escapeHtml(appointment.title)}</h3>
                <span class="status ${statusClass}">${statusText}</span>
            </div>
            <div class="card-body">
                <p><strong>${t('employee_name')}:</strong> ${escapeHtml(appointment.employee_name)}</p>
                <p><strong>${t('employee_id')}:</strong> ${escapeHtml(appointment.employee_id)}</p>
                <p><strong>${t('department')}:</strong> ${escapeHtml(appointment.department_name || '')}</p>
                <p><strong>${t('location')}:</strong> ${escapeHtml(appointment.location_name || '')}</p>
                <p><strong>${t('date')}:</strong> ${Helpers.formatDate(appointment.requested_date)}</p>
                <p><strong>${t('time')}:</strong> ${appointment.requested_time}</p>
                ${appointment.description ? `<p><strong>${t('description')}:</strong> ${escapeHtml(appointment.description)}</p>` : ''}
            </div>
            <div class="card-actions">
                ${isAdmin ? `
                    <button class="btn btn-primary" onclick="app.openAdminModal('${appointment.id}')">
                        <i class="fas fa-edit"></i> ${t('update_status')}
                    </button>
                ` : ''}
                <button class="btn btn-secondary" onclick="app.viewAppointmentDetails('${appointment.id}')">
                    <i class="fas fa-eye"></i> ${t('view_details')}
                </button>
            </div>
        `;

        return card;
    }

    // Switch tabs
    switchTab(tabName) {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        this.state.currentTab = tabName;
        
        if (tabName === 'admin') {
            this.displayAdminAppointments();
        } else if (tabName === 'employee') {
            this.displayMyAppointments();
        }
    }

    // Filter appointments by status
    filterAppointments(status) {
        if (status === 'all') {
            this.displayAppointments();
            return;
        }

        const filteredAppointments = this.state.appointments.filter(
            apt => apt.status === status
        );

        const container = document.getElementById(this.state.currentTab === 'admin' ? 'adminAppointments' : 'myAppointments');
        if (!container) return;

        container.innerHTML = '';
        
        if (filteredAppointments.length === 0) {
            container.innerHTML = '<p class="no-data">' + t('appointment.no_appointments_filtered') + '</p>';
            return;
        }

        filteredAppointments.forEach(appointment => {
            const card = this.createAppointmentCard(appointment, this.state.currentTab === 'admin');
            container.appendChild(card);
        });
    }

    // Open admin modal
    openAdminModal(appointmentId) {
        const modal = document.getElementById('adminModal');
        const form = document.getElementById('adminForm');
        
        if (modal && form) {
            form.setAttribute('data-appointment-id', appointmentId);
            modal.classList.add('show');
        }
    }

    // View appointment details
    viewAppointmentDetails(appointmentId) {
        const appointment = this.state.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) return;

        const modal = document.getElementById('detailsModal');
        if (!modal) return;

        const statusClass = Helpers.getStatusColor(appointment.status);
        const statusText = Helpers.getStatusText(appointment.status);

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${escapeHtml(appointment.title)}</h2>
                    <button class="close-btn" onclick="app.closeModals()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="detail-row">
                        <strong>${t('status')}:</strong>
                        <span class="status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="detail-row">
                        <strong>${t('employee_name')}:</strong>
                        <span>${escapeHtml(appointment.employee_name)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>${t('employee_id')}:</strong>
                        <span>${escapeHtml(appointment.employee_id)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>${t('department')}:</strong>
                        <span>${escapeHtml(appointment.department_name || '')}</span>
                    </div>
                    <div class="detail-row">
                        <strong>${t('location')}:</strong>
                        <span>${escapeHtml(appointment.location_name || '')}</span>
                    </div>
                    <div class="detail-row">
                        <strong>${t('date')}:</strong>
                        <span>${Helpers.formatDate(appointment.requested_date)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>${t('time')}:</strong>
                        <span>${appointment.requested_time}</span>
                    </div>
                    ${appointment.description ? `
                        <div class="detail-row">
                            <strong>${t('description')}:</strong>
                            <span>${escapeHtml(appointment.description)}</span>
                        </div>
                    ` : ''}
                    ${appointment.admin_notes ? `
                        <div class="detail-row">
                            <strong>${t('admin_notes')}:</strong>
                            <span>${escapeHtml(appointment.admin_notes)}</span>
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <strong>${t('created_at')}:</strong>
                        <span>${Helpers.formatDateTime(appointment.created_at)}</span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="app.closeModals()">${t('close')}</button>
                </div>
            </div>
        `;

        modal.classList.add('show');
    }

    // Close all modals
    closeModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => modal.classList.remove('show'));
    }
}

// Global message functions
function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    if (!container) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.innerHTML = `
        <span class="message-text">${escapeHtml(message)}</span>
        <button class="message-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(messageElement);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentElement) {
            messageElement.remove();
        }
    }, CONFIG.UI.MESSAGE_DISPLAY_TIME);
}

function showApiErrors(errors) {
    if (typeof errors === 'string') {
        showMessage(errors, 'error');
        return;
    }

    if (typeof errors === 'object') {
        Object.values(errors).forEach(error => {
            showMessage(error, 'error');
        });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
} else {
    // Make available globally for browser
    window.App = App;
} 