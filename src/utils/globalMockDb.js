// Plain singleton mock DB for globalSetup (no jest.fn)
if (!global.__PLAIN_MOCK_DB_MANAGER__) {
  const dbManager = {};
  dbManager._tables = {
    users: [],
    departments: [],
    locations: [],
    appointments: [],
    license: []
  };
  dbManager.initialize = () => Promise.resolve();
  dbManager.close = () => Promise.resolve();
  dbManager.seedData = function({ users = [], departments = [], locations = [], appointments = [], license = [] } = {}) {
    this._tables.users = users;
    this._tables.departments = departments;
    this._tables.locations = locations;
    this._tables.appointments = appointments;
    this._tables.license = license;
    console.log('[PLAIN MOCK DB] seedData called:', { departments });
  };
  dbManager._reset = function() {
    this._tables = {
      users: [],
      departments: [],
      locations: [],
      appointments: [],
      license: []
    };
    console.log('[PLAIN MOCK DB] _reset called:', { departments: this._tables.departments });
  };
  dbManager.get = function(sql, params = []) {
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
  };
  dbManager.query = function(sql, params = []) {
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
  };
  dbManager.run = function(sql, params = []) {
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
  };
  global.__PLAIN_MOCK_DB_MANAGER__ = dbManager;
}

module.exports = global.__PLAIN_MOCK_DB_MANAGER__; 