/**
 * Cache Service
 *
 * Provides caching functionality with support for both in-memory and Redis cache.
 * Implements a consistent interface for both cache types.
 */
const NodeCache = require('node-cache');
const Redis = require('ioredis');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Cache service class
 */
class CacheService {
  /**
   * Create a new cache service
   */
  constructor() {
    this.type = config.cache.type;
    this.ttl = config.cache.ttl;
    this.client = null;
    this.isConnected = false;

    this._initialize();
  }

  /**
   * Initialize the cache based on configuration
   *
   * @private
   */
  _initialize() {
    try {
      if (this.type === 'redis') {
        this._initializeRedis();
      } else {
        this._initializeMemory();
      }

      logger.info(`Cache initialized: ${this.type}`);
    } catch (error) {
      logger.error('Cache initialization failed:', { error: error.message });
      // Fallback to memory cache if Redis fails
      if (this.type === 'redis') {
        logger.info('Falling back to memory cache');
        this.type = 'memory';
        this._initializeMemory();
      }
    }
  }

  /**
   * Initialize Redis cache
   *
   * @private
   */
  _initializeRedis() {
    this.client = new Redis(config.cache.redis.url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
      retryStrategy: times => {
        if (times > 3) {
          logger.error('Redis connection failed after multiple attempts');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 3000); // Exponential backoff
      },
    });

    // Set up event handlers
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis cache connected');
    });

    this.client.on('error', error => {
      this.isConnected = false;
      logger.error('Redis cache error:', { error: error.message });
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis cache reconnecting...');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis cache connection ended');
    });
  }

  /**
   * Initialize memory cache
   *
   * @private
   */
  _initializeMemory() {
    this.client = new NodeCache({
      stdTTL: this.ttl,
      checkperiod: Math.min(this.ttl * 0.2, 600), // Check for expired keys every 20% of TTL or max 10 minutes
      useClones: false, // Don't clone objects for better performance
      deleteOnExpire: true,
      maxKeys: 5000, // Limit max keys to prevent memory leak
    });
    this.isConnected = true;
  }

  /**
   * Get a value from cache
   *
   * @param {string} key - Cache key
   * @returns {Promise<any>} - Cached value or null if not found
   */
  async get(key) {
    try {
      if (!this.isConnected) {
        return null;
      }

      if (this.type === 'redis') {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.client.get(key);
      }
    } catch (error) {
      logger.error('Cache get error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set a value in cache
   *
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} [ttl] - Time to live in seconds, defaults to configured TTL
   * @returns {Promise<boolean>} - Success or failure
   */
  async set(key, value, ttl = this.ttl) {
    try {
      if (!this.isConnected) {
        return false;
      }

      if (this.type === 'redis') {
        await this.client.set(key, JSON.stringify(value), 'EX', ttl);
      } else {
        this.client.set(key, value, ttl);
      }

      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete a value from cache
   *
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success or failure
   */
  async del(key) {
    try {
      if (!this.isConnected) {
        return false;
      }

      if (this.type === 'redis') {
        await this.client.del(key);
      } else {
        this.client.del(key);
      }

      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   *
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Whether key exists
   */
  async has(key) {
    try {
      if (!this.isConnected) {
        return false;
      }

      if (this.type === 'redis') {
        const exists = await this.client.exists(key);
        return exists === 1;
      } else {
        return this.client.has(key);
      }
    } catch (error) {
      logger.error('Cache has error:', { key, error: error.message });
      return false;
    }
  }

  /**
   * Increment a numeric value in cache
   *
   * @param {string} key - Cache key
   * @param {number} [value=1] - Value to increment by
   * @returns {Promise<number|null>} - New value or null on failure
   */
  async increment(key, value = 1) {
    try {
      if (!this.isConnected) {
        return null;
      }

      if (this.type === 'redis') {
        return await this.client.incrby(key, value);
      } else {
        const currentValue = this.client.get(key) || 0;
        const newValue = currentValue + value;
        this.client.set(key, newValue);
        return newValue;
      }
    } catch (error) {
      logger.error('Cache increment error:', { key, error: error.message });
      return null;
    }
  }

  /**
   * Get cache stats
   *
   * @returns {Promise<Object>} - Cache statistics
   */
  async getStats() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected' };
      }

      if (this.type === 'redis') {
        const info = await this.client.info();
        const dbSize = await this.client.dbsize();

        return {
          status: 'connected',
          type: 'redis',
          keys: dbSize,
          info: this._parseRedisInfo(info),
          uptime: Math.floor(process.uptime()),
        };
      } else {
        const stats = this.client.getStats();
        const keys = this.client.keys();

        return {
          status: 'connected',
          type: 'memory',
          keys: keys.length,
          hits: stats.hits,
          misses: stats.misses,
          uptime: Math.floor(process.uptime()),
        };
      }
    } catch (error) {
      logger.error('Cache stats error:', { error: error.message });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Clear all cache
   *
   * @returns {Promise<boolean>} - Success or failure
   */
  async clear() {
    try {
      if (!this.isConnected) {
        return false;
      }

      if (this.type === 'redis') {
        await this.client.flushdb();
      } else {
        this.client.flushAll();
      }

      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache clear error:', { error: error.message });
      return false;
    }
  }

  /**
   * Close the cache connection
   *
   * @returns {Promise<boolean>} - Success or failure
   */
  async close() {
    try {
      if (this.type === 'redis' && this.client) {
        await this.client.quit();
      }

      this.isConnected = false;
      logger.info('Cache connection closed');
      return true;
    } catch (error) {
      logger.error('Cache close error:', { error: error.message });
      return false;
    }
  }

  /**
   * Parse Redis INFO command output
   *
   * @private
   * @param {string} info - Redis INFO output
   * @returns {Object} - Parsed info
   */
  _parseRedisInfo(info) {
    const sections = {};
    let currentSection = 'general';

    info.split('\n').forEach(line => {
      if (!line || line.startsWith('#')) {
        const sectionMatch = line.match(/^# (.+)/);
        if (sectionMatch) {
          currentSection = sectionMatch[1].toLowerCase().replace(/\s/g, '_');
          sections[currentSection] = {};
        }
        return;
      }

      const match = line.match(/^([^:]+):(.+)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();

        // Convert to number if possible
        const numValue = Number(value);
        sections[currentSection][key] = isNaN(numValue) ? value : numValue;
      }
    });

    return {
      used_memory: sections.memory?.used_memory,
      connected_clients: sections.clients?.connected_clients,
      uptime_in_seconds: sections.server?.uptime_in_seconds,
      total_commands_processed: sections.stats?.total_commands_processed,
      keyspace_hits: sections.stats?.keyspace_hits,
      keyspace_misses: sections.stats?.keyspace_misses,
    };
  }
}

module.exports = new CacheService();
