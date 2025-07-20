const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../scheduling.db');

// Database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Database initialization
const initializeDatabase = () => {
    return new Promise((resolve, reject) => {
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');

        // Create tables
        const createTables = [
            // Departments table
            `CREATE TABLE IF NOT EXISTS departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT
            )`,
            
            // Locations table
            `CREATE TABLE IF NOT EXISTS locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                capacity INTEGER,
                description TEXT
            )`,
            
            // Appointments table
            `CREATE TABLE IF NOT EXISTS appointments (
                id TEXT PRIMARY KEY,
                employee_name TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                department_id INTEGER,
                location_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                requested_date TEXT,
                requested_time TEXT,
                approved_date TEXT,
                approved_time TEXT,
                status TEXT DEFAULT 'pending',
                admin_notes TEXT,
                rejection_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (department_id) REFERENCES departments (id),
                FOREIGN KEY (location_id) REFERENCES locations (id)
            )`
        ];

        let completed = 0;
        const total = createTables.length;

        createTables.forEach(sql => {
            db.run(sql, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                completed++;
                if (completed === total) {
                    resolve();
                }
            });
        });
    });
};

// Sample data insertion
const insertSampleData = () => {
    return new Promise((resolve, reject) => {
        // Sample departments
        const departments = [
            { name: 'قسم الموارد البشرية', description: 'إدارة شؤون الموظفين' },
            { name: 'قسم تكنولوجيا المعلومات', description: 'إدارة الأنظمة والتقنيات' },
            { name: 'قسم المالية', description: 'إدارة الشؤون المالية' },
            { name: 'قسم التسويق', description: 'إدارة التسويق والمبيعات' }
        ];

        // Sample locations
        const locations = [
            { name: 'قاعة الاجتماعات الرئيسية', capacity: 20, description: 'القاعة الرئيسية للاجتماعات' },
            { name: 'قاعة التدريب', capacity: 15, description: 'قاعة مخصصة للتدريب' },
            { name: 'غرفة الاجتماعات الصغيرة', capacity: 8, description: 'للمقابلات والاجتماعات الصغيرة' },
            { name: 'قاعة المؤتمرات', capacity: 50, description: 'للمؤتمرات والمناسبات الكبيرة' }
        ];

        let completed = 0;
        const total = departments.length + locations.length;

        // Insert departments
        departments.forEach(dept => {
            db.run('INSERT OR IGNORE INTO departments (name, description) VALUES (?, ?)', 
                [dept.name, dept.description], (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === total) {
                        resolve();
                    }
                });
        });

        // Insert locations
        locations.forEach(loc => {
            db.run('INSERT OR IGNORE INTO locations (name, capacity, description) VALUES (?, ?, ?)', 
                [loc.name, loc.capacity, loc.description], (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    completed++;
                    if (completed === total) {
                        resolve();
                    }
                });
        });
    });
};

// Close database connection
const closeDatabase = () => {
    return new Promise((resolve) => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed');
            }
            resolve();
        });
    });
};

module.exports = {
    db,
    initializeDatabase,
    insertSampleData,
    closeDatabase
};