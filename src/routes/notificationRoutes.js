const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/security');
const dbManager = require('../utils/database');
const ResponseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const realtimeService = require('../services/realtimeService');

// Get user notifications
router.get('/', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, is_read } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (is_read !== undefined) {
      sql += ' AND is_read = ?';
      params.push(is_read === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const notifications = await dbManager.query(sql, params);

    // Get total count
    let countSql =
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const countParams = [req.user.id];

    if (type) {
      countSql += ' AND type = ?';
      countParams.push(type);
    }

    if (is_read !== undefined) {
      countSql += ' AND is_read = ?';
      countParams.push(is_read === 'true' ? 1 : 0);
    }

    const totalResult = await dbManager.get(countSql, countParams);
    const total = totalResult.total;

    // Parse JSON data
    notifications.forEach(notification => {
      if (notification.data) {
        try {
          notification.data = JSON.parse(notification.data);
        } catch (e) {
          notification.data = {};
        }
      }
    });

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
      { notifications, pagination },
      'تم جلب الإشعارات بنجاح'
    );
  } catch (error) {
    logger.error('❌ Get notifications error', { error: error.message });
    return ResponseHandler.error(res, 'حدث خطأ في جلب الإشعارات', 500);
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dbManager.run(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return ResponseHandler.error(res, 'الإشعار غير موجود', 404);
    }

    return ResponseHandler.success(res, null, 'تم تحديث حالة الإشعار بنجاح');
  } catch (error) {
    logger.error('❌ Mark notification read error', { error: error.message });
    return ResponseHandler.error(res, 'حدث خطأ في تحديث الإشعار', 500);
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const result = await dbManager.run(
      'UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    return ResponseHandler.success(
      res,
      { updatedCount: result.changes },
      'تم تحديث جميع الإشعارات بنجاح'
    );
  } catch (error) {
    logger.error('❌ Mark all notifications read error', {
      error: error.message,
    });
    return ResponseHandler.error(res, 'حدث خطأ في تحديث الإشعارات', 500);
  }
});

// Delete notification
router.delete('/:id', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dbManager.run(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return ResponseHandler.error(res, 'الإشعار غير موجود', 404);
    }

    return ResponseHandler.success(res, null, 'تم حذف الإشعار بنجاح');
  } catch (error) {
    logger.error('❌ Delete notification error', { error: error.message });
    return ResponseHandler.error(res, 'حدث خطأ في حذف الإشعار', 500);
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const stats = await dbManager.get(
      `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
                SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read,
                SUM(CASE WHEN type = 'email' THEN 1 ELSE 0 END) as email,
                SUM(CASE WHEN type = 'push' THEN 1 ELSE 0 END) as push,
                SUM(CASE WHEN type = 'sms' THEN 1 ELSE 0 END) as sms,
                SUM(CASE WHEN type = 'in_app' THEN 1 ELSE 0 END) as in_app
            FROM notifications 
            WHERE user_id = ?
        `,
      [req.user.id]
    );

    return ResponseHandler.success(
      res,
      stats,
      'تم جلب إحصائيات الإشعارات بنجاح'
    );
  } catch (error) {
    logger.error('❌ Notification stats error', { error: error.message });
    return ResponseHandler.error(res, 'حدث خطأ في جلب الإحصائيات', 500);
  }
});

// Send test notification (admin only)
router.post('/test', authenticateToken, generalLimiter, async (req, res) => {
  try {
    const { type = 'in_app', title, message } = req.body;

    if (!title || !message) {
      return ResponseHandler.error(res, 'العنوان والرسالة مطلوبان', 400);
    }

    // Create notification record
    const notificationId = await dbManager.run(
      `
            INSERT INTO notifications (user_id, type, title, message, data, sent_at) 
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
      [req.user.id, type, title, message, JSON.stringify({ test: true })]
    );

    // Send real-time notification
    realtimeService.sendToUser(req.user.id, 'notification:new', {
      id: notificationId.lastID,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
    });

    // Send email if requested
    if (type === 'email' && req.user.email) {
      await emailService.sendEmail(req.user.email, title, message);
    }

    return ResponseHandler.success(
      res,
      { notificationId: notificationId.lastID },
      'تم إرسال الإشعار التجريبي بنجاح'
    );
  } catch (error) {
    logger.error('❌ Test notification error', { error: error.message });
    return ResponseHandler.error(res, 'حدث خطأ في إرسال الإشعار التجريبي', 500);
  }
});

// Get notification preferences
router.get(
  '/preferences',
  authenticateToken,
  generalLimiter,
  async (req, res) => {
    try {
      const user = await dbManager.get(
        'SELECT preferences FROM users WHERE id = ?',
        [req.user.id]
      );

      let preferences = {
        email: true,
        push: true,
        sms: false,
        in_app: true,
        appointment_reminders: true,
        status_updates: true,
        system_notifications: true,
      };

      if (user.preferences) {
        try {
          const userPrefs = JSON.parse(user.preferences);
          preferences = { ...preferences, ...userPrefs };
        } catch (e) {
          logger.warn('⚠️ Invalid user preferences JSON', {
            userId: req.user.id,
          });
        }
      }

      return ResponseHandler.success(
        res,
        preferences,
        'تم جلب تفضيلات الإشعارات بنجاح'
      );
    } catch (error) {
      logger.error('❌ Get notification preferences error', {
        error: error.message,
      });
      return ResponseHandler.error(res, 'حدث خطأ في جلب التفضيلات', 500);
    }
  }
);

// Update notification preferences
router.put(
  '/preferences',
  authenticateToken,
  generalLimiter,
  async (req, res) => {
    try {
      const {
        email,
        push,
        sms,
        in_app,
        appointment_reminders,
        status_updates,
        system_notifications,
      } = req.body;

      const preferences = {
        email: email !== undefined ? email : true,
        push: push !== undefined ? push : true,
        sms: sms !== undefined ? sms : false,
        in_app: in_app !== undefined ? in_app : true,
        appointment_reminders:
          appointment_reminders !== undefined ? appointment_reminders : true,
        status_updates: status_updates !== undefined ? status_updates : true,
        system_notifications:
          system_notifications !== undefined ? system_notifications : true,
      };

      await dbManager.run(
        'UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [JSON.stringify(preferences), req.user.id]
      );

      return ResponseHandler.success(
        res,
        preferences,
        'تم تحديث تفضيلات الإشعارات بنجاح'
      );
    } catch (error) {
      logger.error('❌ Update notification preferences error', {
        error: error.message,
      });
      return ResponseHandler.error(res, 'حدث خطأ في تحديث التفضيلات', 500);
    }
  }
);

module.exports = router;
