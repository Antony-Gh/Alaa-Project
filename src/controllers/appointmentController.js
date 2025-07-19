const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, AuthorizationError } = require('../middleware/errorHandler');
const { validateAppointment, validateAppointmentStatus, validateRecurringAppointment } = require('../middleware/validation');
const ResponseHandler = require('../utils/responseHandler');
const dbManager = require('../utils/database');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const realtimeService = require('../services/realtimeService');
const moment = require('moment-timezone');
const config = require('../config/config');

// Create new appointment
const createAppointment = asyncHandler(async (req, res) => {
    const {
        employee_name,
        employee_id,
        department_id,
        location_id,
        title,
        description,
        requested_date,
        requested_time,
        duration = 60,
        priority = 'normal',
        tags = [],
        recurring_pattern = null
    } = req.body;

    const appointment_id = uuidv4();

    // Validate department exists
    const department = await dbManager.get('SELECT id FROM departments WHERE id = ?', [department_id]);
    if (!department) {
        throw new NotFoundError(req.t('department.notfound'));
    }

    // Validate location exists
    const location = await dbManager.get('SELECT id FROM locations WHERE id = ?', [location_id]);
    if (!location) {
        throw new NotFoundError(req.t('location.notfound'));
    }

    // Check for location conflicts
    const conflictCheck = await dbManager.get(`
        SELECT COUNT(*) as count 
        FROM appointments 
        WHERE location_id = ? 
        AND requested_date = ? 
        AND requested_time = ? 
        AND status IN ('pending', 'approved')
    `, [location_id, requested_date, requested_time]);

    if (conflictCheck.count > 0) {
        return ResponseHandler.error(res, req.t('appointment.location_conflict'), 409, 'LOCATION_CONFLICT');
    }

    // Insert appointment
    await dbManager.run(
        `INSERT INTO appointments 
        (id, employee_name, employee_id, user_id, department_id, location_id, title, description, 
         requested_date, requested_time, duration, priority, tags) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [appointment_id, employee_name, employee_id, req.user.id, department_id, location_id, 
         title, description, requested_date, requested_time, duration, priority, JSON.stringify(tags)]
    );

    // Handle recurring appointments
    if (recurring_pattern && config.features.recurringAppointments) {
        await createRecurringAppointments(appointment_id, recurring_pattern);
    }

    // Get the created appointment with department and location names
    const appointment = await dbManager.get(`
        SELECT 
            a.*,
            d.name as department_name,
            l.name as location_name
        FROM appointments a
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.id = ?
    `, [appointment_id]);

    // Send real-time notification
    realtimeService.sendAppointmentCreated(appointment, req.user);

    // Send email notification to admins
    if (config.notifications.email.enabled) {
        const adminUsers = await dbManager.query('SELECT email FROM users WHERE role = ? AND email IS NOT NULL', ['admin']);
        const adminEmails = adminUsers.map(user => user.email);
        
        if (adminEmails.length > 0) {
            emailService.sendAdminNotification(appointment, adminEmails);
        }
    }

    // Log analytics
    await logAnalytics('appointment_created', 1, { department_id, location_id });

    logger.info('Appointment created', { 
        appointmentId: appointment_id, 
        employeeId: employee_id,
        userId: req.user.id 
    });

    return ResponseHandler.created(res, appointment, req.t('appointment.created'));
});

// Create recurring appointments
const createRecurringAppointments = async (parentAppointmentId, pattern) => {
    const { type, interval = 1, daysOfWeek, startDate, endDate, maxOccurrences } = pattern;
    
    await dbManager.run(`
        INSERT INTO recurring_appointments 
        (appointment_id, pattern_type, interval, days_of_week, start_date, end_date, max_occurrences) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [parentAppointmentId, type, interval, JSON.stringify(daysOfWeek), startDate, endDate, maxOccurrences]);

    // Generate recurring instances
    const instances = generateRecurringInstances(pattern);
    
    for (const instance of instances) {
        const instanceId = uuidv4();
        const parentAppointment = await dbManager.get('SELECT * FROM appointments WHERE id = ?', [parentAppointmentId]);
        
        await dbManager.run(`
            INSERT INTO appointments 
            (id, employee_name, employee_id, user_id, department_id, location_id, title, description,
             requested_date, requested_time, duration, priority, tags, parent_appointment_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [instanceId, parentAppointment.employee_name, parentAppointment.employee_id, parentAppointment.user_id,
             parentAppointment.department_id, parentAppointment.location_id, parentAppointment.title,
             parentAppointment.description, instance.date, instance.time, parentAppointment.duration,
             parentAppointment.priority, parentAppointment.tags, parentAppointmentId]);
    }
};

// Generate recurring instances
const generateRecurringInstances = (pattern) => {
    const instances = [];
    const start = moment(pattern.startDate);
    const end = pattern.endDate ? moment(pattern.endDate) : moment().add(1, 'year');
    let current = start.clone();
    let count = 0;

    while (current.isBefore(end) && count < (pattern.maxOccurrences || 52)) {
        if (pattern.type === 'weekly' && pattern.daysOfWeek) {
            pattern.daysOfWeek.forEach(day => {
                const instanceDate = current.clone().day(day);
                if (instanceDate.isBetween(start, end, 'day', '[]')) {
                    instances.push({
                        date: instanceDate.format('YYYY-MM-DD'),
                        time: pattern.time || '09:00'
                    });
                    count++;
                }
            });
            current.add(pattern.interval || 1, 'week');
        } else {
            instances.push({
                date: current.format('YYYY-MM-DD'),
                time: pattern.time || '09:00'
            });
            count++;
            current.add(pattern.interval || 1, pattern.type);
        }
    }

    return instances;
};

// Get all appointments with advanced filtering
const getAllAppointments = asyncHandler(async (req, res) => {
    const { 
        status, 
        page = 1, 
        limit = 20, 
        search,
        date_from,
        date_to,
        department_id,
        location_id,
        priority,
        tags,
        sort_by = 'created_at',
        sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    let sql = `
        SELECT 
            a.*,
            d.name as department_name,
            l.name as location_name,
            u.full_name as user_full_name,
            u.email as user_email
        FROM appointments a
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN locations l ON a.location_id = l.id
        LEFT JOIN users u ON a.user_id = u.id
    `;

    const params = [];
    const conditions = [];

    // Add search filter
    if (search) {
        conditions.push(`(
            a.title LIKE ? OR 
            a.description LIKE ? OR 
            a.employee_name LIKE ? OR
            d.name LIKE ? OR
            l.name LIKE ?
        )`);
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Add status filter
    if (status && status !== 'all') {
        conditions.push('a.status = ?');
        params.push(status);
    }

    // Add date range filter
    if (date_from) {
        conditions.push('a.requested_date >= ?');
        params.push(date_from);
    }
    if (date_to) {
        conditions.push('a.requested_date <= ?');
        params.push(date_to);
    }

    // Add department filter
    if (department_id) {
        conditions.push('a.department_id = ?');
        params.push(department_id);
    }

    // Add location filter
    if (location_id) {
        conditions.push('a.location_id = ?');
        params.push(location_id);
    }

    // Add priority filter
    if (priority) {
        conditions.push('a.priority = ?');
        params.push(priority);
    }

    // Add tags filter
    if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        conditions.push(`JSON_ARRAY_LENGTH(JSON_EXTRACT(a.tags, '$')) > 0`);
        tagArray.forEach(tag => {
            conditions.push(`JSON_CONTAINS(a.tags, ?)`);
            params.push(JSON.stringify(tag));
        });
    }

    // For non-admin users, only show their own appointments
    if (req.user.role !== 'admin') {
        conditions.push('a.user_id = ?');
        params.push(req.user.id);
    }

    // Build WHERE clause
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add sorting
    sql += ` ORDER BY a.${sort_by} ${sort_order.toUpperCase()}`;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const appointments = await dbManager.query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM appointments a';
    const countParams = [];

    if (conditions.length > 0) {
        countSql += ' WHERE ' + conditions.join(' AND ');
        countParams.push(...params.slice(0, -2)); // Remove LIMIT and OFFSET
    }

    if (req.user.role !== 'admin') {
        const whereClause = conditions.length > 0 ? ' AND a.user_id = ?' : ' WHERE a.user_id = ?';
        countSql += whereClause;
        countParams.push(req.user.id);
    }

    const totalResult = await dbManager.get(countSql, countParams);
    const total = totalResult.total;

    // Parse JSON fields
    appointments.forEach(appointment => {
        if (appointment.tags) {
            try {
                appointment.tags = JSON.parse(appointment.tags);
            } catch (e) {
                appointment.tags = [];
            }
        }
        if (appointment.attachments) {
            try {
                appointment.attachments = JSON.parse(appointment.attachments);
            } catch (e) {
                appointment.attachments = [];
            }
        }
    });

    const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
    };

    return ResponseHandler.success(res, { appointments, pagination }, req.t('appointment.fetched_all'));
});

// Get appointment by ID
const getAppointmentById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const appointment = await dbManager.get(`
        SELECT a.*, d.name as department_name, l.name as location_name
        FROM appointments a
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE a.id = ?
    `, [id]);

    if (!appointment) {
        throw new NotFoundError(req.t('appointment.notfound'));
    }

    // Check if user has access to this appointment
    if (req.user.role !== 'admin' && appointment.employee_id !== req.user.username) {
        throw new AuthorizationError(req.t('error.forbidden'));
    }

    // Parse JSON fields
    if (appointment.tags) {
        try {
            appointment.tags = JSON.parse(appointment.tags);
        } catch (e) {
            appointment.tags = [];
        }
    }
    if (appointment.attachments) {
        try {
            appointment.attachments = JSON.parse(appointment.attachments);
        } catch (e) {
            appointment.attachments = [];
        }
    }

    return ResponseHandler.success(res, appointment, req.t('appointment.fetched'));
});

// Update appointment status (admin only)
const updateAppointmentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, approved_date, approved_time, rejection_reason, admin_notes } = req.body;

    // Check if appointment exists
    const appointment = await dbManager.get('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appointment) {
        throw new NotFoundError(req.t('appointment.notfound'));
    }

    // Update appointment status
    const updateFields = ['status = ?', 'admin_notes = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status, admin_notes];

    if (status === 'approved' && approved_date && approved_time) {
        updateFields.push('approved_date = ?', 'approved_time = ?');
        params.push(approved_date, approved_time);
    }

    if (status === 'rejected' && rejection_reason) {
        updateFields.push('rejection_reason = ?');
        params.push(rejection_reason);
    }

    params.push(id);

    const result = await dbManager.run(
        `UPDATE appointments SET ${updateFields.join(', ')} WHERE id = ?`,
        params
    );

    if (result.changes === 0) {
        throw new NotFoundError(req.t('appointment.notfound'));
    }

    // Get updated appointment
    const updatedAppointment = await dbManager.get('SELECT * FROM appointments WHERE id = ?', [id]);

    logger.info('Appointment status updated', { 
        appointmentId: id, 
        status, 
        adminId: req.user.id 
    });

    return ResponseHandler.success(res, updatedAppointment, req.t('appointment.status_updated'));
});

// Delete appointment (admin only)
const deleteAppointment = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if appointment exists
    const appointment = await dbManager.get('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appointment) {
        throw new NotFoundError(req.t('appointment.notfound'));
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
        throw new AuthorizationError(req.t('error.forbidden'));
    }

    // Delete appointment
    const result = await dbManager.run('DELETE FROM appointments WHERE id = ?', [id]);

    if (result.changes === 0) {
        throw new NotFoundError(req.t('appointment.notfound'));
    }

    logger.info('Appointment deleted', { 
        appointmentId: id, 
        adminId: req.user.id 
    });

    return ResponseHandler.success(res, null, req.t('appointment.deleted'));
});

// Get appointment statistics
const getAppointmentStats = asyncHandler(async (req, res) => {
    const { date_from, date_to, department_id } = req.query;

    let whereClause = '';
    const params = [];

    if (date_from) {
        whereClause += ' AND requested_date >= ?';
        params.push(date_from);
    }
    if (date_to) {
        whereClause += ' AND requested_date <= ?';
        params.push(date_to);
    }
    if (department_id) {
        whereClause += ' AND department_id = ?';
        params.push(department_id);
    }

    // For non-admin users, only show their own stats
    if (req.user.role !== 'admin') {
        whereClause += ' AND user_id = ?';
        params.push(req.user.id);
    }

    const stats = await dbManager.get(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
            SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
            SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
        FROM appointments 
        WHERE 1=1 ${whereClause}
    `, params);

    // Get department-wise stats
    const departmentStats = await dbManager.query(`
        SELECT 
            d.name as department_name,
            COUNT(*) as total,
            SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as approved
        FROM appointments a
        LEFT JOIN departments d ON a.department_id = d.id
        WHERE 1=1 ${whereClause}
        GROUP BY d.id, d.name
        ORDER BY total DESC
    `, params);

    // Get location-wise stats
    const locationStats = await dbManager.query(`
        SELECT 
            l.name as location_name,
            COUNT(*) as total,
            SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as approved
        FROM appointments a
        LEFT JOIN locations l ON a.location_id = l.id
        WHERE 1=1 ${whereClause}
        GROUP BY l.id, l.name
        ORDER BY total DESC
    `, params);

    const result = {
        overview: stats,
        byDepartment: departmentStats,
        byLocation: locationStats
    };

    return ResponseHandler.success(res, result, req.t('appointment.stats_fetched'));
});

// Log analytics
const logAnalytics = async (metricName, value, data = {}) => {
    if (!config.analytics.enabled) return;

    try {
        await dbManager.run(`
            INSERT INTO analytics (metric_name, metric_value, metric_data, date, hour) 
            VALUES (?, ?, ?, ?, ?)
        `, [
            metricName, 
            value, 
            JSON.stringify(data), 
            moment().format('YYYY-MM-DD'),
            moment().hour()
        ]);
    } catch (error) {
        logger.error('❌ Failed to log analytics', { error: error.message, metricName });
    }
};

module.exports = {
    createAppointment,
    getAllAppointments,
    getAppointmentById,
    updateAppointmentStatus,
    deleteAppointment,
    getAppointmentStats
}; 