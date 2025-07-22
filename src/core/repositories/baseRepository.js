/**
 * Base Repository class for common database operations
 *
 * Implements Repository Pattern for database access abstraction
 */
class BaseRepository {
  constructor(tableName, db) {
    this.tableName = tableName;
    this.db = db || require('../../utils/database');
  }

  /**
   * Find a single record by ID
   *
   * @param {number|string} id - The ID of the record to find
   * @param {Array<string>} [fields=['*']] - Fields to select
   * @returns {Promise<Object|null>} - The found record or null
   */
  async findById(id, fields = ['*']) {
    try {
      const fieldsStr = fields.join(', ');
      const query = `SELECT ${fieldsStr} FROM ${this.tableName} WHERE id = ?`;
      return await this.db.get(query, [id]);
    } catch (error) {
      console.error(`Error in ${this.tableName}.findById:`, error);
      throw error;
    }
  }

  /**
   * Find a single record by specified criteria
   *
   * @param {Object} criteria - Object with field-value pairs to search by
   * @param {Array<string>} [fields=['*']] - Fields to select
   * @returns {Promise<Object|null>} - The found record or null
   */
  async findOne(criteria = {}, fields = ['*']) {
    try {
      const fieldsStr = fields.join(', ');
      const whereClause = this._buildWhereClause(criteria);
      const query = `SELECT ${fieldsStr} FROM ${this.tableName}${whereClause.sql} LIMIT 1`;
      return await this.db.get(query, whereClause.params);
    } catch (error) {
      console.error(`Error in ${this.tableName}.findOne:`, error);
      throw error;
    }
  }

  /**
   * Find multiple records by specified criteria with pagination
   *
   * @param {Object} criteria - Object with field-value pairs to search by
   * @param {Array<string>} [fields=['*']] - Fields to select
   * @param {number} [limit=50] - Number of records to return
   * @param {number} [offset=0] - Number of records to skip
   * @param {string} [orderBy='id'] - Field to order by
   * @param {string} [direction='ASC'] - Order direction (ASC or DESC)
   * @returns {Promise<Array<Object>>} - Array of found records
   */
  async find(
    criteria = {},
    fields = ['*'],
    limit = 50,
    offset = 0,
    orderBy = 'id',
    direction = 'ASC'
  ) {
    try {
      const fieldsStr = fields.join(', ');
      const whereClause = this._buildWhereClause(criteria);
      const query = `
        SELECT ${fieldsStr} 
        FROM ${this.tableName}
        ${whereClause.sql}
        ORDER BY ${orderBy} ${direction}
        LIMIT ? OFFSET ?
      `;
      return await this.db.query(query, [...whereClause.params, limit, offset]);
    } catch (error) {
      console.error(`Error in ${this.tableName}.find:`, error);
      throw error;
    }
  }

  /**
   * Count records by specified criteria
   *
   * @param {Object} criteria - Object with field-value pairs to search by
   * @returns {Promise<number>} - Count of matching records
   */
  async count(criteria = {}) {
    try {
      const whereClause = this._buildWhereClause(criteria);
      const query = `SELECT COUNT(*) as count FROM ${this.tableName}${whereClause.sql}`;
      const result = await this.db.get(query, whereClause.params);
      return result ? result.count : 0;
    } catch (error) {
      console.error(`Error in ${this.tableName}.count:`, error);
      throw error;
    }
  }

  /**
   * Create a new record
   *
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} - The created record
   */
  async create(data) {
    try {
      const { fields, placeholders, values } = this._prepareInsertData(data);

      const query = `
        INSERT INTO ${this.tableName} (${fields}) 
        VALUES (${placeholders})
      `;

      const result = await this.db.run(query, values);

      if (result && result.lastID) {
        return this.findById(result.lastID);
      }

      return null;
    } catch (error) {
      console.error(`Error in ${this.tableName}.create:`, error);
      throw error;
    }
  }

