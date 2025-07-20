const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError } = require('../middleware/errorHandler');
const ResponseHandler = require('../utils/responseHandler');
const dbManager = require('../utils/database');
const logger = require('../utils/logger');

// Get all departments
const getAllDepartments = asyncHandler(async (req, res) => {
  const departments = await dbManager.query(
    'SELECT * FROM departments ORDER BY name'
  );
  return ResponseHandler.success(
    res,
    departments,
    req.t('department.fetched_all')
  );
});

// Get department by ID
const getDepartmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const department = await dbManager.get(
    'SELECT * FROM departments WHERE id = ?',
    [id]
  );
  if (!department) {
    throw new NotFoundError(req.t('department.notfound'));
  }

  return ResponseHandler.success(res, department, req.t('department.fetched'));
});

// Create new department (admin only)
const createDepartment = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // Check if department name already exists
  const existingDepartment = await dbManager.get(
    'SELECT id FROM departments WHERE name = ?',
    [name]
  );
  if (existingDepartment) {
    return ResponseHandler.error(
      res,
      req.t('department.duplicate'),
      400,
      'DUPLICATE_DEPARTMENT'
    );
  }

  const result = await dbManager.run(
    'INSERT INTO departments (name, description) VALUES (?, ?)',
    [name, description]
  );

  const newDepartment = await dbManager.get(
    'SELECT * FROM departments WHERE id = ?',
    [result.id]
  );

  logger.info('Department created', {
    departmentId: result.id,
    name,
    adminId: req.user.id,
  });

  return ResponseHandler.created(
    res,
    newDepartment,
    req.t('department.created')
  );
});

// Update department (admin only)
const updateDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  // Check if department exists
  const existingDepartment = await dbManager.get(
    'SELECT * FROM departments WHERE id = ?',
    [id]
  );
  if (!existingDepartment) {
    throw new NotFoundError(req.t('department.notfound'));
  }

  // Check if new name conflicts with existing department
  if (name && name !== existingDepartment.name) {
    const nameConflict = await dbManager.get(
      'SELECT id FROM departments WHERE name = ? AND id != ?',
      [name, id]
    );
    if (nameConflict) {
      return ResponseHandler.error(
        res,
        req.t('department.duplicate'),
        400,
        'DUPLICATE_DEPARTMENT'
      );
    }
  }

  const result = await dbManager.run(
    'UPDATE departments SET name = ?, description = ? WHERE id = ?',
    [name, description, id]
  );

  if (result.changes === 0) {
    throw new NotFoundError(req.t('department.notfound'));
  }

  const updatedDepartment = await dbManager.get(
    'SELECT * FROM departments WHERE id = ?',
    [id]
  );

  logger.info('Department updated', {
    departmentId: id,
    adminId: req.user.id,
  });

  return ResponseHandler.success(
    res,
    updatedDepartment,
    req.t('department.updated')
  );
});

// Delete department (admin only)
const deleteDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if department exists
  const department = await dbManager.get(
    'SELECT * FROM departments WHERE id = ?',
    [id]
  );
  if (!department) {
    throw new NotFoundError(req.t('department.notfound'));
  }

  // Check if department has users
  const usersWithDepartment = await dbManager.get(
    'SELECT COUNT(*) as count FROM users WHERE department_id = ?',
    [id]
  );

  if (usersWithDepartment.count > 0) {
    return ResponseHandler.error(
      res,
      req.t('department.delete_has_users'),
      400,
      'DEPARTMENT_HAS_USERS'
    );
  }

  // Check if department has appointments
  const appointmentsWithDepartment = await dbManager.get(
    'SELECT COUNT(*) as count FROM appointments WHERE department_id = ?',
    [id]
  );

  if (appointmentsWithDepartment.count > 0) {
    return ResponseHandler.error(
      res,
      req.t('department.delete_has_appointments'),
      400,
      'DEPARTMENT_HAS_APPOINTMENTS'
    );
  }

  const result = await dbManager.run('DELETE FROM departments WHERE id = ?', [
    id,
  ]);

  if (result.changes === 0) {
    throw new NotFoundError(req.t('department.notfound'));
  }

  logger.info('Department deleted', {
    departmentId: id,
    adminId: req.user.id,
  });

  return ResponseHandler.success(res, null, req.t('department.deleted'));
});

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
