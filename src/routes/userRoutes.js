const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const dbManager = require('../utils/database');
const ResponseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');

// Get user profile
router.get('/profile', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const user = await dbManager.get(
      `
            SELECT 
                u.id, u.username, u.email, u.full_name, u.phone, u.avatar, u.role,
                u.is_active, u.email_verified, u.two_factor_enabled, u.last_login,
                u.preferences, u.created_at, u.updated_at,
                d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
        `,
      [req.user.id]
    );

    if (!user) {
      return ResponseHandler.error(res, 'المستخدم غير موجود', 404);
    }

    // Parse preferences
    if (user.preferences) {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (e) {
        user.preferences = {};
      }
    }

    return ResponseHandler.success(res, user, 'تم جلب الملف الشخصي بنجاح');
  } catch (error) {
    logger.error('❌ Get user profile error', { error: error.message });
    return ResponseHandler.error(res, 'حدث خطأ في جلب الملف الشخصي', 500);
  }
});

// Update user profile
router.put('/profile', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const { full_name, email, phone, avatar } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await dbManager.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.user.id]
      );
      if (existingUser) {
        return ResponseHandler.error(
          res,
          'البريد الإلكتروني مستخدم بالفعل',
          400
        );
      }
    }

    const updateFields = [];
    const params = [];

    if (full_name) {
      updateFields.push('full_name = ?');
      params.push(full_name);
    }
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (phone) {
      updateFields.push('phone = ?');
      params.push(phone);
    }
    if (avatar) {
      updateFields.push('avatar = ?');
      params.push(avatar);
    }

    if (updateFields.length === 0) {
      return ResponseHandler.error(res, 'لا توجد بيانات للتحديث', 400);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.user.id);

    await dbManager.run(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    return ResponseHandler.success(res, null, 'تم تحديث الملف الشخصي بنجاح');
  } catch (error) {
    logger.error('❌ Update user profile error', { error: error.message });
    return ResponseHandler.error(res, 'حدث خطأ في تحديث الملف الشخصي', 500);
  }
});

// Change password
router.put(
  '/change-password',
  authenticateToken,
  generalLimiter,
  async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return ResponseHandler.error(
          res,
          'كلمة المرور الحالية والجديدة مطلوبتان',
          400
        );
      }

      // Get current user with password
      const user = await dbManager.get(
        'SELECT password_hash FROM users WHERE id = ?',
        [req.user.id]
      );
      if (!user) {
        return ResponseHandler.error(res, 'المستخدم غير موجود', 404);
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        current_password,
        user.password_hash
      );
      if (!isValidPassword) {
        return ResponseHandler.error(res, 'كلمة المرور الحالية غير صحيحة', 400);
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(new_password, 10);

      // Update password
      await dbManager.run(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, req.user.id]
      );

      logger.info('Password changed', { userId: req.user.id });
      return ResponseHandler.success(res, null, 'تم تغيير كلمة المرور بنجاح');
    } catch (error) {
      logger.error('❌ Change password error', { error: error.message });
      return ResponseHandler.error(res, 'حدث خطأ في تغيير كلمة المرور', 500);
    }
  }
);

// Get all users (admin only)
router.get(
  '/',
  authenticateToken,
  requireAdmin,
  generalLimiter,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        department_id,
        is_active,
        search,
      } = req.query;
      const offset = (page - 1) * limit;

      let sql = `
            SELECT 
                u.id, u.username, u.email, u.full_name, u.phone, u.avatar, u.role,
                u.is_active, u.email_verified, u.two_factor_enabled, u.last_login,
                u.created_at, u.updated_at,
                d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
        `;

      const params = [];
      const conditions = [];

      if (role) {
        conditions.push('u.role = ?');
        params.push(role);
      }

      if (department_id) {
        conditions.push('u.department_id = ?');
        params.push(department_id);
      }

      if (is_active !== undefined) {
        conditions.push('u.is_active = ?');
        params.push(is_active === 'true' ? 1 : 0);
      }

      if (search) {
        conditions.push(`(
                u.username LIKE ? OR 
                u.full_name LIKE ? OR 
                u.email LIKE ?
            )`);
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }

      sql += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), offset);

      const users = await dbManager.query(sql, params);

      // Get total count
      let countSql = 'SELECT COUNT(*) as total FROM users u';
      const countParams = [];

      if (conditions.length > 0) {
        countSql += ` WHERE ${conditions.join(' AND ')}`;
        countParams.push(...params.slice(0, -2));
      }

      const totalResult = await dbManager.get(countSql, countParams);
      const total = totalResult.total;

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      };

      return ResponseHandler.success(
        res,
        { users, pagination },
        'تم جلب المستخدمين بنجاح'
      );
    } catch (error) {
      logger.error('❌ Get users error', { error: error.message });
      return ResponseHandler.error(res, 'حدث خطأ في جلب المستخدمين', 500);
    }
  }
);

