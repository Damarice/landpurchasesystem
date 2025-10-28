/* ============================================
   BUYERS ROUTES
   ============================================
   
   API endpoints for managing buyers
   GET /api/buyers - Get all buyers
   GET /api/buyers/:id - Get specific buyer
   POST /api/buyers - Create new buyer
   PUT /api/buyers/:id - Update buyer
   ============================================ */

const express = require('express');
const router = express.Router();
const {
  listBuyers,
  getBuyer,
  createBuyer: createBuyerRecord,
  updateBuyer: updateBuyerRecord
} = require('../config/db-adapter');

/**
 * GET /api/buyers
 * Get all buyers
 */
router.get('/', async (req, res) => {
  try {
    const buyers = await listBuyers();
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/buyers/:id
 * Get a specific buyer
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const buyer = await getBuyer(id);
    
    if (!buyer || !buyer.id) {
      return res.status(404).json({ error: 'Buyer not found' });
    }
    
    res.json(buyer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/buyers
 * Create a new buyer
 */
router.post('/', async (req, res) => {
  try {
    const buyer = await createBuyerRecord(req.body);
    res.status(201).json(buyer);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * PUT /api/buyers/:id
 * Update a buyer
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBuyer = await updateBuyerRecord(id, req.body);
    res.json(updatedBuyer);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
