const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const departmentController = require('../controllers/departmentController');
const locationController = require('../controllers/locationController');
const { authenticateToken, requireAdmin, requireEmployee } = require('../middleware/auth');
const { validateAppointment, validateAppointmentStatus } = require('../middleware/validation');
const { appointmentLimiter, adminLimiter } = require('../middleware/rateLimiter');

// Public routes (for getting departments and locations)
router.get('/departments', departmentController.getAllDepartments);
router.get('/locations', locationController.getAllLocations);

// Protected routes - require authentication
router.use(authenticateToken);

// Employee routes
router.post('/', appointmentLimiter, requireEmployee, validateAppointment, appointmentController.createAppointment);
router.get('/', appointmentController.getAllAppointments);
router.get('/stats', appointmentController.getAppointmentStats);
router.get('/:id', appointmentController.getAppointmentById);

// Admin routes
router.put('/:id/status', adminLimiter, requireAdmin, validateAppointmentStatus, appointmentController.updateAppointmentStatus);
router.delete('/:id', adminLimiter, requireAdmin, appointmentController.deleteAppointment);



// Status-specific routes
//router.get('/status/:status', appointmentController.getAppointmentsByStatus);
// Status-specific routes - removed as it's now handled by getAllAppointments with status filter

module.exports = router; 