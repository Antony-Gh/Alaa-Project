const EventEmitter = require('events');
const logger = require('../../utils/logger');

/**
 * Application metrics collector
 */
class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.counters = new Map();
    this.histograms = new Map();
    this.gauges = new Map();

    this.startTime = Date.now();
    this.setupDefaultMetrics();
  }

  /**
   * Setup default system metrics
   */
  setupDefaultMetrics() {
    // HTTP request metrics
    this.createCounter('http_requests_total', 'Total HTTP requests');
    this.createHistogram('http_request_duration', 'HTTP request duration');
    this.createCounter('http_errors_total', 'Total HTTP errors');

    // Database metrics
    this.createCounter('db_queries_total', 'Total database queries');
    this.createHistogram('db_query_duration', 'Database query duration');
    this.createCounter('db_errors_total', 'Database errors');

    // Authentication metrics
    this.createCounter('auth_attempts_total', 'Authentication attempts');
    this.createCounter('auth_failures_total', 'Authentication failures');

    // Business metrics
    this.createCounter('appointments_created_total', 'Appointments created');
    this.createCounter('users_registered_total', 'Users registered');

    // System metrics
    this.createGauge(
      'process_memory_heap_used_bytes',
      'Process heap memory used in bytes'
    );
    this.createGauge(
      'process_memory_heap_total_bytes',
      'Process heap memory total in bytes'
    );
    this.createGauge(
      'process_memory_external_bytes',
      'Process external memory in bytes'
    );
    this.createGauge(
      'process_cpu_user_seconds_total',
      'Process CPU user time in seconds'
    );
    this.createGauge(
      'process_cpu_system_seconds_total',
      'Process CPU system time in seconds'
    );
    this.createGauge('process_uptime_seconds', 'Process uptime in seconds');
    this.createGauge(
      'nodejs_eventloop_lag_milliseconds',
      'Node.js event loop lag in milliseconds'
    );

    // System metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds
  }

  /**
   * Create a counter metric
   */
  createCounter(name, description) {
    this.counters.set(name, {
      value: 0,
      description,
      labels: new Map(),
    });
  }

  /**
   * Create a histogram metric
   */
  createHistogram(name, description) {
    this.histograms.set(name, {
      description,
      buckets: [0.1, 0.5, 1, 2.5, 5, 10],
      values: [],
      labels: new Map(),
    });
  }

  /**
   * Create a gauge metric
   */
  createGauge(name, description) {
    this.gauges.set(name, {
      value: 0,
      description,
      labels: new Map(),
    });
  }

  /**
   * Increment a counter
   */
  incrementCounter(name, labels = {}, value = 1) {
    const counter = this.counters.get(name);
    if (!counter) {
      logger.warn(`Counter ${name} not found`);
      return;
    }

    const labelKey = this.getLabelKey(labels);
    const currentValue = counter.labels.get(labelKey) || 0;
    counter.labels.set(labelKey, currentValue + value);
    counter.value += value;

    this.emit('metric', { type: 'counter', name, labels, value });
  }

  /**
   * Record histogram value
   */
  recordHistogram(name, value, labels = {}) {
    const histogram = this.histograms.get(name);
    if (!histogram) {
      logger.warn(`Histogram ${name} not found`);
      return;
    }

    const labelKey = this.getLabelKey(labels);
    if (!histogram.labels.has(labelKey)) {
      histogram.labels.set(labelKey, []);
    }

    histogram.labels.get(labelKey).push(value);
    histogram.values.push(value);

    this.emit('metric', { type: 'histogram', name, labels, value });
  }

  /**
   * Set gauge value
   */
  setGauge(name, value, labels = {}) {
    const gauge = this.gauges.get(name);
    if (!gauge) {
      logger.warn(`Gauge ${name} not found`);
      return;
    }

    const labelKey = this.getLabelKey(labels);
    gauge.labels.set(labelKey, value);
    gauge.value = value;

    this.emit('metric', { type: 'gauge', name, labels, value });
  }

  /**
   * Get label key for grouping
   */
  getLabelKey(labels) {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Memory metrics
    this.setGauge('process_memory_heap_used_bytes', memUsage.heapUsed);
    this.setGauge('process_memory_heap_total_bytes', memUsage.heapTotal);
    this.setGauge('process_memory_external_bytes', memUsage.external);

    // CPU metrics
    this.setGauge('process_cpu_user_seconds_total', cpuUsage.user / 1000000);
    this.setGauge(
      'process_cpu_system_seconds_total',
      cpuUsage.system / 1000000
    );

    // Uptime
    this.setGauge(
      'process_uptime_seconds',
      (Date.now() - this.startTime) / 1000
    );

    // Event loop lag (simplified)
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000;
      this.setGauge('nodejs_eventloop_lag_milliseconds', lag);
    });
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics() {
    let output = '';

    // Counters
    for (const [name, counter] of this.counters) {
      output += `# HELP ${name} ${counter.description}\n`;
      output += `# TYPE ${name} counter\n`;

      if (counter.labels.size === 0) {
        output += `${name} ${counter.value}\n`;
      } else {
        for (const [labelKey, value] of counter.labels) {
          const labels = labelKey ? `{${labelKey}}` : '';
          output += `${name}${labels} ${value}\n`;
        }
      }
      output += '\n';
    }

    // Histograms
    for (const [name, histogram] of this.histograms) {
      output += `# HELP ${name} ${histogram.description}\n`;
      output += `# TYPE ${name} histogram\n`;

      for (const [labelKey, values] of histogram.labels) {
        const labels = labelKey ? `{${labelKey}}` : '';
        const sortedValues = values.sort((a, b) => a - b);

        // Buckets
        for (const bucket of histogram.buckets) {
          const count = sortedValues.filter(v => v <= bucket).length;
          output += `${name}_bucket{le="${bucket}"${labelKey ? `,${labelKey}` : ''}} ${count}\n`;
        }

        // +Inf bucket
        output += `${name}_bucket{le="+Inf"${labelKey ? `,${labelKey}` : ''}} ${values.length}\n`;

        // Count and sum
        output += `${name}_count${labels} ${values.length}\n`;
        output += `${name}_sum${labels} ${values.reduce((a, b) => a + b, 0)}\n`;
      }
      output += '\n';
    }

    // Gauges
    for (const [name, gauge] of this.gauges) {
      output += `# HELP ${name} ${gauge.description}\n`;
      output += `# TYPE ${name} gauge\n`;

      if (gauge.labels.size === 0) {
        output += `${name} ${gauge.value}\n`;
      } else {
        for (const [labelKey, value] of gauge.labels) {
          const labels = labelKey ? `{${labelKey}}` : '';
          output += `${name}${labels} ${value}\n`;
        }
      }
      output += '\n';
    }

    return output;
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    const summary = {
      counters: {},
      histograms: {},
      gauges: {},
      timestamp: new Date().toISOString(),
    };

    // Counters
    for (const [name, counter] of this.counters) {
      summary.counters[name] = {
        value: counter.value,
        description: counter.description,
      };
    }

    // Histograms
    for (const [name, histogram] of this.histograms) {
      const values = histogram.values;
      if (values.length > 0) {
        const sorted = values.sort((a, b) => a - b);
        summary.histograms[name] = {
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          min: sorted[0],
          max: sorted[sorted.length - 1],
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)],
          description: histogram.description,
        };
      }
    }

    // Gauges
    for (const [name, gauge] of this.gauges) {
      summary.gauges[name] = {
        value: gauge.value,
        description: gauge.description,
      };
    }

    return summary;
  }

  /**
   * Reset all metrics
   */
  reset() {
    for (const counter of this.counters.values()) {
      counter.value = 0;
      counter.labels.clear();
    }

    for (const histogram of this.histograms.values()) {
      histogram.values = [];
      histogram.labels.clear();
    }

    for (const gauge of this.gauges.values()) {
      gauge.value = 0;
      gauge.labels.clear();
    }

    logger.info('All metrics reset');
  }
}

module.exports = new MetricsCollector();
