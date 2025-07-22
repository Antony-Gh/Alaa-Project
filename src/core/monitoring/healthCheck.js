const dbManager = require('../../utils/database');
const cacheService = require('../../services/cacheService');
const logger = require('../../utils/logger');
const config = require('../../config/config');

/**
 * Comprehensive health check system
 */
class HealthCheck {
  constructor() {
    this.checks = new Map();
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  registerDefaultChecks() {
    this.register('database', this.checkDatabase.bind(this));
    this.register('cache', this.checkCache.bind(this));
    this.register('memory', this.checkMemory.bind(this));
    this.register('disk', this.checkDisk.bind(this));
    this.register('external_services', this.checkExternalServices.bind(this));
  }

  /**
   * Register a health check
   */
  register(name, checkFunction, options = {}) {
    this.checks.set(name, {
      check: checkFunction,
      timeout: options.timeout || 5000,
      critical: options.critical !== false,
    });
  }

  /**
   * Run all health checks
   */
  async runAll() {
    const results = {};
    const startTime = Date.now();

    for (const [name, config] of this.checks) {
      const checkStartTime = Date.now();
      try {
        const result = await Promise.race([
          config.check(),
          this.timeout(config.timeout),
        ]);

        results[name] = {
          status: 'healthy',
          responseTime: Date.now() - checkStartTime,
          ...result,
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          responseTime: Date.now() - checkStartTime,
          critical: config.critical,
        };
      }
    }

    const overallStatus = this.determineOverallStatus(results);
    const totalTime = Date.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      checks: results,
      version: process.env.npm_package_version || '1.0.0',
      environment: config.env,
    };
  }

  /**
   * Determine overall health status
   */
  determineOverallStatus(results) {
    const criticalFailures = Object.values(results).filter(
      result => result.status === 'unhealthy' && result.critical
    );

    if (criticalFailures.length > 0) {
      return 'unhealthy';
    }

    const anyFailures = Object.values(results).some(
      result => result.status === 'unhealthy'
    );

    return anyFailures ? 'degraded' : 'healthy';
  }

  /**
   * Create timeout promise
   */
  timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), ms);
    });
  }

  /**
   * Database health check
   */
  async checkDatabase() {
    const startTime = Date.now();

    // Test basic connectivity
    await dbManager.get('SELECT 1 as test');

    // Test write capability
    const testResult = await dbManager.run(
      'INSERT INTO audit_logs (action, details) VALUES (?, ?)',
      ['health_check', JSON.stringify({ timestamp: Date.now() })]
    );

    // Clean up test data
    await dbManager.run('DELETE FROM audit_logs WHERE id = ?', [
      testResult.lastID,
    ]);

    return {
      responseTime: Date.now() - startTime,
      details: 'Database read/write operations successful',
    };
  }

  /**
   * Cache health check
   */
  async checkCache() {
    const testKey = `health_check_${Date.now()}`;
    const testValue = 'test_value';

    // Test cache write
    await cacheService.set(testKey, testValue, 10);

    // Test cache read
    const retrievedValue = await cacheService.get(testKey);

    if (retrievedValue !== testValue) {
      throw new Error('Cache read/write mismatch');
    }

    // Clean up
    await cacheService.del(testKey);

    return {
      details: 'Cache read/write operations successful',
    };
  }

  /**
   * Memory health check
   */
  async checkMemory() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();

    const usedMemoryPercent = ((totalMem - freeMem) / totalMem) * 100;
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const status = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsedPercent: Math.round(heapUsedPercent),
      systemMemoryUsedPercent: Math.round(usedMemoryPercent),
    };

    // Warning thresholds
    if (heapUsedPercent > 90 || usedMemoryPercent > 90) {
      throw new Error(
        `High memory usage: Heap ${heapUsedPercent}%, System ${usedMemoryPercent}%`
      );
    }

    return status;
  }

  /**
   * Disk space health check
   */
  async checkDisk() {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const stats = await fs.stat(process.cwd());

      // Simple disk space check (this is basic, in production you'd want more sophisticated checks)
      return {
        details: 'Disk access successful',
        path: process.cwd(),
      };
    } catch (error) {
      throw new Error(`Disk access failed: ${error.message}`);
    }
  }

  /**
   * External services health check
   */
  async checkExternalServices() {
    const checks = [];

    // Check email service if configured
    if (config.email.host && config.email.host !== 'localhost') {
      checks.push(this.checkEmailService());
    }

    // Check Redis if configured
    if (config.cache.type === 'redis' && config.cache.redis.url) {
      checks.push(this.checkRedisService());
    }

    const results = await Promise.allSettled(checks);
    const failures = results.filter(r => r.status === 'rejected');

    if (failures.length > 0) {
      throw new Error(
        `External service checks failed: ${failures.length}/${results.length}`
      );
    }

    return {
      details: `All external services healthy (${results.length} checked)`,
    };
  }

  /**
   * Check email service
   */
  async checkEmailService() {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      auth: config.email.auth.user ? config.email.auth : undefined,
    });

    await transporter.verify();
    return true;
  }

  /**
   * Check Redis service
   */
  async checkRedisService() {
    const Redis = require('ioredis');
    const redis = new Redis(config.cache.redis.url);

    await redis.ping();
    await redis.disconnect();
    return true;
  }
}

module.exports = new HealthCheck();
