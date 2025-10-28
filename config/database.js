/* ============================================
   DATABASE CONFIGURATION
   ============================================
   
   SQLite database setup and initialization
   Manages database schema and initial data
   ============================================ */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

const DB_PATH = path.join(__dirname, '../data/land_system.db');

let db = null;

/**
 * Initialize the database connection and create tables if they don't exist
 */
async function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Failed to connect to database:', err);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      createTables().then(() => resolve()).catch(reject);
    });
  });
}

/**
 * Create all necessary tables
 */
async function createTables() {
  const queries = [
    // Plots table
    `CREATE TABLE IF NOT EXISTS plots (
      id INTEGER PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'selected', 'sold')),
      price REAL NOT NULL DEFAULT 65800,
      buyer_id INTEGER,
      sold_date TEXT,
      FOREIGN KEY (buyer_id) REFERENCES buyers(id)
    )`,
    
    // Buyers table
    `CREATE TABLE IF NOT EXISTS buyers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      id_number TEXT NOT NULL,
      uid TEXT,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT,
      occupation TEXT,
      budget REAL NOT NULL,
      total_spent REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Transactions table
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_id INTEGER NOT NULL,
      plot_ids TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'completed', 'failed')),
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (buyer_id) REFERENCES buyers(id)
    )`
  ];
  
  for (const query of queries) {
    await runQuery(query);
  }
  
  // Insert initial 200 plots if they don't exist
  await seedPlots();
}

/**
 * Insert initial 200 plots
 */
async function seedPlots() {
  const count = await getQuery(`SELECT COUNT(*) as count FROM plots`);
  
  if (count.count === 0) {
    console.log('Seeding initial 200 plots...');
    
    // Pre-sold plots for demo
    const preSoldPlots = [3, 7, 8, 15, 19, 32, 47, 88, 101, 120, 155, 172, 199];
    
    for (let i = 1; i <= 200; i++) {
      const status = preSoldPlots.includes(i) ? 'sold' : 'available';
      await runQuery(
        `INSERT INTO plots (id, status, price) VALUES (?, ?, ?)`,
        [i, status, 65800]
      );
    }
    
    console.log('✓ 200 plots seeded successfully');
  }
}

/**
 * Execute a query without expecting results
 */
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Query error:', err);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

/**
 * Execute a query expecting a single result
 */
function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Query error:', err);
        reject(err);
      } else {
        resolve(row || {});
      }
    });
  });
}

/**
 * Execute a query expecting multiple results
 */
function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Query error:', err);
        reject(err);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Get the database instance
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database connection closed');
        resolve();
      }
    });
  });
}

module.exports = {
  initDatabase,
  getDatabase,
  runQuery,
  getQuery,
  allQuery,
  closeDatabase
};
