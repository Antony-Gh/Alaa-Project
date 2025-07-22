const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/security');
const dbManager = require('../utils/database');
const ResponseHandler = require('../utils/responseHandler');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

// Get analytics dashboard data
router.get(
  '/dashboard',
  authenticateToken,
  requireAdmin,
  generalLimiter,
  async (req, res) => {
    try {
      const { period = '30d' } = req.query;

      // Calculate date range
      const endDate = moment();
      const startDate = moment().subtract(parseInt(period), 'days');

      // Get appointment statistics
      const appointmentStats = await dbManager.get(
        `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
                SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
            FROM appointments 
            WHERE created_at >= ? AND created_at <= ?
        `,
        [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
      );

      // Get daily trends
      const dailyTrends = await dbManager.query(
        `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
            FROM appointments 
            WHERE created_at >= ? AND created_at <= ?
            GROUP BY DATE(created_at)
            ORDER BY date
        `,
        [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
      );

      // Get department performance
      const departmentPerformance = await dbManager.query(
        `
            SELECT 
                d.name as department_name,
                COUNT(*) as total_appointments,
                SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as approved_appointments,
                ROUND(
                    (SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
                ) as approval_rate
            FROM appointments a
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.created_at >= ? AND a.created_at <= ?
            GROUP BY d.id, d.name
            ORDER BY total_appointments DESC
        `,
        [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
      );

      // Get location utilization
      const locationUtilization = await dbManager.query(
        `
            SELECT 
                l.name as location_name,
                COUNT(*) as total_bookings,
                l.capacity,
                ROUND((COUNT(*) * 100.0 / l.capacity), 2) as utilization_rate
            FROM appointments a
            LEFT JOIN locations l ON a.location_id = l.id
            WHERE a.created_at >= ? AND a.created_at <= ?
            GROUP BY l.id, l.name, l.capacity
            ORDER BY utilization_rate DESC
        `,
        [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
      );

      // Get user activity
      const userActivity = await dbManager.query(
        `
            SELECT 
                u.username,
                u.full_name,
                COUNT(*) as appointments_created,
                MAX(a.created_at) as last_activity
            FROM appointments a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.created_at >= ? AND a.created_at <= ?
            GROUP BY u.id, u.username, u.full_name
            ORDER BY appointments_created DESC
            LIMIT 10
        `,
        [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
      );

      const dashboardData = {
        period,
        dateRange: {
          start: startDate.format('YYYY-MM-DD'),
          end: endDate.format('YYYY-MM-DD'),
        },
        overview: appointmentStats,
        trends: dailyTrends,
        departmentPerformance,
        locationUtilization,
        userActivity,
      };

      return ResponseHandler.success(
        res,
        dashboardData,
        'تم جلب بيانات لوحة التحكم بنجاح'
      );
    } catch (error) {
      logger.error('❌ Analytics dashboard error', { error: error.message });
      return ResponseHandler.error(res, 'حدث خطأ في جلب البيانات', 500);
    }
  }
);

// Get detailed analytics
router.get(
  '/detailed',
  authenticateToken,
  requireAdmin,
  generalLimiter,
  async (req, res) => {
    try {
      const { metric, start_date, end_date, group_by = 'day' } = req.query;

      let sql = '';
      const params = [];

      switch (metric) {
        case 'appointments_by_status':
          sql = `
                    SELECT 
                        status,
                        COUNT(*) as count,
                        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM appointments WHERE created_at >= ? AND created_at <= ?)), 2) as percentage
                    FROM appointments 
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY status
                    ORDER BY count DESC
                `;
          params.push(start_date, end_date, start_date, end_date);
          break;

        case 'appointments_by_department':
          sql = `
                    SELECT 
                        d.name as department_name,
                        COUNT(*) as total,
                        SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as approved,
                        SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                        ROUND((SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as approval_rate
                    FROM appointments a
                    LEFT JOIN departments d ON a.department_id = d.id
                    WHERE a.created_at >= ? AND a.created_at <= ?
                    GROUP BY d.id, d.name
                    ORDER BY total DESC
                `;
          params.push(start_date, end_date);
          break;

        case 'appointments_by_location':
          sql = `
                    SELECT 
                        l.name as location_name,
                        COUNT(*) as total_bookings,
                        l.capacity,
                        ROUND((COUNT(*) * 100.0 / l.capacity), 2) as utilization_rate
                    FROM appointments a
                    LEFT JOIN locations l ON a.location_id = l.id
                    WHERE a.created_at >= ? AND a.created_at <= ?
                    GROUP BY l.id, l.name, l.capacity
                    ORDER BY utilization_rate DESC
                `;
          params.push(start_date, end_date);
          break;

        case 'appointments_over_time': {
          const groupByClause =
            group_by === 'hour'
              ? 'DATE(created_at), HOUR(created_at)'
              : 'DATE(created_at)';
          sql = `
                    SELECT 
                        ${group_by === 'hour' ? 'DATE(created_at) as date, HOUR(created_at) as hour' : 'DATE(created_at) as date'},
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
                    FROM appointments 
                    WHERE created_at >= ? AND created_at <= ?
                    GROUP BY ${groupByClause}
                    ORDER BY date ${group_by === 'hour' ? ', hour' : ''}
                `;
          params.push(start_date, end_date);
          break;
        }

        default:
          return ResponseHandler.error(res, 'المقياس غير صحيح', 400);
      }

      const results = await dbManager.query(sql, params);

      return ResponseHandler.success(
        res,
        {
          metric,
          dateRange: { start_date, end_date },
          groupBy: group_by,
          data: results,
        },
        'تم جلب البيانات التفصيلية بنجاح'
      );
    } catch (error) {
      logger.error('❌ Detailed analytics error', { error: error.message });
      return ResponseHandler.error(
        res,
        'حدث خطأ في جلب البيانات التفصيلية',
        500
      );
    }
  }
);

// Export analytics data
router.get(
  '/export',
  authenticateToken,
  requireAdmin,
  generalLimiter,
  async (req, res) => {
    try {
      const { format = 'json', start_date, end_date } = req.query;

      const appointments = await dbManager.query(
        `
            SELECT 
                a.*,
                d.name as department_name,
                l.name as location_name,
                u.full_name as user_full_name
            FROM appointments a
            LEFT JOIN departments d ON a.department_id = d.id
            LEFT JOIN locations l ON a.location_id = l.id
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.created_at >= ? AND a.created_at <= ?
            ORDER BY a.created_at DESC
        `,
        [start_date, end_date]
      );

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeader =
          'ID,Title,Employee Name,Department,Location,Status,Requested Date,Requested Time,Created At\n';
        const csvData = appointments
          .map(
            apt =>
              `${apt.id},"${apt.title}","${apt.employee_name}","${apt.department_name}","${apt.location_name}","${apt.status}","${apt.requested_date}","${apt.requested_time}","${apt.created_at}"`
          )
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=appointments_${start_date}_${end_date}.csv`
        );
        return res.send(csvHeader + csvData);
      }

      // Default JSON format
      return ResponseHandler.success(
        res,
        {
          exportDate: new Date().toISOString(),
          dateRange: { start_date, end_date },
          totalRecords: appointments.length,
          data: appointments,
        },
        'تم تصدير البيانات بنجاح'
      );
    } catch (error) {
      logger.error('❌ Analytics export error', { error: error.message });
      return ResponseHandler.error(res, 'حدث خطأ في تصدير البيانات', 500);
    }
  }
);

module.exports = router;
