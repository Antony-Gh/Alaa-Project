const { db } = require('../config/database');

class DepartmentService {
    // Get all departments
    static async getAllDepartments() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM departments ORDER BY name', (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Get department by ID
    static async getDepartmentById(departmentId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM departments WHERE id = ?', [departmentId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    // Create new department
    static async createDepartment(departmentData) {
        const { name, description } = departmentData;

        return new Promise((resolve, reject) => {
            db.run('INSERT INTO departments (name, description) VALUES (?, ?)', 
                [name, description], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ id: this.lastID, message: 'تم إنشاء القسم بنجاح' });
                });
        });
    }

    // Update department
    static async updateDepartment(departmentId, departmentData) {
        const { name, description } = departmentData;

        return new Promise((resolve, reject) => {
            db.run('UPDATE departments SET name = ?, description = ? WHERE id = ?', 
                [name, description, departmentId], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (this.changes === 0) {
                        reject(new Error('القسم غير موجود'));
                        return;
                    }
                    resolve({ message: 'تم تحديث القسم بنجاح' });
                });
        });
    }

    // Delete department
    static async deleteDepartment(departmentId) {
        return new Promise((resolve, reject) => {
            // Check if department has appointments
            db.get('SELECT COUNT(*) as count FROM appointments WHERE department_id = ?', 
                [departmentId], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (row.count > 0) {
                        reject(new Error('لا يمكن حذف القسم لوجود مواعيد مرتبطة به'));
                        return;
                    }

                    db.run('DELETE FROM departments WHERE id = ?', [departmentId], function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (this.changes === 0) {
                            reject(new Error('القسم غير موجود'));
                            return;
                        }
                        resolve({ message: 'تم حذف القسم بنجاح' });
                    });
                });
        });
    }

    // Get department statistics
    static async getDepartmentStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    d.id,
                    d.name,
                    COUNT(a.id) as appointment_count,
                    COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved_count,
                    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count
                FROM departments d
                LEFT JOIN appointments a ON d.id = a.department_id
                GROUP BY d.id, d.name
                ORDER BY appointment_count DESC
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
}

module.exports = DepartmentService;