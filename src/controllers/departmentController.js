const DepartmentService = require('../services/departmentService');

// Get all departments
const getAllDepartments = async (req, res) => {
    try {
        const departments = await DepartmentService.getAllDepartments();
        res.json(departments);
    } catch (error) {
        console.error('Error getting departments:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get department by ID
const getDepartmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const department = await DepartmentService.getDepartmentById(id);
        
        if (!department) {
            return res.status(404).json({ error: 'القسم غير موجود' });
        }

        res.json(department);
    } catch (error) {
        console.error('Error getting department by ID:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create new department
const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'اسم القسم مطلوب' });
        }

        const result = await DepartmentService.createDepartment({ name, description });
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update department
const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'اسم القسم مطلوب' });
        }

        const result = await DepartmentService.updateDepartment(id, { name, description });
        res.json(result);
    } catch (error) {
        console.error('Error updating department:', error);
        if (error.message === 'القسم غير موجود') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// Delete department
const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await DepartmentService.deleteDepartment(id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting department:', error);
        if (error.message === 'القسم غير موجود') {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('لا يمكن حذف القسم')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// Get department statistics
const getDepartmentStats = async (req, res) => {
    try {
        const stats = await DepartmentService.getDepartmentStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting department stats:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentStats
}; 