  /**
   * Update a record by ID
   *
   * @param {number|string} id - ID of record to update
   * @param {Object} data - New data to apply
   * @returns {Promise<Object|null>} - Updated record or null
   */
  async update(id, data) {
    try {
      const { fields, values } = this._prepareUpdateData(data);

      if (fields.length === 0) {
        return this.findById(id);
      }

      const query = `
        UPDATE ${this.tableName} 
        SET ${fields.join(', ')} 
        WHERE id = ?
      `;

      const result = await this.db.run(query, [...values, id]);

      if (result && result.changes > 0) {
        return this.findById(id);
      }

      return null;
    } catch (error) {
      console.error(`Error in ${this.tableName}.update:`, error);
      throw error;
    }
  }

  /**
   * Delete a record by ID
   *
   * @param {number|string} id - ID of record to delete
   * @returns {Promise<boolean>} - Success or failure
   */
  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      const result = await this.db.run(query, [id]);
      return result && result.changes > 0;
    } catch (error) {
      console.error(`Error in ${this.tableName}.delete:`, error);
      throw error;
    }
  }

  /**
   * Soft delete a record (mark as deleted)
   * This assumes the table has an is_active column
   *
   * @param {number|string} id - ID of record to soft delete
   * @returns {Promise<Object|null>} - Updated record or null
   */
  async softDelete(id) {
    try {
      // Check if is_active column exists
      const tableInfo = await this.db.query(
        `PRAGMA table_info(${this.tableName})`
      );
      const hasIsActive = tableInfo.some(col => col.name === 'is_active');

      if (!hasIsActive) {
        throw new Error(
          `Table ${this.tableName} does not have an is_active column for soft delete`
        );
      }
      const query = `UPDATE ${this.tableName} SET is_active = 0 WHERE id = ?`;
      const result = await this.db.run(query, [id]);

      if (result && result.changes > 0) {
        return this.findById(id);
      }

      return null;
    } catch (error) {
      console.error(`Error in ${this.tableName}.softDelete:`, error);
      throw error;
    }
  }

  /**
   * Run a transaction with the database
   *
   * @param {Function} callback - Function to run inside transaction
   * @returns {Promise<any>} - Result of the callback function
   */
  async transaction(callback) {
    return this.db.transaction(callback);
  }

  /**
   * Build a WHERE clause from criteria object
   *
   * @private
   * @param {Object} criteria - Search criteria
   * @returns {Object} Object with SQL and parameters
   */
  _buildWhereClause(criteria) {
    const params = [];
    const clauses = [];

    for (const [key, value] of Object.entries(criteria)) {
      if (value === null) {
        clauses.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          const placeholders = value.map(() => '?').join(', ');
          clauses.push(`${key} IN (${placeholders})`);
          params.push(...value);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle operators like $gt, $lt, etc.
        for (const [op, opValue] of Object.entries(value)) {
          switch (op) {
            case '$gt':
              clauses.push(`${key} > ?`);
              params.push(opValue);
              break;
            case '$gte':
              clauses.push(`${key} >= ?`);
              params.push(opValue);
              break;
            case '$lt':
              clauses.push(`${key} < ?`);
              params.push(opValue);
              break;
            case '$lte':
              clauses.push(`${key} <= ?`);
              params.push(opValue);
              break;
            case '$ne':
              clauses.push(`${key} != ?`);
              params.push(opValue);
              break;
            case '$like':
              clauses.push(`${key} LIKE ?`);
              params.push(`%${opValue}%`);
              break;
            default:
            // Ignore unknown operators
          }
        }
      } else {
        clauses.push(`${key} = ?`);
        params.push(value);
      }
    }

    const sql = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
    return { sql, params };
  }

  /**
   * Prepare data for INSERT operation
   *
   * @private
   * @param {Object} data - Data to insert
   * @returns {Object} Object with fields, placeholders and values
   */
  _prepareInsertData(data) {
    const entries = Object.entries(data);
    const fields = entries.map(([key]) => key).join(', ');
    const placeholders = entries.map(() => '?').join(', ');
    const values = entries.map(([_, value]) => value);

    return { fields, placeholders, values };
  }

  /**
   * Prepare data for UPDATE operation
   *
   * @private
   * @param {Object} data - Data to update
   * @returns {Object} Object with fields and values
   */
  _prepareUpdateData(data) {
    const entries = Object.entries(data);
    const fields = entries.map(([key]) => `${key} = ?`);
    const values = entries.map(([_, value]) => value);

    return { fields, values };
  }
}

module.exports = BaseRepository;
