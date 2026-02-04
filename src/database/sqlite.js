const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

// Create SQLite database
const dbPath = path.join(__dirname, '../../data/research.db');
const db = new sqlite3.Database(dbPath);

// Initialize tables
const initTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // USSD sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS ussd_sessions (
          id TEXT PRIMARY KEY,
          session_id TEXT UNIQUE NOT NULL,
          phone_number TEXT NOT NULL,
          service_code TEXT NOT NULL,
          current_menu TEXT DEFAULT 'main',
          menu_data TEXT DEFAULT '{}',
          is_active INTEGER DEFAULT 1,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ended_at DATETIME,
          total_interactions INTEGER DEFAULT 0
        )
      `);

      // Research questions table
      db.run(`
        CREATE TABLE IF NOT EXISTS research_questions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          question_text TEXT NOT NULL,
          category TEXT,
          language TEXT DEFAULT 'en',
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Research responses table
      db.run(`
        CREATE TABLE IF NOT EXISTS research_responses (
          id TEXT PRIMARY KEY,
          phone_number TEXT NOT NULL,
          question_id TEXT,
          response_type TEXT,
          response_text TEXT,
          language TEXT DEFAULT 'en',
          ussd_session_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          logger.error('SQLite table creation error:', err);
          reject(err);
        } else {
          logger.info('SQLite tables initialized');
          resolve();
        }
      });
    });
  });
};

// Query helper
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('SQLite query error:', err);
          reject(err);
        } else {
          resolve({ rows });
        }
      });
    } else {
      db.run(sql, params, function(err) {
        if (err) {
          logger.error('SQLite query error:', err);
          reject(err);
        } else {
          resolve({ 
            rows: [{ id: this.lastID }],
            rowCount: this.changes 
          });
        }
      });
    }
  });
};

module.exports = {
  query,
  initTables,
  close: () => db.close()
};