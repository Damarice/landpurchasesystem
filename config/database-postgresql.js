/* ============================================
   DATABASE CONFIGURATION - PostgreSQL
   ============================================
   
   PostgreSQL database setup for production
   ============================================ */

const { Pool } = require('pg');

let pool = null;

/**
 * Initialize PostgreSQL database connection
 */
async function initDatabase() {
  // Database connection configuration
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'land_system',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  pool = new Pool(config);

  // Test the connection
  try {
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL database');
    client.release();
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    throw err;
  }

  await createTables();
}

/**
 * Create all necessary tables
 */
async function createTables() {
  const queries = [
    // Plots table
    `CREATE TABLE IF NOT EXISTS plots (
      id INTEGER PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'available' 
        CHECK(status IN ('available', 'selected', 'sold')),
      price DECIMAL(10, 2) NOT NULL DEFAULT 65800.00,
      buyer_id INTEGER,
      sold_date TIMESTAMP,
      FOREIGN KEY (buyer_id) REFERENCES buyers(id)
    )`,
    
    // Buyers table
    `CREATE TABLE IF NOT EXISTS buyers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      id_number TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      address TEXT,
      occupation TEXT,
      budget DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Transactions table
    `CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      buyer_id INTEGER NOT NULL,
      plot_ids TEXT NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      payment_status TEXT DEFAULT 'pending' 
        CHECK(payment_status IN ('pending', 'completed', 'failed')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    
    const preSoldPlots = [3, 7, 8, 15, 19, 32, 47, 88, 101, 120, 155, 172, 199];
    
    for (let i = 1; i <= 200; i++) {
      const status = preSoldPlots.includes(i) ? 'sold' : 'available';
      await runQuery(
        `INSERT INTO plots (id, status, price) VALUES ($1, $2, $3)`,
        [i, status, 65800.00]
      );
    }
    
    console.log('✓ 200 plots seeded successfully');
  }
}

/**
 * Execute a query without expecting results
 */
async function runQuery(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return { 
      lastID: result.insertId, 
      changes: result.rowCount 
    };
  } finally {
    client.release();
  }
}

/**
 * Execute a query expecting a single result
 */
async function getQuery(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows[0] || {};
  } finally {
    client.release();
  }
}

/**
 * Execute a query expecting multiple results
 */
async function allQuery(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows || [];
  } finally {
    client.release();
  }
}

/**
 * Get the database pool
 */
function getDatabase() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * Close the database connection
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  runQuery,
  getQuery,
  allQuery,
  closeDatabase
};
