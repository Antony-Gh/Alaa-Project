// API Service for handling all HTTP communications
class ApiService {
    constructor() {
        this.baseURL = CONFIG.API.BASE_URL;
        this.timeout = CONFIG.API.TIMEOUT;
        this.retryAttempts = CONFIG.API.RETRY_ATTEMPTS;
    }

    // Generic HTTP request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: this.timeout
        };

        const requestOptions = { ...defaultOptions, ...options };

        // Add authorization header if token exists
        const token = this.getAuthToken();
        if (token) {
            requestOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, requestOptions);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return data;
            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx)
                if (error.message.includes('HTTP 4')) {
                    break;
                }
                
                // Wait before retrying (exponential backoff)
                if (attempt < this.retryAttempts) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }

        throw lastError;
    }

    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Authentication methods
    async login(credentials) {
        return this.post(CONFIG.API.ENDPOINTS.AUTH.LOGIN, credentials);
    }

    async register(userData) {
        return this.post(CONFIG.API.ENDPOINTS.AUTH.REGISTER, userData);
    }

    async logout() {
        try {
            await this.post(CONFIG.API.ENDPOINTS.AUTH.LOGOUT);
        } finally {
            this.clearAuthToken();
        }
    }

    // Appointment methods
    async getAppointments(filters = {}) {
        return this.get(CONFIG.API.ENDPOINTS.APPOINTMENTS.BASE, filters);
    }

    async getAppointmentsByStatus(status) {
        return this.get(CONFIG.API.ENDPOINTS.APPOINTMENTS.BY_STATUS(status));
    }

    async createAppointment(appointmentData) {
        return this.post(CONFIG.API.ENDPOINTS.APPOINTMENTS.BASE, appointmentData);
    }

    async updateAppointmentStatus(appointmentId, statusData) {
        return this.put(`${CONFIG.API.ENDPOINTS.APPOINTMENTS.BASE}/${appointmentId}/status`, statusData);
    }

    async deleteAppointment(appointmentId) {
        return this.delete(`${CONFIG.API.ENDPOINTS.APPOINTMENTS.BASE}/${appointmentId}`);
    }

    async getAppointmentStats() {
        return this.get(CONFIG.API.ENDPOINTS.APPOINTMENTS.STATS);
    }

    // Department methods
    async getDepartments() {
        return this.get(CONFIG.API.ENDPOINTS.DEPARTMENTS.BASE);
    }

    async createDepartment(departmentData) {
        return this.post(CONFIG.API.ENDPOINTS.DEPARTMENTS.BASE, departmentData);
    }

    async updateDepartment(departmentId, departmentData) {
        return this.put(`${CONFIG.API.ENDPOINTS.DEPARTMENTS.BASE}/${departmentId}`, departmentData);
    }

    async deleteDepartment(departmentId) {
        return this.delete(`${CONFIG.API.ENDPOINTS.DEPARTMENTS.BASE}/${departmentId}`);
    }

    async getDepartmentStats() {
        return this.get(CONFIG.API.ENDPOINTS.DEPARTMENTS.STATS);
    }

    // Location methods
    async getLocations() {
        return this.get(CONFIG.API.ENDPOINTS.LOCATIONS.BASE);
    }

    async getAvailableLocations(date, time) {
        return this.get(CONFIG.API.ENDPOINTS.LOCATIONS.AVAILABLE, { date, time });
    }

    async createLocation(locationData) {
        return this.post(CONFIG.API.ENDPOINTS.LOCATIONS.BASE, locationData);
    }

    async updateLocation(locationId, locationData) {
        return this.put(`${CONFIG.API.ENDPOINTS.LOCATIONS.BASE}/${locationId}`, locationData);
    }

    async deleteLocation(locationId) {
        return this.delete(`${CONFIG.API.ENDPOINTS.LOCATIONS.BASE}/${locationId}`);
    }

    async getLocationStats() {
        return this.get(CONFIG.API.ENDPOINTS.LOCATIONS.STATS);
    }

    // Token management
    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    setAuthToken(token) {
        localStorage.setItem('authToken', token);
    }

    clearAuthToken() {
        localStorage.removeItem('authToken');
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Health check
    async healthCheck() {
        try {
            const response = await fetch('/api/health');
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Create singleton instance
const apiService = new ApiService();

// Export for ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = apiService;
} else {
    // Make available globally for browser
    window.apiService = apiService;
} 