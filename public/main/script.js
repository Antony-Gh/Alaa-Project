// Global variables
let departments = [];
let locations = [];
let appointments = [];
let currentEmployeeId = null;

// DOM elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const appointmentForm = document.getElementById('appointmentForm');
const adminForm = document.getElementById('adminForm');
const statusBtns = document.querySelectorAll('.status-btn');
const appointmentModal = document.getElementById('appointmentModal');
const adminModal = document.getElementById('adminModal');
const modalContent = document.getElementById('modalContent');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Load departments and locations
        await Promise.all([
            loadDepartments(),
            loadLocations()
        ]);

        // Load appointments
        await loadAppointments();

        // Set up event listeners
        setupEventListeners();

        // Load dashboard stats
        await loadDashboardStats();

        console.log('نظام حجز المواعيد جاهز للاستخدام');
    } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
        showMessage('حدث خطأ في تحميل البيانات', 'error');
    }
}

function setupEventListeners() {
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

// API Functions
async function loadDepartments() {
    try {
        const response = await fetch('/api/departments');
        departments = await response.json();
        populateDepartmentSelect();
    } catch (error) {
        console.error('خطأ في تحميل الأقسام:', error);
    }
}

async function loadLocations() {
    try {
        const response = await fetch('/api/locations');
        locations = await response.json();
        populateLocationSelect();
    } catch (error) {
        console.error('خطأ في تحميل المواقع:', error);
    }
}

async function loadAppointments() {
    try {
        const response = await fetch('/api/appointments');
        appointments = await response.json();
        displayMyAppointments();
    } catch (error) {
        console.error('خطأ في تحميل المواعيد:', error);
    }
}

async function loadAdminAppointments() {
    try {
        const response = await fetch('/api/appointments');
        appointments = await response.json();
        displayAdminAppointments();
    } catch (error) {
        console.error('خطأ في تحميل مواعيد الإدارة:', error);
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/appointments/stats');
        const stats = await response.json();
        updateDashboardStats(stats);
        displayRecentAppointments();
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// Populate form selects
function populateDepartmentSelect() {
    const select = document.getElementById('department');
    select.innerHTML = '<option value="">اختر القسم</option>';
    
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.id;
        option.textContent = dept.name;
        select.appendChild(option);
    });
}

function populateLocationSelect() {
    const select = document.getElementById('location');
    select.innerHTML = '<option value="">اختر الموقع</option>';
    
    locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc.id;
        option.textContent = `${loc.name} (${loc.capacity} شخص)`;
        select.appendChild(option);
    });
}

// Form handling
async function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(appointmentForm);
    const appointmentData = {
        employee_name: formData.get('employeeName') || document.getElementById('employeeName').value,
        employee_id: formData.get('employeeId') || document.getElementById('employeeId').value,
        department_id: parseInt(document.getElementById('department').value),
        location_id: parseInt(document.getElementById('location').value),
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        requested_date: document.getElementById('requestedDate').value,
        requested_time: document.getElementById('requestedTime').value
    };

    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showMessage('تم إرسال طلب الموعد بنجاح', 'success');
            appointmentForm.reset();
            await loadAppointments();
        } else {
            showMessage(result.error || 'حدث خطأ في إرسال الطلب', 'error');
        }
    } catch (error) {
        console.error('خطأ في إرسال الطلب:', error);
        showMessage('حدث خطأ في الاتصال بالخادم', 'error');
    }
}

