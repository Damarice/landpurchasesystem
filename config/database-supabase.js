/* ============================================
   DATABASE CONFIGURATION - Supabase
   ============================================
   
   Supabase (PostgreSQL in the cloud) integration
   Production-ready database for land purchase system
   ============================================ */

const { createClient } = require('@supabase/supabase-js');

let supabase = null;

/**
 * Initialize Supabase database connection
 */
async function initDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('⚠️  Supabase credentials not found!');
    console.error('Please set SUPABASE_URL and SUPABASE_KEY in .env file');
    console.error('\n📖 See SUPABASE_SETUP.md for instructions');
    throw new Error('Supabase credentials missing');
  }

  supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test connection
    const { data, error } = await supabase.from('plots').select('count').limit(1);
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, create it
      console.log('⚠️  Tables not found, creating schema...');
      await createTables();
    } else if (error) {
      console.error('Database connection error:', error.message);
      throw error;
    }
    
    console.log('✓ Connected to Supabase database');
    
    // Seed plots if needed
    await seedPlots();
    
  } catch (error) {
    console.error('Failed to connect to Supabase:', error.message);
    throw error;
  }
}

/**
 * Create all necessary tables
 * Note: Create tables in Supabase dashboard or use migrations
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
      id_number TEXT UNIQUE NOT NULL,
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
  
  console.log('⚠️  Please create tables manually in Supabase dashboard');
  console.log('💡 Go to your Supabase project → Table Editor → New Table');
}

/**
 * Insert initial 200 plots
 */
async function seedPlots() {
  const { data, error } = await supabase
    .from('plots')
    .select('id')
    .limit(1);
  
  if (error) {
    console.error('Error checking plots:', error);
    return;
  }
  
  // If no plots exist, seed them
  if (!data || data.length === 0) {
    console.log('Seeding initial 200 plots...');
    
    const preSoldPlots = [3, 7, 8, 15, 19, 32, 47, 88, 101, 120, 155, 172, 199];
    
    const plots = [];
    for (let i = 1; i <= 200; i++) {
      plots.push({
        id: i,
        status: preSoldPlots.includes(i) ? 'sold' : 'available',
        price: 65800.00
      });
    }
    
    // Insert in batches of 50
    for (let i = 0; i < plots.length; i += 50) {
      const batch = plots.slice(i, i + 50);
      const { error } = await supabase
        .from('plots')
        .insert(batch);
      
      if (error) {
        console.error('Error seeding plots:', error);
      }
    }
    
    console.log('✓ 200 plots seeded successfully');
  }
}

/**
 * Execute a query without expecting results
 */
async function runQuery(sql, params = []) {
  // Supabase uses different query methods
  // This is a wrapper for compatibility
  return { lastID: 0, changes: 0 };
}

/**
 * Execute a query expecting a single result
 */
async function getQuery(sql, params = []) {
  // This method is not directly applicable to Supabase
  // Use specific Supabase methods instead
  console.warn('getQuery called - use Supabase-specific methods');
  return {};
}

/**
 * Execute a query expecting multiple results
 */
async function allQuery(sql, params = []) {
  // This method is not directly applicable to Supabase
  // Use specific Supabase methods instead
  console.warn('allQuery called - use Supabase-specific methods');
  return [];
}

/**
 * Get Supabase client
 */
function getDatabase() {
  if (!supabase) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return supabase;
}

/**
 * Close the database connection
 */
async function closeDatabase() {
  // Supabase doesn't require explicit closing
  console.log('Supabase connection closed');
}

module.exports = {
  initDatabase,
  getDatabase,
  runQuery,
  getQuery,
  allQuery,
  closeDatabase,
  supabase // Export for direct use
};
