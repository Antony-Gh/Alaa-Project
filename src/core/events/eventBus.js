const EventEmitter = require('events');
const logger = require('../../utils/logger');
const metricsCollector = require('../monitoring/metricsCollector');

/**
 * Application event bus for decoupled communication
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this.setupMetrics();
  }

  /**
   * Setup event metrics
   */
  setupMetrics() {
    metricsCollector.createCounter(
      'events_emitted_total',
      'Total events emitted'
    );
    metricsCollector.createCounter(
      'events_handled_total',
      'Total events handled'
    );
    metricsCollector.createCounter(
      'events_failed_total',
      'Total event handling failures'
    );
    metricsCollector.createHistogram(
      'event_handling_duration',
      'Event handling duration'
    );
  }

  /**
   * Emit event with metrics and logging
   */
  emitWithMetrics(eventName, data = {}) {
    const startTime = Date.now();

    try {
      metricsCollector.incrementCounter('events_emitted_total', {
        event: eventName,
      });

      logger.debug('Event emitted', { event: eventName, data });

      const result = this.emit(eventName, data);

      const duration = Date.now() - startTime;
      metricsCollector.recordHistogram('event_handling_duration', duration, {
        event: eventName,
      });

      return result;
    } catch (error) {
      metricsCollector.incrementCounter('events_failed_total', {
        event: eventName,
      });
      logger.error('Event emission failed', {
        event: eventName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Emit event asynchronously
   */
  async emitAsync(eventName, data = {}) {
    const listeners = this.listeners(eventName);

    if (listeners.length === 0) {
      logger.debug('No listeners for event', { event: eventName });
      return;
    }

    const promises = listeners.map(async listener => {
      const startTime = Date.now();

      try {
        await listener(data);

        metricsCollector.incrementCounter('events_handled_total', {
          event: eventName,
        });

        const duration = Date.now() - startTime;
        metricsCollector.recordHistogram('event_handling_duration', duration, {
          event: eventName,
        });

        logger.debug('Event handled successfully', {
          event: eventName,
          duration,
        });
      } catch (error) {
        metricsCollector.incrementCounter('events_failed_total', {
          event: eventName,
        });
        logger.error('Event handler failed', {
          event: eventName,
          error: error.message,
          stack: error.stack,
        });

        // Don't throw to prevent one handler failure from affecting others
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Register event handler with error handling
   */
  onSafe(eventName, handler) {
    const safeHandler = async data => {
      try {
        await handler(data);
      } catch (error) {
        logger.error('Event handler error', {
          event: eventName,
          error: error.message,
          stack: error.stack,
        });
      }
    };

    this.on(eventName, safeHandler);
    return this;
  }

  /**
   * Register one-time event handler with error handling
   */
  onceSafe(eventName, handler) {
    const safeHandler = async data => {
      try {
        await handler(data);
      } catch (error) {
        logger.error('Event handler error', {
          event: eventName,
          error: error.message,
          stack: error.stack,
        });
      }
    };

    this.once(eventName, safeHandler);
    return this;
  }
}

// Event constants
const EVENTS = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_PASSWORD_CHANGED: 'user.password_changed',

  // Appointment events
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_APPROVED: 'appointment.approved',
  APPOINTMENT_REJECTED: 'appointment.rejected',
  APPOINTMENT_COMPLETED: 'appointment.completed',

  // System events
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  SYSTEM_ERROR: 'system.error',
  HEALTH_CHECK_FAILED: 'system.health_check_failed',

  // Security events
  SECURITY_BREACH_DETECTED: 'security.breach_detected',
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',

  // Notification events
  NOTIFICATION_SEND: 'notification.send',
  EMAIL_SEND: 'email.send',
  SMS_SEND: 'sms.send',
};

const eventBus = new EventBus();

module.exports = {
  eventBus,
  EVENTS,
};
