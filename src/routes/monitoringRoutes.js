const express = require('express');
const router = express.Router();
const healthCheck = require('../core/monitoring/healthCheck');
const metricsCollector = require('../core/monitoring/metricsCollector');
const cacheService = require('../services/cacheService');
const { requireAdmin } = require('../middleware/rbac');
const { responseHandler } = require('../utils/responseHandler');

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = await healthCheck.runAll();
    const statusCode =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 200
          : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Readiness check endpoint
 */
router.get('/ready', async (req, res) => {
  try {
    // Quick checks for readiness
    const checks = await Promise.allSettled([
      healthCheck.checkDatabase(),
      healthCheck.checkCache(),
    ]);

    const failures = checks.filter(check => check.status === 'rejected');

    if (failures.length > 0) {
      return res.status(503).json({
        ready: false,
        failures: failures.map(f => f.reason.message),
      });
    }

    res.json({ ready: true });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
    });
  }
});

/**
 * Liveness check endpoint
 */
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Metrics endpoint (Prometheus format)
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = metricsCollector.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Metrics summary endpoint (JSON format)
 */
router.get('/metrics/summary', requireAdmin, async (req, res) => {
  try {
    const summary = metricsCollector.getSummary();
    responseHandler.success(res, summary, 'Metrics summary retrieved');
  } catch (error) {
    responseHandler.error(res, error);
  }
});

/**
 * Cache statistics endpoint
 */
router.get('/cache/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    responseHandler.success(res, stats, 'Cache statistics retrieved');
  } catch (error) {
    responseHandler.error(res, error);
  }
});

/**
 * System information endpoint
 */
router.get('/system', requireAdmin, (req, res) => {
  try {
    const systemInfo = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        pid: process.pid,
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    responseHandler.success(res, systemInfo, 'System information retrieved');
  } catch (error) {
    responseHandler.error(res, error);
  }
});

/**
 * Clear cache endpoint
 */
router.post('/cache/clear', requireAdmin, async (req, res) => {
  try {
    await cacheService.flush();
    responseHandler.success(res, null, 'Cache cleared successfully');
  } catch (error) {
    responseHandler.error(res, error);
  }
});

/**
 * Reset metrics endpoint
 */
router.post('/metrics/reset', requireAdmin, (req, res) => {
  try {
    metricsCollector.reset();
    responseHandler.success(res, null, 'Metrics reset successfully');
  } catch (error) {
    responseHandler.error(res, error);
  }
});

module.exports = router;
