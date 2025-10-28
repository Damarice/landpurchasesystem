/* ============================================
   SUPABASE QUERY HELPERS
   ============================================
   
   Supabase-specific query methods
   Use these instead of generic SQL queries
   ============================================ */

const { getDatabase } = require('./database-supabase');

/**
 * Get all plots
 */
async function getAllPlots(statusFilter = null) {
  const supabase = getDatabase();
  let query = supabase.from('plots').select('*');
  
  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }
  
  const { data, error } = await query.order('id');
  
  if (error) throw error;
  return data;
}

/**
 * Get a single plot by ID
 */
async function getPlotById(id) {
  const supabase = getDatabase();
  const { data, error } = await supabase
    .from('plots')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update plot status
 */
async function updatePlotStatus(id, status, buyerId = null) {
  const supabase = getDatabase();
  const updates = { status };
  
  if (status === 'sold' && buyerId) {
    updates.buyer_id = buyerId;
    updates.sold_date = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('plots')
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
}

/**
 * Update multiple plots
 */
async function updateMultiplePlots(plotIds, status, buyerId = null) {
  const supabase = getDatabase();
  const updates = { status };
  
  if (status === 'sold' && buyerId) {
    updates.buyer_id = buyerId;
    updates.sold_date = new Date().toISOString();
  }
  
  const { data, error } = await supabase
    .from('plots')
    .update(updates)
    .in('id', plotIds)
    .select();
  
  if (error) throw error;
  return data;
}

/**
 * Get plot statistics
 */
async function getPlotStats() {
  const supabase = getDatabase();
  
  const { data, error } = await supabase
    .from('plots')
    .select('status');
  
  if (error) throw error;
  
  const stats = {
    totalPlots: data.length,
    available: data.filter(p => p.status === 'available').length,
    selected: data.filter(p => p.status === 'selected').length,
    sold: data.filter(p => p.status === 'sold').length
  };
  
  return stats;
}

/**
 * Get all buyers
 */
async function getAllBuyers() {
  const supabase = getDatabase();
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Get buyer by ID
 */
async function getBuyerById(id) {
  const supabase = getDatabase();
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Create a new buyer
 */
async function createBuyer(buyerData) {
  const supabase = getDatabase();
  const { data, error } = await supabase
    .from('buyers')
    .insert(buyerData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update buyer
 */
async function updateBuyer(id, buyerData) {
  const supabase = getDatabase();
  const { data, error } = await supabase
    .from('buyers')
    .update(buyerData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get all transactions
 */
async function getAllTransactions(filters = {}) {
  const supabase = getDatabase();
  let query = supabase
    .from('transactions')
    .select('*, buyers(*)');
  
  if (filters.buyer_id) {
    query = query.eq('buyer_id', filters.buyer_id);
  }
  
  if (filters.payment_status) {
    query = query.eq('payment_status', filters.payment_status);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Create transaction
 */
async function createTransaction(transactionData) {
  const supabase = getDatabase();
  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update transaction status
 */
async function updateTransactionStatus(id, status) {
  const supabase = getDatabase();
  const { data, error } = await supabase
    .from('transactions')
    .update({ payment_status: status })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

module.exports = {
  getAllPlots,
  getPlotById,
  updatePlotStatus,
  updateMultiplePlots,
  getPlotStats,
  getAllBuyers,
  getBuyerById,
  createBuyer,
  updateBuyer,
  getAllTransactions,
  createTransaction,
  updateTransactionStatus
};
