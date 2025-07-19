const { asyncHandler } = require('../middleware/errorHandler');
const { NotFoundError, AuthorizationError, AuthenticationError } = require('../middleware/errorHandler');
const dbManager = require('../utils/database');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

// Get user profile (with language)
const getProfile = asyncHandler(async (req, res) => {
    const user = await dbManager.get('SELECT id, username, email, full_name, phone, avatar, role, department_id, language, created_at, updated_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
        return res.status(404).json({ success: false, message: req.t('user.notfound') });
    }
    return res.json({ success: true, data: user });
});

// Update user profile (including language)
const updateProfile = asyncHandler(async (req, res) => {
    const { full_name, email, phone, avatar, language } = req.body;
    const updateFields = [];
    const params = [];
    if (full_name) { updateFields.push('full_name = ?'); params.push(full_name); }
    if (email) { updateFields.push('email = ?'); params.push(email); }
    if (phone) { updateFields.push('phone = ?'); params.push(phone); }
    if (avatar) { updateFields.push('avatar = ?'); params.push(avatar); }
    if (language) { updateFields.push('language = ?'); params.push(language); }
    if (updateFields.length === 0) {
        return res.status(400).json({ success: false, message: req.t('error.validation') });
    }
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.user.id);
    await dbManager.run(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);
    return res.json({ success: true, message: req.t('profile.updated') });
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;
    const user = await dbManager.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
        return res.status(404).json({ success: false, message: req.t('user.notfound') });
    }
    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
        return res.status(400).json({ success: false, message: req.t('error.validation') });
    }
    const newPasswordHash = await bcrypt.hash(new_password, 10);
    await dbManager.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPasswordHash, req.user.id]);
    logger.info('Password changed', { userId: req.user.id });
    return res.json({ success: true, message: req.t('password.changed') });
});

// List all users (admin only)
const listUsers = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') throw new AuthorizationError(req.t('error.forbidden'));
    const users = await dbManager.query('SELECT id, username, email, full_name, phone, avatar, role, department_id, language, is_active, email_verified, created_at, updated_at FROM users');
    return res.json({ success: true, data: users });
});

// Get user by ID (admin only)
const getUserById = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') throw new AuthorizationError(req.t('error.forbidden'));
    const { id } = req.params;
    const user = await dbManager.get('SELECT id, username, email, full_name, phone, avatar, role, department_id, language, is_active, email_verified, created_at, updated_at FROM users WHERE id = ?', [id]);
    if (!user) {
        return res.status(404).json({ success: false, message: req.t('user.notfound') });
    }
    return res.json({ success: true, data: user });
});

// Update user (admin only)
const updateUser = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') throw new AuthorizationError(req.t('error.forbidden'));
    const { id } = req.params;
    const { full_name, email, phone, avatar, role, department_id, language, is_active, email_verified } = req.body;
    const updateFields = [];
    const params = [];
    if (full_name !== undefined) { updateFields.push('full_name = ?'); params.push(full_name); }
    if (email !== undefined) { updateFields.push('email = ?'); params.push(email); }
    if (phone !== undefined) { updateFields.push('phone = ?'); params.push(phone); }
    if (avatar !== undefined) { updateFields.push('avatar = ?'); params.push(avatar); }
    if (role !== undefined) { updateFields.push('role = ?'); params.push(role); }
    if (department_id !== undefined) { updateFields.push('department_id = ?'); params.push(department_id); }
    if (language !== undefined) { updateFields.push('language = ?'); params.push(language); }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (email_verified !== undefined) { updateFields.push('email_verified = ?'); params.push(email_verified ? 1 : 0); }
    if (updateFields.length === 0) {
        return res.status(400).json({ success: false, message: req.t('error.validation') });
    }
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await dbManager.run(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);
    logger.info('User updated by admin', { userId: id, adminId: req.user.id });
    return res.json({ success: true, message: req.t('user.updated') });
});

// Delete user (admin only)
const deleteUser = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') throw new AuthorizationError(req.t('error.forbidden'));
    const { id } = req.params;
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ success: false, message: req.t('user.cannot_delete_self') });
    }
    const user = await dbManager.get('SELECT username FROM users WHERE id = ?', [id]);
    if (!user) {
        return res.status(404).json({ success: false, message: req.t('user.notfound') });
    }
    await dbManager.run('DELETE FROM users WHERE id = ?', [id]);
    logger.info('User deleted by admin', { userId: id, adminId: req.user.id, username: user.username });
    return res.json({ success: true, message: req.t('user.deleted') });
});

// User statistics (admin only)
const userStats = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') throw new AuthorizationError(req.t('error.forbidden'));
    const stats = await dbManager.get(`
        SELECT 
            COUNT(*) as total_users,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
            SUM(CASE WHEN role = 'employee' THEN 1 ELSE 0 END) as employee_count,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
            SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_users,
            SUM(CASE WHEN two_factor_enabled = 1 THEN 1 ELSE 0 END) as two_factor_users
        FROM users
    `);
    return res.json({ success: true, data: stats });
});

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    listUsers,
    getUserById,
    updateUser,
    deleteUser,
    userStats
};