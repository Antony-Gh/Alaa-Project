const LocationService = require('../services/locationService');

// Get all locations
const getAllLocations = async (req, res) => {
    try {
        const locations = await LocationService.getAllLocations();
        res.json(locations);
    } catch (error) {
        console.error('Error getting locations:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get location by ID
const getLocationById = async (req, res) => {
    try {
        const { id } = req.params;
        const location = await LocationService.getLocationById(id);
        
        if (!location) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        res.json(location);
    } catch (error) {
        console.error('Error getting location by ID:', error);
        res.status(500).json({ error: error.message });
    }
};

// Create new location
const createLocation = async (req, res) => {
    try {
        const { name, capacity, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'اسم الموقع مطلوب' });
        }

        if (capacity && (isNaN(capacity) || capacity < 1)) {
            return res.status(400).json({ error: 'السعة يجب أن تكون رقم موجب' });
        }

        const result = await LocationService.createLocation({ name, capacity, description });
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating location:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update location
const updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, capacity, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'اسم الموقع مطلوب' });
        }

        if (capacity && (isNaN(capacity) || capacity < 1)) {
            return res.status(400).json({ error: 'السعة يجب أن تكون رقم موجب' });
        }

        const result = await LocationService.updateLocation(id, { name, capacity, description });
        res.json(result);
    } catch (error) {
        console.error('Error updating location:', error);
        if (error.message === 'الموقع غير موجود') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// Delete location
const deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await LocationService.deleteLocation(id);
        res.json(result);
    } catch (error) {
        console.error('Error deleting location:', error);
        if (error.message === 'الموقع غير موجود') {
            res.status(404).json({ error: error.message });
        } else if (error.message.includes('لا يمكن حذف الموقع')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
};

// Get location availability
const getLocationAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time } = req.query;

        if (!date || !time) {
            return res.status(400).json({ error: 'التاريخ والوقت مطلوبان' });
        }

        const availability = await LocationService.getLocationAvailability(id, date, time);
        
        if (!availability) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        res.json(availability);
    } catch (error) {
        console.error('Error getting location availability:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get available locations
const getAvailableLocations = async (req, res) => {
    try {
        const { date, time } = req.query;

        if (!date || !time) {
            return res.status(400).json({ error: 'التاريخ والوقت مطلوبان' });
        }

        const locations = await LocationService.getAvailableLocations(date, time);
        res.json(locations);
    } catch (error) {
        console.error('Error getting available locations:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get location statistics
const getLocationStats = async (req, res) => {
    try {
        const stats = await LocationService.getLocationStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting location stats:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    getLocationAvailability,
    getAvailableLocations,
    getLocationStats
}; 