/* ============================================
   LAND PURCHASE SYSTEM - SERVER
   ============================================
   
   Express.js backend server for Land Purchase System
   Provides RESTful API for plot management
   ============================================ */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Try to use Supabase, fallback to SQLite
let initDatabase;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    console.log('Using Supabase (PostgreSQL cloud database)');
    ({ initDatabase } = require('./config/database-supabase'));
  } else {
    console.log('Using SQLite (local development database)');
    ({ initDatabase } = require('./config/database'));
  }
} catch (e) {
  console.log('Falling back to SQLite');
  ({ initDatabase } = require('./config/database'));
}

const plotRoutes = require('./routes/plots');
const transactionRoutes = require('./routes/transactions');
const buyerRoutes = require('./routes/buyers');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
// Serve static frontend files (index.html, styles, scripts)
app.use(express.static(__dirname));

// ==========================================
// ROUTES
// ==========================================

app.use('/api/plots', plotRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/buyers', buyerRoutes);

// API info route
app.get('/api', (req, res) => {
  res.json({
    message: 'Land Purchase System API',
    version: '1.0.0',
    endpoints: {
      plots: '/api/plots',
      transactions: '/api/transactions',
      buyers: '/api/buyers'
    }
  });
});

// Serve the frontend app at /app
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// ERROR HANDLING MIDDLEWARE
// ==========================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================

async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log('✓ Database initialized');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`  API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
