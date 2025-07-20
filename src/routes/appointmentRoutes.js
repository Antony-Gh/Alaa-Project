const express = require('express');
const router = express.Router();
const {
    createAppointment,
    getAllAppointments,
    getAppointmentsByStatus,
    updateAppointmentStatus,
    getAppointmentStats,
    getAppointmentById,
    deleteAppointment
} = require('../controllers/appointmentController');

// Create new appointment
router.post('/', createAppointment);

// Get all appointments with optional filtering
router.get('/', getAllAppointments);

// Get appointments by status
router.get('/status/:status', getAppointmentsByStatus);

// Get appointment statistics
router.get('/stats', getAppointmentStats);

// Get appointment by ID
router.get('/:id', getAppointmentById);

// Update appointment status
router.put('/:id/status', updateAppointmentStatus);

// Delete appointment
router.delete('/:id', deleteAppointment);

module.exports = router;