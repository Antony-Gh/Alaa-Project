const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/', express.static(`${__dirname}/src/public`));

// Database setup
const db = new sqlite3.Database('./scheduling.db', err => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Departments table
  db.run(`CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT
    )`);

  // Locations table
  db.run(`CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        capacity INTEGER,
        description TEXT
    )`);

  // Appointments table
  db.run(`CREATE TABLE IF NOT EXISTS appointments (
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
    )`);

  // Insert sample data
  insertSampleData();
}

function insertSampleData() {
  // Sample departments
  const departments = [
    { name: 'قسم الموارد البشرية', description: 'إدارة شؤون الموظفين' },
    { name: 'قسم تكنولوجيا المعلومات', description: 'إدارة الأنظمة والتقنيات' },
    { name: 'قسم المالية', description: 'إدارة الشؤون المالية' },
    { name: 'قسم التسويق', description: 'إدارة التسويق والمبيعات' },
  ];

  // Sample locations
  const locations = [
    {
      name: 'قاعة الاجتماعات الرئيسية',
      capacity: 20,
      description: 'القاعة الرئيسية للاجتماعات',
    },
    { name: 'قاعة التدريب', capacity: 15, description: 'قاعة مخصصة للتدريب' },
    {
      name: 'غرفة الاجتماعات الصغيرة',
      capacity: 8,
      description: 'للمقابلات والاجتماعات الصغيرة',
    },
    {
      name: 'قاعة المؤتمرات',
      capacity: 50,
      description: 'للمؤتمرات والمناسبات الكبيرة',
    },
  ];

  // Insert departments
  departments.forEach(dept => {
    db.run(
      'INSERT OR IGNORE INTO departments (name, description) VALUES (?, ?)',
      [dept.name, dept.description]
    );
  });

  // Insert locations
  locations.forEach(loc => {
    db.run(
      'INSERT OR IGNORE INTO locations (name, capacity, description) VALUES (?, ?, ?)',
      [loc.name, loc.capacity, loc.description]
    );
  });
}

// API Routes

// Get all departments
app.get('/api/departments', (req, res) => {
  db.all('SELECT * FROM departments ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get all locations
app.get('/api/locations', (req, res) => {
  db.all('SELECT * FROM locations ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create new appointment
app.post('/api/appointments', (req, res) => {
  const {
    employee_name,
    employee_id,
    department_id,
    location_id,
    title,
    description,
    requested_date,
    requested_time,
  } = req.body;

  const appointment_id = uuidv4();

  const sql = `INSERT INTO appointments 
        (id, employee_name, employee_id, department_id, location_id, title, description, requested_date, requested_time) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(
    sql,
    [
      appointment_id,
      employee_name,
      employee_id,
      department_id,
      location_id,
      title,
      description,
      requested_date,
      requested_time,
    ],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({
        id: appointment_id,
        message: 'تم إنشاء الموعد بنجاح',
      });
    }
  );
});

// Get all appointments
app.get('/api/appointments', (req, res) => {
  const sql = `
        SELECT 
            a.*,
            d.name as department_name,
            l.name as location_name
        FROM appointments a
        LEFT JOIN departments d ON a.department_id = d.id
        LEFT JOIN locations l ON a.location_id = l.id
        ORDER BY a.created_at DESC
    `;

  db.all(sql, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get appointments by status
app.get('/api/appointments/status/:status', (req, res) => {
  const { status } = req.params;
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
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Update appointment status (admin approval/rejection)
app.put('/api/appointments/:id/status', (req, res) => {
  const { id } = req.params;
  const {
    status,
    approved_date,
    approved_time,
    admin_notes,
    rejection_reason,
  } = req.body;

  let sql, params;

  if (status === 'approved') {
    sql = `UPDATE appointments 
               SET status = ?, approved_date = ?, approved_time = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE id = ?`;
    params = [status, approved_date, approved_time, admin_notes, id];
  } else if (status === 'rejected') {
    sql = `UPDATE appointments 
               SET status = ?, rejection_reason = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE id = ?`;
    params = [status, rejection_reason, admin_notes, id];
  } else {
    sql = `UPDATE appointments 
               SET status = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE id = ?`;
    params = [status, id];
  }

  db.run(sql, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'الموعد غير موجود' });
      return;
    }
    res.json({ message: 'تم تحديث حالة الموعد بنجاح' });
  });
});

// Get appointment statistics
app.get('/api/appointments/stats', (req, res) => {
  const sql = `
        SELECT 
            status,
            COUNT(*) as count
        FROM appointments 
        GROUP BY status
    `;

  db.all(sql, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(
    `Server is running and listening on port: http://localhost:${PORT}/`
  );
  console.log('نظام حجز المواعيد جاهز للاستخدام');
});
