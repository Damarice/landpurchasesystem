/* ============================================
   TRANSACTIONS ROUTES
   ============================================
   
   API endpoints for managing transactions
   GET /api/transactions - Get all transactions
   GET /api/transactions/:id - Get specific transaction
   POST /api/transactions - Create new transaction
   ============================================ */

const express = require('express');
const router = express.Router();
const {
  listTransactions,
  getTransaction,
  createTransaction: createTx,
  updateTransactionStatus: updateTxStatus,
  listPayments,
  createPayment
} = require('../config/db-adapter');

/**
 * GET /api/transactions
 * Get all transactions with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { buyer_id, payment_status } = req.query;
    const transactions = await listTransactions({ buyer_id, payment_status });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/transactions/:id
 * Get a specific transaction
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await getTransaction(id);
    
    if (!transaction || !transaction.id) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/transactions
 * Create a new transaction
 */
router.post('/', async (req, res) => {
  try {
    const transaction = await createTx(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * PUT /api/transactions/:id/status
 * Update transaction payment status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;
    const updatedTransaction = await updateTxStatus(id, payment_status);
    res.json(updatedTransaction);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * GET /api/transactions/payments
 * List payments (optional filter by buyer_id)
 */
router.get('/payments', async (req, res) => {
  try {
    const { buyer_id } = req.query;
    const payments = await listPayments({ buyer_id });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/transactions/payments
 * Create a payment
 */
router.post('/payments', async (req, res) => {
  try {
    const payment = await createPayment(req.body);
    res.status(201).json(payment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
