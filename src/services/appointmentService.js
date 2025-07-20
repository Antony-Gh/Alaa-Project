const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/database');

class AppointmentService {
    // Create new appointment
    static async createAppointment(appointmentData) {
        const {
            employee_name,
            employee_id,
            department_id,
            location_id,
            title,
            description,
            requested_date,
            requested_time
        } = appointmentData;

        const appointment_id = uuidv4();

        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO appointments 
                (id, employee_name, employee_id, department_id, location_id, title, description, requested_date, requested_time) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.run(sql, [appointment_id, employee_name, employee_id, department_id, location_id, title, description, requested_date, requested_time], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve({ id: appointment_id, message: 'تم إنشاء الموعد بنجاح' });
            });
        });
    }

    // Get all appointments with optional filtering
    static async getAllAppointments(filters = {}) {
        const { status, search, date_from, date_to, department_id, location_id } = filters;
        
        let sql = `
            SELECT 
                a.*,
                d.name as department_name,
                l.name as location_name
            FROM appointments a
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN locations l ON a.location_id = l.id
        `;

        const conditions = [];
        const params = [];

        if (status) {
            conditions.push('a.status = ?');
            params.push(status);
        }

        if (search) {
            conditions.push('(a.employee_name LIKE ? OR a.title LIKE ? OR a.description LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (date_from) {
            conditions.push('a.requested_date >= ?');
            params.push(date_from);
        }

        if (date_to) {
            conditions.push('a.requested_date <= ?');
            params.push(date_to);
        }

        if (department_id) {
            conditions.push('a.department_id = ?');
            params.push(department_id);
        }

        if (location_id) {
            conditions.push('a.location_id = ?');
            params.push(location_id);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY a.created_at DESC';

        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Get appointments by status
    static async getAppointmentsByStatus(status) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    a.*,
                    d.name as department_name,
                    l.name as location_name
                FROM appointments a
                LEFT JOIN departments d ON a.department_id = d.id
                LEFT JOIN locations l ON a.location_id = l.id
                WHERE a.status = ?
                ORDER BY a.created_at DESC
            `;

            db.all(sql, [status], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Update appointment status
    static async updateAppointmentStatus(appointmentId, statusData) {
        const { status, approved_date, approved_time, admin_notes, rejection_reason } = statusData;

        return new Promise((resolve, reject) => {
            let sql, params;

            if (status === 'approved') {
                sql = `UPDATE appointments 
                       SET status = ?, approved_date = ?, approved_time = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
                       WHERE id = ?`;
                params = [status, approved_date, approved_time, admin_notes, appointmentId];
            } else if (status === 'rejected') {
                sql = `UPDATE appointments 
                       SET status = ?, rejection_reason = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
                       WHERE id = ?`;
                params = [status, rejection_reason, admin_notes, appointmentId];
            } else {
                sql = `UPDATE appointments 
                       SET status = ?, updated_at = CURRENT_TIMESTAMP 
                       WHERE id = ?`;
                params = [status, appointmentId];
            }

            db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                if (this.changes === 0) {
                    reject(new Error('الموعد غير موجود'));
                    return;
                }
                resolve({ message: 'تم تحديث حالة الموعد بنجاح' });
            });
        });
    }

    // Get appointment statistics
    static async getAppointmentStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    status,
                    COUNT(*) as count
                FROM appointments 
                GROUP BY status
            `;

            db.all(sql, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Check for location conflicts
    static async checkLocationConflict(locationId, date, time, excludeAppointmentId = null) {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT COUNT(*) as count 
                FROM appointments 
                WHERE location_id = ? 
                AND requested_date = ? 
                AND requested_time = ? 
                AND status IN ('pending', 'approved')
            `;
            const params = [locationId, date, time];

            if (excludeAppointmentId) {
                sql += ' AND id != ?';
                params.push(excludeAppointmentId);
            }

            db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row.count > 0);
            });
        });
    }

    // Get appointment by ID
    static async getAppointmentById(appointmentId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    a.*,
                    d.name as department_name,
                    l.name as location_name
                FROM appointments a
                LEFT JOIN departments d ON a.department_id = d.id
                LEFT JOIN locations l ON a.location_id = l.id
                WHERE a.id = ?
            `;

            db.get(sql, [appointmentId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    // Delete appointment
    static async deleteAppointment(appointmentId) {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM appointments WHERE id = ?', [appointmentId], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                if (this.changes === 0) {
                    reject(new Error('الموعد غير موجود'));
                    return;
                }
                resolve({ message: 'تم حذف الموعد بنجاح' });
            });
        });
    }
}

module.exports = AppointmentService;