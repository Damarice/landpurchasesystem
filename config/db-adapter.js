/* ============================================
   DATABASE ADAPTER (SQLite | Supabase)
   ============================================
   Provides a unified interface for routes to call, regardless of the
   underlying database. It delegates to either SQLite helpers or
   Supabase-specific query functions based on environment.
   ============================================ */

const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);

// SQLite helpers
const sqlite = require('./database');

// Supabase helpers
const { 
  getAllPlots: sbGetAllPlots,
  getPlotById: sbGetPlotById,
  updatePlotStatus: sbUpdatePlotStatus,
  updateMultiplePlots: sbUpdateMultiplePlots,
  getPlotStats: sbGetPlotStats,
  getAllBuyers: sbGetAllBuyers,
  getBuyerById: sbGetBuyerById,
  createBuyer: sbCreateBuyer,
  updateBuyer: sbUpdateBuyer,
  getAllTransactions: sbGetAllTransactions,
  createTransaction: sbCreateTransaction,
  updateTransactionStatus: sbUpdateTransactionStatus
} = require('./database-supabase-queries');

// ============ PLOTS ============
async function getAllPlots(status) {
  if (useSupabase) return await sbGetAllPlots(status || null);
  let query = 'SELECT * FROM plots';
  const params = [];
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  query += ' ORDER BY id';
  return await sqlite.allQuery(query, params);
}

async function getPlotById(id) {
  if (useSupabase) return await sbGetPlotById(id);
  return await sqlite.getQuery('SELECT * FROM plots WHERE id = ?', [id]);
}

async function updatePlot(id, status, buyerId) {
  if (useSupabase) return await sbUpdatePlotStatus(id, status, buyerId);
  if (status && !['available', 'selected', 'sold'].includes(status)) {
    throw new Error('Invalid status');
  }
  let query = 'UPDATE plots SET status = ?';
  const params = [status];
  if (status === 'sold' && buyerId) {
    query += ', buyer_id = ?, sold_date = ?';
    params.push(buyerId, new Date().toISOString());
  }
  query += ' WHERE id = ?';
  params.push(id);
  const result = await sqlite.runQuery(query, params);
  if (result.changes === 0) throw new Error('Plot not found');
  return await getPlotById(id);
}

async function updatePlotsBulk(plotIds, status, buyerId) {
  if (useSupabase) return await sbUpdateMultiplePlots(plotIds, status, buyerId);
  if (!Array.isArray(plotIds) || plotIds.length === 0) {
    throw new Error('plotIds must be a non-empty array');
  }
  if (!status || !['available', 'selected', 'sold'].includes(status)) {
    throw new Error('Invalid status');
  }
  const placeholders = plotIds.map(() => '?').join(',');
  let query = `UPDATE plots SET status = ?`;
  const params = [status];
  if (status === 'sold' && buyerId) {
    query += ', buyer_id = ?, sold_date = ?';
    params.push(buyerId, new Date().toISOString());
  }
  query += ` WHERE id IN (${placeholders})`;
  params.push(...plotIds);
  const result = await sqlite.runQuery(query, params);
  return { updatedCount: result.changes };
}

async function getPlotsStats() {
  if (useSupabase) {
    const s = await sbGetPlotStats();
    return {
      totalPlots: s.totalPlots,
      byStatus: [
        { status: 'available', count: s.available, total_value: null },
        { status: 'selected', count: s.selected, total_value: null },
        { status: 'sold', count: s.sold, total_value: null }
      ],
      summary: { available: s.available, sold: s.sold, selected: s.selected }
    };
  }
  const stats = await sqlite.allQuery(`
    SELECT 
      status,
      COUNT(*) as count,
      SUM(price) as total_value
    FROM plots
    GROUP BY status
  `);
  const totalPlots = await sqlite.getQuery('SELECT COUNT(*) as count FROM plots');
  return {
    totalPlots: totalPlots.count,
    byStatus: stats,
    summary: {
      available: stats.find(s => s.status === 'available')?.count || 0,
      sold: stats.find(s => s.status === 'sold')?.count || 0,
      selected: stats.find(s => s.status === 'selected')?.count || 0
    }
  };
}

// ============ BUYERS ============
async function listBuyers() {
  if (useSupabase) return await sbGetAllBuyers();
  return await sqlite.allQuery('SELECT * FROM buyers ORDER BY created_at DESC');
}

async function getBuyer(id) {
  if (useSupabase) return await sbGetBuyerById(id);
  return await sqlite.getQuery('SELECT * FROM buyers WHERE id = ?', [id]);
}

