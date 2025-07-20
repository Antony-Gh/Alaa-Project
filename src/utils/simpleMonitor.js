const os = require('os');
const logger = require('./logger');

class SimpleMonitor {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
  }

  // Get basic system metrics
  getSystemMetrics() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: {
        process: process.uptime(),
        server: uptime / 1000,
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000), // ms
        system: Math.round(cpuUsage.system / 1000), // ms
      },
      system: {
        loadAverage: os.loadavg(),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024), // MB
        freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
        platform: os.platform(),
        arch: os.arch(),
      },
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        successRate:
          this.requestCount > 0
            ? (
                ((this.requestCount - this.errorCount) / this.requestCount) *
                100
              ).toFixed(2)
            : 100,
        avgResponseTime:
          this.responseTimes.length > 0
            ? Math.round(
                this.responseTimes.reduce((a, b) => a + b, 0) /
                  this.responseTimes.length
              )
            : 0,
      },
    };
  }

  // Record a request
  recordRequest(duration, isError = false) {
    this.requestCount++;
    if (isError) {
      this.errorCount++;
    }

    // Keep only last 100 response times for average calculation
    this.responseTimes.push(duration);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  // Get formatted metrics for display
  getFormattedMetrics() {
    const metrics = this.getSystemMetrics();

    return {
      title: 'System Status',
      timestamp: new Date().toISOString(),
      uptime: {
        process: `${Math.floor(metrics.uptime.process / 3600)}h ${Math.floor((metrics.uptime.process % 3600) / 60)}m`,
        server: `${Math.floor(metrics.uptime.server / 3600)}h ${Math.floor((metrics.uptime.server % 3600) / 60)}m`,
      },
      memory: {
        used: `${metrics.memory.heapUsed}MB / ${metrics.memory.heapTotal}MB`,
        percentage: Math.round(
          (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100
        ),
      },
      requests: {
        total: metrics.requests.total,
        errors: metrics.requests.errors,
        successRate: `${metrics.requests.successRate}%`,
        avgResponseTime: `${metrics.requests.avgResponseTime}ms`,
      },
      system: {
        loadAverage: metrics.system.loadAverage.map(load => load.toFixed(2)),
        memoryUsage: `${Math.round(((metrics.system.totalMemory - metrics.system.freeMemory) / metrics.system.totalMemory) * 100)}%`,
      },
    };
  }

  // Log metrics periodically
  startPeriodicLogging(intervalMs = 60000) {
    // Default: every minute
    setInterval(() => {
      const metrics = this.getFormattedMetrics();
      logger.info('📊 System Metrics', metrics);
    }, intervalMs);
  }

  // Reset counters
  reset() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimes = [];
  }
}

// Create singleton instance
const simpleMonitor = new SimpleMonitor();

module.exports = simpleMonitor;