// Get user by ID (admin only)
router.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  generalLimiter,
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await dbManager.get(
        `
            SELECT 
                u.id, u.username, u.email, u.full_name, u.phone, u.avatar, u.role,
                u.is_active, u.email_verified, u.two_factor_enabled, u.last_login,
                u.login_attempts, u.locked_until, u.preferences, u.created_at, u.updated_at,
                d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?
        `,
        [id]
      );

      if (!user) {
        return ResponseHandler.error(res, 'المستخدم غير موجود', 404);
      }

      // Parse preferences
      if (user.preferences) {
        try {
          user.preferences = JSON.parse(user.preferences);
        } catch (e) {
          user.preferences = {};
        }
      }

      return ResponseHandler.success(res, user, 'تم جلب المستخدم بنجاح');
    } catch (error) {
      logger.error('❌ Get user by ID error', { error: error.message });
      return ResponseHandler.error(res, 'حدث خطأ في جلب المستخدم', 500);
    }
  }
);

// Update user (admin only)
router.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  generalLimiter,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        full_name,
        email,
        phone,
        role,
        department_id,
        is_active,
        email_verified,
      } = req.body;

      // Check if user exists
      const existingUser = await dbManager.get(
        'SELECT id FROM users WHERE id = ?',
        [id]
      );
      if (!existingUser) {
        return ResponseHandler.error(res, 'المستخدم غير موجود', 404);
      }

      // Check if email is already taken by another user
      if (email) {
        const emailUser = await dbManager.get(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [email, id]
        );
        if (emailUser) {
          return ResponseHandler.error(
            res,
            'البريد الإلكتروني مستخدم بالفعل',
            400
          );
        }
      }

      const updateFields = [];
      const params = [];

      if (full_name !== undefined) {
        updateFields.push('full_name = ?');
        params.push(full_name);
      }
      if (email !== undefined) {
        updateFields.push('email = ?');
        params.push(email);
      }
      if (phone !== undefined) {
        updateFields.push('phone = ?');
        params.push(phone);
      }
      if (role !== undefined) {
        updateFields.push('role = ?');
        params.push(role);
      }
      if (department_id !== undefined) {
        updateFields.push('department_id = ?');
        params.push(department_id);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }
      if (email_verified !== undefined) {
        updateFields.push('email_verified = ?');
        params.push(email_verified ? 1 : 0);
      }

      if (updateFields.length === 0) {
        return ResponseHandler.error(res, 'لا توجد بيانات للتحديث', 400);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      await dbManager.run(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );

      logger.info('User updated by admin', {
        userId: id,
        adminId: req.user.id,
      });
      return ResponseHandler.success(res, null, 'تم تحديث المستخدم بنجاح');
    } catch (error) {
      logger.error('❌ Update user error', { error: error.message });
      return ResponseHandler.error(res, 'حدث خطأ في تحديث المستخدم', 500);
    }
  }
);

// Delete user (admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  generalLimiter,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (parseInt(id) === req.user.id) {
        return ResponseHandler.error(res, 'لا يمكنك حذف حسابك الخاص', 400);
      }

      // Check if user exists
      const user = await dbManager.get(
        'SELECT username FROM users WHERE id = ?',
        [id]
      );
      if (!user) {
        return ResponseHandler.error(res, 'المستخدم غير موجود', 404);
      }

      // Delete user
      await dbManager.run('DELETE FROM users WHERE id = ?', [id]);

      logger.info('User deleted by admin', {
        userId: id,
        adminId: req.user.id,
        username: user.username,
      });
      return ResponseHandler.success(res, null, 'تم حذف المستخدم بنجاح');
    } catch (error) {
      logger.error('❌ Delete user error', { error: error.message });
      return ResponseHandler.error(res, 'حدث خطأ في حذف المستخدم', 500);
    }
  }
);

// Get user statistics
router.get(
  '/stats/overview',
  authenticateToken,
  requireAdmin,
  generalLimiter,
  async (req, res) => {
    try {
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

      return ResponseHandler.success(
        res,
        stats,
        'تم جلب إحصائيات المستخدمين بنجاح'
      );
    } catch (error) {
      logger.error('❌ User stats error', { error: error.message });
      return ResponseHandler.error(res, 'حدث خطأ في جلب الإحصائيات', 500);
    }
  }
);

module.exports = router;