async function handleAdminFormSubmit(e) {
    e.preventDefault();
    
    const appointmentId = document.getElementById('appointmentId').value;
    const status = document.getElementById('statusSelect').value;
    const adminNotes = document.getElementById('adminNotes').value;
    
    let updateData = {
        status: status,
        admin_notes: adminNotes
    };

    // Add specific fields based on status
    if (status === 'approved') {
        updateData.approved_date = document.getElementById('approvedDate').value;
        updateData.approved_time = document.getElementById('approvedTime').value;
    } else if (status === 'rejected') {
        updateData.rejection_reason = document.getElementById('rejectionReason').value;
    }

    try {
        const response = await fetch(`/api/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showMessage('تم تحديث حالة الموعد بنجاح', 'success');
            closeModals();
            await loadAdminAppointments();
            await loadDashboardStats();
        } else {
            showMessage(result.error || 'حدث خطأ في تحديث الحالة', 'error');
        }
    } catch (error) {
        console.error('خطأ في تحديث الحالة:', error);
        showMessage('حدث خطأ في الاتصال بالخادم', 'error');
    }
}

// Display functions
function displayMyAppointments() {
    const container = document.getElementById('myAppointmentsList');
    
    if (appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>لا توجد مواعيد</h3>
                <p>قم بحجز موعد جديد للبدء</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appointments
        .filter(apt => apt.employee_id === currentEmployeeId || !currentEmployeeId)
        .map(appointment => createAppointmentCard(appointment, false))
        .join('');
}

function displayAdminAppointments() {
    const container = document.getElementById('adminAppointmentsList');
    
    if (appointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>لا توجد مواعيد</h3>
                <p>لم يتم إنشاء أي مواعيد بعد</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appointments
        .map(appointment => createAppointmentCard(appointment, true))
        .join('');
}

function displayRecentAppointments() {
    const container = document.getElementById('recentAppointmentsList');
    const recentAppointments = appointments.slice(0, 5);
    
    if (recentAppointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>لا توجد مواعيد حديثة</h3>
            </div>
        `;
        return;
    }

    container.innerHTML = recentAppointments
        .map(appointment => createAppointmentCard(appointment, false))
        .join('');
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
                    <div class="appointment-title">${appointment.title}</div>
                    <span class="appointment-status ${statusClass}">${statusText}</span>
                </div>
                ${isAdmin ? `
                    <button class="btn btn-primary" onclick="openAdminModal('${appointment.id}')">
                        <i class="fas fa-edit"></i> تحديث الحالة
                    </button>
                ` : ''}
            </div>
            
            <div class="appointment-details">
                <div class="detail-item">
                    <i class="fas fa-user"></i>
                    <span class="detail-label">الموظف:</span>
                    <span class="detail-value">${appointment.employee_name}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-building"></i>
                    <span class="detail-label">القسم:</span>
                    <span class="detail-value">${department ? department.name : 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="detail-label">الموقع:</span>
                    <span class="detail-value">${location ? location.name : 'غير محدد'}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-calendar"></i>
                    <span class="detail-label">التاريخ المطلوب:</span>
                    <span class="detail-value">${formatDate(appointment.requested_date)}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span class="detail-label">الوقت المطلوب:</span>
                    <span class="detail-value">${appointment.requested_time}</span>
                </div>
                ${appointment.approved_date ? `
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        <span class="detail-label">التاريخ المعتمد:</span>
                        <span class="detail-value">${formatDate(appointment.approved_date)}</span>
                    </div>
                ` : ''}
                ${appointment.approved_time ? `
                    <div class="detail-item">
                        <i class="fas fa-check-circle"></i>
                        <span class="detail-label">الوقت المعتمد:</span>
                        <span class="detail-value">${appointment.approved_time}</span>
                    </div>
                ` : ''}
            </div>
            
            ${appointment.description ? `
                <div class="detail-item">
                    <i class="fas fa-info-circle"></i>
                    <span class="detail-label">الوصف:</span>
                    <span class="detail-value">${appointment.description}</span>
                </div>
            ` : ''}
            
            ${appointment.rejection_reason ? `
                <div class="detail-item">
                    <i class="fas fa-times-circle"></i>
                    <span class="detail-label">سبب الرفض:</span>
                    <span class="detail-value">${appointment.rejection_reason}</span>
                </div>
            ` : ''}
            
            ${appointment.admin_notes ? `
                <div class="detail-item">
                    <i class="fas fa-sticky-note"></i>
                    <span class="detail-label">ملاحظات الإدارة:</span>
                    <span class="detail-value">${appointment.admin_notes}</span>
                </div>
            ` : ''}
            
            <div class="appointment-actions">
                <button class="btn btn-primary" onclick="viewAppointmentDetails('${appointment.id}')">
                    <i class="fas fa-eye"></i> عرض التفاصيل
                </button>
            </div>
        </div>
    `;
    
    return card;
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
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h3>لا توجد مواعيد بهذه الحالة</h3>
                <p>لا توجد مواعيد بحالة "${getStatusText(status)}"</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredAppointments
        .map(appointment => createAppointmentCard(appointment, true))
        .join('');
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
    
    modalContent.innerHTML = `
        <h2>تفاصيل الموعد</h2>
        <div class="appointment-details">
            <div class="detail-item">
                <i class="fas fa-user"></i>
                <span class="detail-label">الموظف:</span>
                <span class="detail-value">${appointment.employee_name}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-id-card"></i>
                <span class="detail-label">رقم الموظف:</span>
                <span class="detail-value">${appointment.employee_id}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-building"></i>
                <span class="detail-label">القسم:</span>
                <span class="detail-value">${department ? department.name : 'غير محدد'}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <span class="detail-label">الموقع:</span>
                <span class="detail-value">${location ? location.name : 'غير محدد'}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-calendar"></i>
                <span class="detail-label">التاريخ المطلوب:</span>
                <span class="detail-value">${formatDate(appointment.requested_date)}</span>
            </div>
            <div class="detail-item">
                <i class="fas fa-clock"></i>
                <span class="detail-label">الوقت المطلوب:</span>
                <span class="detail-value">${appointment.requested_time}</span>
            </div>
            ${appointment.description ? `
                <div class="detail-item">
                    <i class="fas fa-info-circle"></i>
                    <span class="detail-label">الوصف:</span>
                    <span class="detail-value">${appointment.description}</span>
                </div>
            ` : ''}
            <div class="detail-item">
                <i class="fas fa-calendar-check"></i>
                <span class="detail-label">تاريخ الإنشاء:</span>
                <span class="detail-value">${formatDateTime(appointment.created_at)}</span>
            </div>
        </div>
    `;
    
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
    
    document.getElementById('pendingCount').textContent = pendingCount;
    document.getElementById('approvedCount').textContent = approvedCount;
    document.getElementById('rejectedCount').textContent = rejectedCount;
    document.getElementById('doneCount').textContent = doneCount;
}

// Utility functions
function getStatusText(status) {
    const statusMap = {
        'pending': 'في الانتظار',
        'approved': 'مقبول',
        'rejected': 'مرفوض',
        'done': 'مكتمل',
        'missed': 'فات'
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA');
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'غير محدد';
    const date = new Date(dateTimeString);
    return date.toLocaleString('ar-SA');
}

function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Set current date as minimum for date inputs
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('requestedDate').min = today;
    document.getElementById('approvedDate').min = today;
});
