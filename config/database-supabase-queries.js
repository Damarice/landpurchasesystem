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
    .select('status, price');
  
  if (error) throw error;
  
  const stats = {
    totalPlots: data.length,
    available: data.filter(p => p.status === 'available').length,
    selected: data.filter(p => p.status === 'selected').length,
    sold: data.filter(p => p.status === 'sold').length,
    totals: {
      totalValueAll: data.reduce((s, p) => s + Number(p.price || 0), 0),
      totalValueSold: data.filter(p => p.status === 'sold').reduce((s, p) => s + Number(p.price || 0), 0)
    }
  };
  
  return {
    totalPlots: stats.totalPlots,
    byStatus: [
      { status: 'available', count: stats.available, total_value: null },
      { status: 'selected', count: stats.selected, total_value: null },
      { status: 'sold', count: stats.sold, total_value: null }
    ],
    summary: { available: stats.available, sold: stats.sold, selected: stats.selected },
    totals: stats.totals
  };
}

// Payments helpers
async function getAllPayments(filters = {}) {
  const supabase = getDatabase();
  let query = supabase.from('payments').select('*');
  if (filters.buyer_id) query = query.eq('buyer_id', filters.buyer_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function createPayment(paymentData) {
  const supabase = getDatabase();
  const { data, error } = await supabase
    .from('payments')
    .insert(paymentData)
    .select()
    .single();
  if (error) throw error;
  // Update buyer totals
  const buyerId = data.buyer_id;
  const amount = Number(data.amount || 0);
  if (buyerId) {
    const { data: buyer } = await supabase
      .from('buyers')
      .select('budget,total_spent')
      .eq('id', buyerId)
      .single();
    if (buyer) {
      const newTotal = Number(buyer.total_spent || 0) - amount;
      const remaining = Number(buyer.budget || 0) - newTotal;
      await supabase
        .from('buyers')
        .update({ total_spent: Math.max(newTotal, 0), remaining_balance: remaining })
        .eq('id', buyerId);
    }
  }
  return data;
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
  // Generate uid for consistency
  const name = buyerData.name;
  const idNumber = buyerData.id_number;
  const normalize = (s) => String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const uid = `${normalize(name).slice(0,32)}-${String(idNumber||'').replace(/\s+/g,'')}`;
  const { data, error } = await supabase
    .from('buyers')
    .insert({ ...buyerData, uid })
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

  // Update buyer totals in buyers table
  const buyerId = data.buyer_id;
  const totalAmount = Number(data.total_amount || 0);
  if (buyerId) {
    const { data: buyer } = await supabase
      .from('buyers')
      .select('budget,total_spent')
      .eq('id', buyerId)
      .single();
    if (buyer) {
      const newTotal = Number(buyer.total_spent || 0) + totalAmount;
      const remaining = Number(buyer.budget || 0) - newTotal;
      await supabase
        .from('buyers')
        .update({ total_spent: newTotal, remaining_balance: remaining })
        .eq('id', buyerId);
    }
  }
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
