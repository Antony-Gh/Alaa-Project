const AppointmentService = require('../services/appointmentService');
const DepartmentService = require('../services/departmentService');
const LocationService = require('../services/locationService');

// Create new appointment
const createAppointment = async (req, res) => {
    try {
        const {
            employee_name,
            employee_id,
            department_id,
            location_id,
            title,
            description,
            requested_date,
            requested_time
        } = req.body;

        // Validate department exists
        const department = await DepartmentService.getDepartmentById(department_id);
        if (!department) {
            return res.status(404).json({ error: 'القسم غير موجود' });
        }

        // Validate location exists
        const location = await LocationService.getLocationById(location_id);
        if (!location) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        // Check for location conflicts
        const hasConflict = await AppointmentService.checkLocationConflict(location_id, requested_date, requested_time);
        if (hasConflict) {
            return res.status(409).json({ error: 'هناك تعارض في الموعد المطلوب' });
        }

        // Create appointment
        const result = await AppointmentService.createAppointment({
            employee_name,
            employee_id,
            department_id,
            location_id,
            title,
            description,
            requested_date,
            requested_time
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get all appointments
const getAllAppointments = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            department_id: req.query.department_id,
            location_id: req.query.location_id
        };

        const appointments = await AppointmentService.getAllAppointments(filters);
        res.json(appointments);
    } catch (error) {
        console.error('Error getting appointments:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get appointments by status
const getAppointmentsByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const appointments = await AppointmentService.getAppointmentsByStatus(status);
        res.json(appointments);
    } catch (error) {
        console.error('Error getting appointments by status:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update appointment status
const updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, approved_date, approved_time, admin_notes, rejection_reason } = req.body;

        const result = await AppointmentService.updateAppointmentStatus(id, {
            status,
            approved_date,
            approved_time,
            admin_notes,
            rejection_reason
        });

        res.json(result);
    } catch (error) {
        console.error('Error updating appointment status:', error);
        if (error.message === 'الموعد غير موجود') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// Get appointment statistics
const getAppointmentStats = async (req, res) => {
    try {
        const stats = await AppointmentService.getAppointmentStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting appointment stats:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get appointment by ID
const getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await AppointmentService.getAppointmentById(id);
        
        if (!appointment) {
            return res.status(404).json({ error: 'الموعد غير موجود' });
        }

        res.json(appointment);
    } catch (error) {
        console.error('Error getting appointment by ID:', error);
        res.status(500).json({ error: error.message });
    }
};

// Delete appointment
const deleteAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await AppointmentService.deleteAppointment(id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting appointment:', error);
        if (error.message === 'الموعد غير موجود') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = {
    createAppointment,
    getAllAppointments,
    getAppointmentsByStatus,
    updateAppointmentStatus,
    getAppointmentStats,
    getAppointmentById,
    deleteAppointment
}; 