const { Pool } = require('pg');
const logger = require('../utils/logger');

// Try PostgreSQL first, fallback to SQLite
let usePostgres = true;
let sqliteDb = null;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'research_system',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test PostgreSQL connection
pool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
  usePostgres = true;
});

pool.on('error', (err) => {
  logger.error('PostgreSQL connection error:', err);
  logger.info('Falling back to SQLite database');
  usePostgres = false;
  
  // Initialize SQLite fallback
  if (!sqliteDb) {
    sqliteDb = require('./sqlite');
    sqliteDb.initTables().catch(console.error);
  }
});

// Query helper with error handling and fallback
const query = async (text, params) => {
  const start = Date.now();
  try {
    // Try PostgreSQL first
    if (usePostgres) {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`PostgreSQL query executed in ${duration}ms: ${text}`);
      return res;
    }
  } catch (error) {
    logger.error('PostgreSQL query error, falling back to SQLite:', error);
    usePostgres = false;
    
    // Initialize SQLite if not already done
    if (!sqliteDb) {
      sqliteDb = require('./sqlite');
      await sqliteDb.initTables();
    }
  }
  
  // Use SQLite fallback
  if (!sqliteDb) {
    sqliteDb = require('./sqlite');
    await sqliteDb.initTables();
  }
  
  try {
    // Convert PostgreSQL query to SQLite compatible
    let sqliteQuery = text;
    let sqliteParams = params || [];
    
    // Convert PostgreSQL $1, $2 to SQLite ? placeholders
    sqliteQuery = sqliteQuery.replace(/\$(\d+)/g, '?');
    
    // Handle RETURNING clause (not supported in SQLite)
    if (sqliteQuery.includes('RETURNING')) {
      sqliteQuery = sqliteQuery.replace(/RETURNING.*$/, '');
    }
    
    // Handle UUID generation
    if (sqliteQuery.includes('uuid_generate_v4()')) {
      const { v4: uuidv4 } = require('uuid');
      sqliteQuery = sqliteQuery.replace(/uuid_generate_v4\(\)/g, '?');
      sqliteParams.unshift(uuidv4());
    }
    
    const res = await sqliteDb.query(sqliteQuery, sqliteParams);
    const duration = Date.now() - start;
    logger.debug(`SQLite query executed in ${duration}ms: ${sqliteQuery}`);
    return res;
  } catch (sqliteError) {
    logger.error('SQLite query error:', sqliteError);
    throw sqliteError;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  transaction,
  pool,
  end: () => pool.end()
};