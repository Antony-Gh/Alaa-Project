const express = require('express');
const router = express.Router();
const {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentStats
} = require('../controllers/departmentController');

// Get all departments
router.get('/', getAllDepartments);

// Get department statistics
router.get('/stats', getDepartmentStats);

// Get department by ID
router.get('/:id', getDepartmentById);

// Create new department
router.post('/', createDepartment);

// Update department
router.put('/:id', updateDepartment);

// Delete department
router.delete('/:id', deleteDepartment);

module.exports = router;