// Mock database manager for testing

const appointments = [
  {
    id: 'test-appointment-1',
    employee_name: 'Ahmed Mohamed',
    employee_id: 'EMP123',
    user_id: 'user-id',
    department_id: 1,
    location_id: 1,
    title: 'Regular Meeting',
    description: 'Weekly status update meeting',
    requested_date: '2023-01-15',
    requested_time: '10:00',
    duration: 60,
    priority: 'normal',
    status: 'pending',
    created_at: '2023-01-10T10:00:00.000Z',
    tags: '[]'
  },
  {
    id: 'test-appointment-2',
    employee_name: 'Sara Ahmed',
    employee_id: 'EMP456',
    user_id: 'user-id',
    department_id: 2,
    location_id: 2,
    title: 'Project Review',
    description: 'Review of the quarterly project progress',
    requested_date: '2023-01-20',
    requested_time: '14:00',
    duration: 120,
    priority: 'high',
    status: 'approved',
    approved_date: '2023-01-20',
    approved_time: '14:00',
    created_at: '2023-01-11T15:30:00.000Z',
    tags: '["important", "review"]'
  },
  {
    id: 'test-appointment-3',
    employee_name: 'Omar Yasser',
    employee_id: 'EMP789',
    user_id: 'admin-id',
    department_id: 1,
    location_id: 3,
    title: 'Budget Discussion',
    description: 'Annual budget planning session',
    requested_date: '2023-01-25',
    requested_time: '09:30',
    duration: 180,
    priority: 'high',
    status: 'rejected',
    rejection_reason: 'Conflicting schedule',
    created_at: '2023-01-12T08:45:00.000Z',
    tags: '["budget", "planning"]'
  }
];

const departments = [
  { id: 1, name: 'HR Department' },
  { id: 2, name: 'IT Department' },
  { id: 3, name: 'Finance Department' }
];

const locations = [
  { id: 1, name: 'Conference Room A', capacity: 10 },
  { id: 2, name: 'Meeting Room B', capacity: 20 },
  { id: 3, name: 'Board Room', capacity: 15 }
];

const users = [
  {
    id: 'user-id',
    username: 'regularuser',
    email: 'user@example.com',
    full_name: 'Regular User',
    password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
    role: 'user',
    department_id: 1,
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 'admin-id',
    username: 'admin',
    email: 'admin@example.com',
    full_name: 'Admin User',
    password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
    role: 'admin',
    is_active: true,
    created_at: '2023-01-01T00:00:00.000Z'
  }
];

// Always create a new Jest mock singleton, copying _tables from the plain singleton if it exists
const dbManager = {};
dbManager._tables = global.__PLAIN_MOCK_DB_MANAGER__ ? global.__PLAIN_MOCK_DB_MANAGER__._tables : {
  users: [],
  departments: [],
  locations: [],
  appointments: [],
  license: []
};
dbManager.initialize = jest.fn().mockImplementation(() => Promise.resolve());
dbManager.close = jest.fn().mockImplementation(() => Promise.resolve());
dbManager.seedData = jest.fn().mockImplementation(function({ users = [], departments = [], locations = [], appointments = [], license = [] } = {}) {
  this._tables.users = users;
  this._tables.departments = departments;
  this._tables.locations = locations;
  this._tables.appointments = appointments;
  this._tables.license = license;
  console.log('[MOCK DB] seedData called:', { departments });
});
dbManager._reset = jest.fn().mockImplementation(function() {
  this._tables = {
    users: [],
    departments: [],
    locations: [],
    appointments: [],
    license: []
  };
  console.log('[MOCK DB] _reset called:', { departments: this._tables.departments });
});
dbManager.get = jest.fn().mockImplementation(function (sql, params = []) {
  console.log('[MOCK DB] get called:', { sql, params, dbTables: this._tables });
  if (sql.toLowerCase().includes('from departments')) {
    console.log('[MOCK DB] get departments:', { sql, params, departments: this._tables.departments });
  }
  let table = null;
  if (sql.toLowerCase().includes('from users')) table = this._tables.users;
  if (sql.toLowerCase().includes('from departments')) table = this._tables.departments;
  if (sql.toLowerCase().includes('from locations')) table = this._tables.locations;
  if (sql.toLowerCase().includes('from appointments')) table = this._tables.appointments;
  if (sql.toLowerCase().includes('from license')) table = this._tables.license;
  if (!table) return Promise.resolve(null);
  if (params.length === 1) {
    const record = table.find(item => (item.id && item.id.toString() === params[0].toString()) || (item.license_key && item.license_key === params[0]));
    return Promise.resolve(record || null);
  }
  return Promise.resolve(table[0] || null);
});
dbManager.query = jest.fn().mockImplementation(function (sql, params = []) {
  let table = null;
  if (sql.toLowerCase().includes('from users')) table = this._tables.users;
  if (sql.toLowerCase().includes('from departments')) table = this._tables.departments;
  if (sql.toLowerCase().includes('from locations')) table = this._tables.locations;
  if (sql.toLowerCase().includes('from appointments')) table = this._tables.appointments;
  if (sql.toLowerCase().includes('from license')) table = this._tables.license;
  if (!table) return Promise.resolve([]);
  if (params.length === 1) {
    const records = table.filter(item => (item.id && item.id.toString() === params[0].toString()));
    return Promise.resolve(records);
  }
  return Promise.resolve([...table]);
});
dbManager.run = jest.fn().mockImplementation(function (sql, params = []) {
  if (sql.toLowerCase().startsWith('insert into')) {
    if (sql.toLowerCase().includes('users')) {
      const user = { id: params[0], username: params[1], email: params[2], password_hash: params[3], role: params[4], department_id: params[5], is_active: true, created_at: new Date().toISOString() };
      this._tables.users.push(user);
      return Promise.resolve({ lastID: user.id });
    }
    if (sql.toLowerCase().includes('departments')) {
      const dept = { id: params[0], name: params[1] };
      this._tables.departments.push(dept);
      return Promise.resolve({ lastID: dept.id });
    }
    // Add similar for locations, appointments as needed
  }
  return Promise.resolve({ changes: 1 });
});
global.__MOCK_DB_MANAGER__ = dbManager;
module.exports = dbManager; 