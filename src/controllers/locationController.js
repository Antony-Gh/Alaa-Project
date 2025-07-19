const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError } = require('../middleware/errorHandler');
const ResponseHandler = require('../utils/responseHandler');
const dbManager = require('../utils/database');
const logger = require('../utils/logger');

// Get all locations
const getAllLocations = asyncHandler(async (req, res) => {
    const locations = await dbManager.query('SELECT * FROM locations ORDER BY name');
    return ResponseHandler.success(res, locations, req.t('location.fetched_all'));
});

// Get location by ID
const getLocationById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const location = await dbManager.get('SELECT * FROM locations WHERE id = ?', [id]);
    if (!location) {
        throw new NotFoundError('Location');
    }

    return ResponseHandler.success(res, location, req.t('location.fetched'));
});

// Create new location (admin only)
const createLocation = asyncHandler(async (req, res) => {
    const { name, capacity, description } = req.body;

    // Check if location name already exists
    const existingLocation = await dbManager.get('SELECT id FROM locations WHERE name = ?', [name]);
    if (existingLocation) {
        return ResponseHandler.error(res, req.t('location.duplicate'), 400, 'DUPLICATE_LOCATION');
    }

    const result = await dbManager.run(
        'INSERT INTO locations (name, capacity, description) VALUES (?, ?, ?)',
        [name, capacity, description]
    );

    const newLocation = await dbManager.get('SELECT * FROM locations WHERE id = ?', [result.id]);

    logger.info('Location created', { 
        locationId: result.id, 
        name, 
        adminId: req.user.id 
    });

    return ResponseHandler.created(res, newLocation, req.t('location.created'));
});

// Update location (admin only)
const updateLocation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, capacity, description } = req.body;

    // Check if location exists
    const existingLocation = await dbManager.get('SELECT * FROM locations WHERE id = ?', [id]);
    if (!existingLocation) {
        throw new NotFoundError('Location');
    }

    // Check if new name conflicts with existing location
    if (name && name !== existingLocation.name) {
        const nameConflict = await dbManager.get('SELECT id FROM locations WHERE name = ? AND id != ?', [name, id]);
        if (nameConflict) {
            return ResponseHandler.error(res, req.t('location.duplicate'), 400, 'DUPLICATE_LOCATION');
        }
    }

    const result = await dbManager.run(
        'UPDATE locations SET name = ?, capacity = ?, description = ? WHERE id = ?',
        [name, capacity, description, id]
    );

    if (result.changes === 0) {
        throw new NotFoundError('Location');
    }

    const updatedLocation = await dbManager.get('SELECT * FROM locations WHERE id = ?', [id]);

    logger.info('Location updated', { 
        locationId: id, 
        adminId: req.user.id 
    });

    return ResponseHandler.success(res, updatedLocation, req.t('location.updated'));
});

// Delete location (admin only)
const deleteLocation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if location exists
    const location = await dbManager.get('SELECT * FROM locations WHERE id = ?', [id]);
    if (!location) {
        throw new NotFoundError('Location');
    }

    // Check if location has appointments
    const appointmentsWithLocation = await dbManager.get(
        'SELECT COUNT(*) as count FROM appointments WHERE location_id = ?',
        [id]
    );

    if (appointmentsWithLocation.count > 0) {
        return ResponseHandler.error(
            res, 
            req.t('location.delete_has_appointments'), 
            400, 
            'LOCATION_HAS_APPOINTMENTS'
        );
    }

    const result = await dbManager.run('DELETE FROM locations WHERE id = ?', [id]);

    if (result.changes === 0) {
        throw new NotFoundError('Location');
    }

    logger.info('Location deleted', { 
        locationId: id, 
        adminId: req.user.id 
    });

    return ResponseHandler.success(res, null, req.t('location.deleted'));
});

// Get location availability for a specific date and time
const getLocationAvailability = asyncHandler(async (req, res) => {
    const { date, time } = req.query;

    if (!date || !time) {
        return ResponseHandler.error(res, req.t('location.missing_parameters'), 400, 'MISSING_PARAMETERS');
    }

    // Get all locations
    const locations = await dbManager.query('SELECT * FROM locations ORDER BY name');

    // Check which locations are available at the specified date and time
    const availability = await Promise.all(
        locations.map(async (location) => {
            const conflictingAppointments = await dbManager.get(`
                SELECT COUNT(*) as count 
                FROM appointments 
                WHERE location_id = ? 
                AND requested_date = ? 
                AND requested_time = ? 
                AND status IN ('pending', 'approved')
            `, [location.id, date, time]);

            return {
                ...location,
                available: conflictingAppointments.count === 0,
                conflictingAppointments: conflictingAppointments.count
            };
        })
    );

    return ResponseHandler.success(res, availability, req.t('location.availability_fetched'));
});

module.exports = {
    getAllLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    getLocationAvailability
}; 