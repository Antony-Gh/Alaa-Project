const { db } = require('../config/database');

class LocationService {
    // Get all locations
    static async getAllLocations() {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM locations ORDER BY name', (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Get location by ID
    static async getLocationById(locationId) {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM locations WHERE id = ?', [locationId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    // Create new location
    static async createLocation(locationData) {
        const { name, capacity, description } = locationData;

        return new Promise((resolve, reject) => {
            db.run('INSERT INTO locations (name, capacity, description) VALUES (?, ?, ?)', 
                [name, capacity, description], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({ id: this.lastID, message: 'تم إنشاء الموقع بنجاح' });
                });
        });
    }

    // Update location
    static async updateLocation(locationId, locationData) {
        const { name, capacity, description } = locationData;

        return new Promise((resolve, reject) => {
            db.run('UPDATE locations SET name = ?, capacity = ?, description = ? WHERE id = ?', 
                [name, capacity, description, locationId], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (this.changes === 0) {
                        reject(new Error('الموقع غير موجود'));
                        return;
                    }
                    resolve({ message: 'تم تحديث الموقع بنجاح' });
                });
        });
    }

    // Delete location
    static async deleteLocation(locationId) {
        return new Promise((resolve, reject) => {
            // Check if location has appointments
            db.get('SELECT COUNT(*) as count FROM appointments WHERE location_id = ?', 
                [locationId], (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (row.count > 0) {
                        reject(new Error('لا يمكن حذف الموقع لوجود مواعيد مرتبطة به'));
                        return;
                    }

                    db.run('DELETE FROM locations WHERE id = ?', [locationId], function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (this.changes === 0) {
                            reject(new Error('الموقع غير موجود'));
                            return;
                        }
                        resolve({ message: 'تم حذف الموقع بنجاح' });
                    });
                });
        });
    }

    // Get location availability for a specific date and time
    static async getLocationAvailability(locationId, date, time) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.*,
                    COUNT(a.id) as booked_count,
                    (l.capacity - COUNT(a.id)) as available_capacity
                FROM locations l
                LEFT JOIN appointments a ON l.id = a.location_id 
                    AND a.requested_date = ? 
                    AND a.requested_time = ? 
                    AND a.status IN ('pending', 'approved')
                WHERE l.id = ?
                GROUP BY l.id
            `;

            db.get(sql, [date, time, locationId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    // Get location statistics
    static async getLocationStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.id,
                    l.name,
                    l.capacity,
                    COUNT(a.id) as appointment_count,
                    COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved_count,
                    COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count,
                    ROUND(AVG(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) * 100, 2) as approval_rate
                FROM locations l
                LEFT JOIN appointments a ON l.id = a.location_id
                GROUP BY l.id, l.name, l.capacity
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

    // Get available locations for a specific date and time
    static async getAvailableLocations(date, time) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    l.*,
                    COUNT(a.id) as booked_count,
                    (l.capacity - COUNT(a.id)) as available_capacity
                FROM locations l
                LEFT JOIN appointments a ON l.id = a.location_id 
                    AND a.requested_date = ? 
                    AND a.requested_time = ? 
                    AND a.status IN ('pending', 'approved')
                GROUP BY l.id
                HAVING available_capacity > 0 OR available_capacity IS NULL
                ORDER BY available_capacity DESC
            `;

            db.all(sql, [date, time], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }
}

module.exports = LocationService;
