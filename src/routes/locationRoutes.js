const express = require('express');
const router = express.Router();
const {
    getAllLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    getLocationAvailability,
    getAvailableLocations,
    getLocationStats
} = require('../controllers/locationController');

// Get all locations
router.get('/', getAllLocations);

// Get location statistics
router.get('/stats', getLocationStats);

// Get available locations for a specific date and time
router.get('/available', getAvailableLocations);

// Get location by ID
router.get('/:id', getLocationById);

// Get location availability for a specific date and time
router.get('/:id/availability', getLocationAvailability);

// Create new location
router.post('/', createLocation);

// Update location
router.put('/:id', updateLocation);

// Delete location
router.delete('/:id', deleteLocation);

module.exports = router;