async function createBuyer(buyerData) {
  if (useSupabase) return await sbCreateBuyer(buyerData);
  const { name, id_number, phone, email, address, occupation, budget } = buyerData;
  if (!name || !id_number || !phone || !email || budget === undefined) {
    throw new Error('Missing required fields: name, id_number, phone, email, budget');
  }
  const existing = await sqlite.getQuery('SELECT id FROM buyers WHERE id_number = ?', [id_number]);
  if (existing && existing.id) {
    const err = new Error('Buyer with this ID number already exists');
    err.status = 409;
    throw err;
  }
  const result = await sqlite.runQuery(
    `INSERT INTO buyers (name, id_number, phone, email, address, occupation, budget)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, id_number, phone, email, address || '', occupation || '', budget]
  );
  return await sqlite.getQuery('SELECT * FROM buyers WHERE id = ?', [result.lastID]);
}

async function updateBuyer(id, buyerData) {
  if (useSupabase) return await sbUpdateBuyer(id, buyerData);
  const { name, id_number, phone, email, address, occupation, budget } = buyerData;
  const result = await sqlite.runQuery(
    `UPDATE buyers 
     SET name = ?, id_number = ?, phone = ?, email = ?, address = ?, occupation = ?, budget = ?
     WHERE id = ?`,
    [name, id_number, phone, email, address, occupation, budget, id]
  );
  if (result.changes === 0) {
    const err = new Error('Buyer not found');
    err.status = 404;
    throw err;
  }
  return await sqlite.getQuery('SELECT * FROM buyers WHERE id = ?', [id]);
}

// ============ TRANSACTIONS ============
async function listTransactions(filters = {}) {
  if (useSupabase) return await sbGetAllTransactions(filters);
  let query = `
    SELECT 
      t.*,
      b.name as buyer_name,
      b.email as buyer_email,
      b.phone as buyer_phone
    FROM transactions t
    LEFT JOIN buyers b ON t.buyer_id = b.id
    WHERE 1=1`;
  const params = [];
  if (filters.buyer_id) {
    query += ' AND t.buyer_id = ?';
    params.push(filters.buyer_id);
  }
  if (filters.payment_status) {
    query += ' AND t.payment_status = ?';
    params.push(filters.payment_status);
  }
  query += ' ORDER BY t.created_at DESC';
  return await sqlite.allQuery(query, params);
}

async function getTransaction(id) {
  if (useSupabase) {
    const list = await sbGetAllTransactions({});
    return list.find(t => String(t.id) === String(id)) || {};
  }
  return await sqlite.getQuery(
    `SELECT 
      t.*,
      b.name as buyer_name,
      b.email as buyer_email,
      b.phone as buyer_phone,
      b.address as buyer_address,
      b.occupation as buyer_occupation
     FROM transactions t
     LEFT JOIN buyers b ON t.buyer_id = b.id
     WHERE t.id = ?`,
    [id]
  );
}

async function createTransaction(data) {
  if (useSupabase) return await sbCreateTransaction(data);
  const { buyer_id, plot_ids, total_amount, notes } = data;
  if (!buyer_id || !plot_ids || !total_amount) {
    throw new Error('Missing required fields: buyer_id, plot_ids, total_amount');
  }
  const plotIdsString = Array.isArray(plot_ids) ? plot_ids.join(',') : plot_ids;
  const result = await sqlite.runQuery(
    `INSERT INTO transactions (buyer_id, plot_ids, total_amount, notes, payment_status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [buyer_id, plotIdsString, total_amount, notes || '']
  );
  return await sqlite.getQuery(
    `SELECT t.*, b.name as buyer_name 
     FROM transactions t
     LEFT JOIN buyers b ON t.buyer_id = b.id
     WHERE t.id = ?`,
    [result.lastID]
  );
}

async function updateTransactionStatus(id, payment_status) {
  if (useSupabase) return await sbUpdateTransactionStatus(id, payment_status);
  if (!['pending', 'completed', 'failed'].includes(payment_status)) {
    throw new Error('Invalid payment status');
  }
  const result = await sqlite.runQuery(
    'UPDATE transactions SET payment_status = ? WHERE id = ?',
    [payment_status, id]
  );
  if (result.changes === 0) {
    const err = new Error('Transaction not found');
    err.status = 404;
    throw err;
  }
  return await sqlite.getQuery(
    `SELECT t.*, b.name as buyer_name 
     FROM transactions t
     LEFT JOIN buyers b ON t.buyer_id = b.id
     WHERE t.id = ?`,
    [id]
  );
}

module.exports = {
  // mode
  useSupabase,
  // plots
  getAllPlots,
  getPlotById,
  updatePlot,
  updatePlotsBulk,
  getPlotsStats,
  // buyers
  listBuyers,
  getBuyer,
  createBuyer,
  updateBuyer,
  // transactions
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransactionStatus
};


