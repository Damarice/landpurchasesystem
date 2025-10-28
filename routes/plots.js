/* ============================================
   PLOTS ROUTES
   ============================================
   
   API endpoints for managing plots
   GET /api/plots - Get all plots
   GET /api/plots/:id - Get specific plot
   PUT /api/plots/:id - Update plot status
   POST /api/plots/bulk-update - Update multiple plots
   ============================================ */

const express = require('express');
const router = express.Router();
const {
  getAllPlots,
  getPlotById,
  updatePlot,
  updatePlotsBulk,
  getPlotsStats
} = require('../config/db-adapter');

/**
 * GET /api/plots
 * Get all plots with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const plots = await getAllPlots(status || null);
    res.json(plots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/plots/stats
 * Get statistics about plots
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getPlotsStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/plots/:id
 * Get a specific plot by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const plot = await getPlotById(id);
    
    if (!plot || !plot.id) {
      return res.status(404).json({ error: 'Plot not found' });
    }
    
    res.json(plot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/plots/:id
 * Update plot status
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, buyer_id } = req.body;
    const updatedPlot = await updatePlot(id, status, buyer_id);
    res.json(updatedPlot);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * POST /api/plots/bulk-update
 * Update multiple plots at once
 */
router.post('/bulk-update', async (req, res) => {
  try {
    const { plotIds, status, buyer_id } = req.body;
    const result = await updatePlotsBulk(plotIds, status, buyer_id);
    res.json({ message: 'Plots updated successfully', updatedCount: result.updatedCount });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
