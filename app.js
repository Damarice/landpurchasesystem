/* ============================================
   LAND PURCHASE SYSTEM - JAVASCRIPT
   ============================================
   
   This system manages land plot sales with:
   - Visual plot grid (20x10 = 200 plots)
   - Buyer information collection
   - Budget tracking
   - Transaction logging
   - Local storage persistence
   ============================================ */

(function(){
  'use strict';
  
  // ==========================================
  // CONSTANTS & CONFIGURATION
  // ==========================================
  
  const TOTAL = 200;                    // Total number of plots
  const PRICE = 65800;                  // Price per plot in KES
  const CURRENCY = 'KES';               // Currency code
  const STORAGE_KEY = 'land_demo_v3';   // LocalStorage key
  
  // Pre-sold plots for demo purposes
  const PRE_SOLD = [3, 7, 8, 15, 19, 32, 47, 88, 101, 120, 155, 172, 199];

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  let soldSet = new Set();        // Set of sold plot numbers
  let selected = new Set();       // Set of currently selected plot numbers
  let lastSelected = null;        // Last selected plot (for shift-select)
  let zoomLevel = 1;              // Current zoom level for grid
  let currentBudget = 0;          // Buyer's total budget
  let totalSpent = 0;             // Total amount spent from budget

  // ==========================================
  // DOM ELEMENT REFERENCES
  // ==========================================
  
  // Grid & Stats
  const gridEl = document.getElementById('grid');
  const soldEl = document.getElementById('soldCount');
  const availEl = document.getElementById('availableCount');
  
  // Selection Display
  const selectedCostEl = document.getElementById('selectedCost');
  const selectedInfoEl = document.getElementById('selectedInfo');
  const summaryCard = document.getElementById('summaryCard');
  
  // Buttons
  const buyBtn = document.getElementById('buyBtn');
  const clearSelectionBtn = document.getElementById('clearSelection');
  
  // Buyer Form Inputs
  const buyerNameInput = document.getElementById('buyerName');
  const buyerIDInput = document.getElementById('buyerID');
  const buyerPhoneInput = document.getElementById('buyerPhone');
  const buyerEmailInput = document.getElementById('buyerEmail');
  const buyerAddressInput = document.getElementById('buyerAddress');
  const buyerOccupationInput = document.getElementById('buyerOccupation');
  const buyerBudgetInput = document.getElementById('buyerBudget');
  
  // Budget Display
  const remainingBudgetEl = document.getElementById('remainingBudget');
  
  // Transaction Log
  const logContainer = document.getElementById('logContainer');

  // ==========================================
  // INITIALIZATION
  // ==========================================
  
  /**
   * Initialize the application
   * Loads saved state, sets up event listeners, and renders initial UI
   */
  function init() {
    loadState();
    setupEventListeners();
    render();
    updateBudgetDisplay();
  }

  // ==========================================
  // STATE PERSISTENCE
  // ==========================================
  
  /**
   * Load application state from localStorage
   * Falls back to default pre-sold plots if no saved state exists
   */
  function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        soldSet = new Set(data.sold || PRE_SOLD);
        totalSpent = data.totalSpent || 0;
      } catch (e) {
        // Handle corrupted data
        console.error('Failed to load state:', e);
        soldSet = new Set(PRE_SOLD);
        totalSpent = 0;
      }
    } else {
      // First time user - load demo data
      soldSet = new Set(PRE_SOLD);
      totalSpent = 0;
    }
  }

  /**
   * Save current application state to localStorage
   * Includes sold plots, total spent, and timestamp
   */
  function saveState() {
    const data = {
      sold: [...soldSet],
      totalSpent: totalSpent,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  
  /**
   * Format a number as currency string
   * @param {number} amount - The amount to format
   * @returns {string} Formatted currency string (e.g., "KES 65,800")
   */
  function formatCurrency(amount) {
    return `${CURRENCY} ${amount.toLocaleString()}`;
  }

  // ==========================================
  // BUDGET MANAGEMENT
  // ==========================================
  
  /**
   * Update the remaining budget display
   * Changes color based on budget status (sufficient/low/critical)
   */
  function updateBudgetDisplay() {
    const budget = parseFloat(buyerBudgetInput.value) || 0;
    currentBudget = budget;
    const remaining = budget - totalSpent;
    
    // Update displayed amount
    remainingBudgetEl.innerText = formatCurrency(remaining);
    
    // Update color based on budget status
    remainingBudgetEl.classList.remove('low', 'critical');
    
    if (remaining < PRICE) {
      // Not enough for even one plot
      remainingBudgetEl.classList.add('critical');
    } else if (remaining < PRICE * 5) {
      // Can afford less than 5 plots
      remainingBudgetEl.classList.add('low');
    }
    
    // Re-validate purchase button state
    validatePurchase();
  }

  // ==========================================
  // FORM VALIDATION
  // ==========================================
  
  /**
   * Validate if purchase button should be enabled
   * Checks: selection exists, required fields filled, budget sufficient
   */
  function validatePurchase() {
    const selectedCount = selected.size;
    const totalCost = selectedCount * PRICE;
    const budget = parseFloat(buyerBudgetInput.value) || 0;
    const remaining = budget - totalSpent;
    
    // Check required fields
    const hasName = buyerNameInput.value.trim().length > 0;
    const hasID = buyerIDInput.value.trim().length > 0;
    const hasPhone = buyerPhoneInput.value.trim().length > 0;
    const hasEmail = buyerEmailInput.value.trim().length > 0;
    
    // Enable button only if all conditions met
    const isValid = selectedCount > 0 && 
                    hasName && 
                    hasID && 
                    hasPhone && 
                    hasEmail && 
                    totalCost <= remaining;
    
    buyBtn.disabled = !isValid;
  }

  // ==========================================
  // PLOT RENDERING
  // ==========================================
  
  /**
   * Create a plot element for the grid
   * @param {number} n - Plot number (1-200)
   * @returns {HTMLElement} The plot div element
   */
  function createPlot(n) {
    const div = document.createElement('div');
    div.className = 'plot';
    div.dataset.index = n;
    div.innerText = n;
    
    const isSold = soldSet.has(n);
    const isSelected = selected.has(n);
    
    if (isSold) {
      // Sold plots are non-interactive
      div.classList.add('sold');
      div.title = `Plot #${n} - SOLD`;
    } else {
      // Available plots can be clicked
      div.title = `Plot #${n} - ${formatCurrency(PRICE)}`;
      div.addEventListener('click', handlePlotClick);
    }
    
    // Apply selected styling if applicable
    if (isSelected && !isSold) {
      div.classList.add('selected');
    }
    
    return div;
  }

  // ==========================================
  // PLOT SELECTION HANDLING
  // ==========================================
  
  /**
   * Handle plot click events
   * Supports single selection and shift-click range selection
   * @param {Event} e - Click event object
   */
  function handlePlotClick(e) {
    const idx = Number(this.dataset.index);
    
    // Ignore clicks on sold plots
    if (soldSet.has(idx)) return;
    
    // SHIFT-CLICK: Select range from last selected to current
    if (e.shiftKey && lastSelected !== null) {
      const start = Math.min(lastSelected, idx);
      const end = Math.max(lastSelected, idx);
      
      // Add all plots in range (excluding sold ones)
      for (let i = start; i <= end; i++) {
        if (!soldSet.has(i)) {
          selected.add(i);
        }
      }
    } else {
      // REGULAR CLICK: Toggle single plot selection
      if (selected.has(idx)) {
        selected.delete(idx);
      } else {
        selected.add(idx);
      }
    }
    
    // Remember this plot for shift-select
    lastSelected = idx;
    
    // Re-render to show changes
    render();
  }

  // ==========================================
  // MAIN RENDER FUNCTION
  // ==========================================
  
  /**
   * Render the entire UI
   * Updates grid, statistics, selection summary, and button states
   */
  function render() {
    // ===== RENDER GRID =====
    gridEl.innerHTML = '';
    for (let i = 1; i <= TOTAL; i++) {
      gridEl.appendChild(createPlot(i));
    }
    
    // ===== UPDATE STATISTICS =====
    const available = TOTAL - soldSet.size;
    const selectedCount = selected.size;
    const totalCost = selectedCount * PRICE;
    
    soldEl.innerText = soldSet.size;
    availEl.innerText = available;
    selectedCostEl.innerText = formatCurrency(totalCost);
    
    // ===== UPDATE SELECTION INFO =====
    if (selectedCount === 0) {
      selectedInfoEl.innerText = 'No plots selected';
      summaryCard.classList.add('empty');
    } else {
      // Create comma-separated list of selected plots
      const plots = [...selected].sort((a, b) => a - b);
      
      // Show preview (first 5 plots + count of remaining)
      const preview = plots.length > 5 
        ? `${plots.slice(0, 5).join(', ')} and ${plots.length - 5} more`
        : plots.join(', ');
      
      selectedInfoEl.innerText = `${selectedCount} plot${selectedCount > 1 ? 's' : ''}: ${preview}`;
      summaryCard.classList.remove('empty');
    }
    
    // ===== UPDATE BUTTON STATES =====
    clearSelectionBtn.disabled = selectedCount === 0;
    validatePurchase();
  }

  // ==========================================
  // TRANSACTION LOGGING
  // ==========================================
  
  /**
   * Add a transaction to the history log
   * @param {Object} buyerData - Buyer information object
   * @param {Array} plots - Array of purchased plot numbers
   * @param {number} totalCost - Total cost of purchase
   * @param {string} bespokePlan - Custom purchase notes
   * @param {number} budgetBefore - Budget before purchase
   * @param {number} budgetAfter - Budget after purchase
   */
  function log(buyerData, plots, totalCost, bespokePlan, budgetBefore, budgetAfter) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    const date = new Date().toLocaleDateString();
    
    // Build log entry HTML
    entry.innerHTML = `
      <div class="log-time">${date} ${time}</div>
      <div class="log-buyer">${buyerData.name}</div>
      <div class="log-details" style="font-size: 11px; line-height: 1.6; margin-bottom: 8px;">
        <div><strong>ID:</strong> ${buyerData.id}</div>
        <div><strong>Phone:</strong> ${buyerData.phone}</div>
        <div><strong>Email:</strong> ${buyerData.email}</div>
        ${buyerData.address ? `<div><strong>Address:</strong> ${buyerData.address}</div>` : ''}
        ${buyerData.occupation ? `<div><strong>Occupation:</strong> ${buyerData.occupation}</div>` : ''}
      </div>
      <div class="log-details">
        Purchased ${plots.length} plot${plots.length > 1 ? 's' : ''}: ${plots.join(', ')}
      </div>
      ${bespokePlan ? `<div class="payment-plan"><div class="payment-plan-title">Purchase Notes:</div>${bespokePlan}</div>` : ''}
      <div class="log-budget">
        <div class="log-budget-item">
          <span class="log-budget-label">Purchase Amount</span>
          <span class="log-budget-value">${formatCurrency(totalCost)}</span>
        </div>
        <div class="log-budget-item">
          <span class="log-budget-label">Budget Before</span>
          <span class="log-budget-value">${formatCurrency(budgetBefore)}</span>
        </div>
        <div class="log-budget-item">
          <span class="log-budget-label">Budget After</span>
          <span class="log-budget-value" style="color: ${budgetAfter < PRICE ? 'var(--danger)' : 'var(--success)'}">
            ${formatCurrency(budgetAfter)}
          </span>
        </div>
      </div>
    `;
    
    // Remove "no transactions" placeholder if it exists
    const empty = logContainer.querySelector('.log-empty');
    if (empty) empty.remove();
    
    // Add new entry at the top (most recent first)
    logContainer.insertBefore(entry, logContainer.firstChild);
  }

  // ==========================================
  // PURCHASE PROCESSING
  // ==========================================
  
  /**
   * Process the purchase of selected plots
   * Validates data, confirms with user, updates state, and logs transaction
   */
  function buySelected() {
    if (selected.size === 0) return;
    
    // ===== COLLECT BUYER DATA =====
    const buyerName = buyerNameInput.value.trim();
    const buyerID = buyerIDInput.value.trim();
    const buyerPhone = buyerPhoneInput.value.trim();
    const buyerEmail = buyerEmailInput.value.trim();
    
    // ===== VALIDATE REQUIRED FIELDS =====
    if (!buyerName || !buyerID || !buyerPhone || !buyerEmail) {
      alert('Please fill in all required fields:\n- Full Name\n- ID/Passport Number\n- Phone Number\n- Email Address');
      return;
    }
    
    // ===== CALCULATE COSTS =====
    const plots = [...selected].sort((a, b) => a - b);
    const totalCost = plots.length * PRICE;
    const budget = parseFloat(buyerBudgetInput.value) || 0;
    const remaining = budget - totalSpent;
    const note = document.getElementById('bespokeNote').value.trim();
    
    // ===== CHECK BUDGET SUFFICIENCY =====
    if (totalCost > remaining) {
      alert(
        `Insufficient budget!\n\n` +
        `Selected plots cost: ${formatCurrency(totalCost)}\n` +
        `Remaining budget: ${formatCurrency(remaining)}\n` +
        `Shortfall: ${formatCurrency(totalCost - remaining)}`
      );
      return;
    }
    
    // ===== CONFIRMATION DIALOG =====
    const confirmation = confirm(
      `Confirm purchase for ${buyerName}?\n\n` +
      `ID: ${buyerID}\n` +
      `Phone: ${buyerPhone}\n` +
      `Email: ${buyerEmail}\n\n` +
      `Plots: ${plots.join(', ')}\n` +
      `Total Cost: ${formatCurrency(totalCost)}\n` +
      `Budget Before: ${formatCurrency(remaining)}\n` +
      `Budget After: ${formatCurrency(remaining - totalCost)}` +
      (note ? `\n\nPurchase Notes: ${note.substring(0, 100)}...` : '')
    );
    
    if (!confirmation) return;
    
    // ===== PROCESS PURCHASE =====
    const budgetBefore = remaining;
    totalSpent += totalCost;
    const budgetAfter = budget - totalSpent;
    
    // Create buyer data object
    const buyerData = {
      name: buyerName,
      id: buyerID,
      phone: buyerPhone,
      email: buyerEmail,
      address: buyerAddressInput.value.trim(),
      occupation: buyerOccupationInput.value.trim()
    };
    
    // Mark plots as sold
    plots.forEach(n => soldSet.add(n));
    
    // Save to localStorage
    saveState();
    
    // Add to transaction log
    log(buyerData, plots, totalCost, note, budgetBefore, budgetAfter);
    
    // ===== CLEAN UP =====
    // Clear selection but keep buyer info for next purchase
    selected.clear();
    document.getElementById('bespokeNote').value = '';
    lastSelected = null;
    
    // Update displays
    updateBudgetDisplay();
    render();
    
    // ===== SUCCESS MESSAGE =====
    alert(
      `✓ Purchase completed!\n\n` +
      `Buyer: ${buyerName}\n` +
      `Plots acquired: ${plots.length}\n` +
      `Total paid: ${formatCurrency(totalCost)}\n` +
      `Remaining budget: ${formatCurrency(budgetAfter)}`
    );
  }

  // ==========================================
  // EVENT LISTENERS SETUP
  // ==========================================
  
  /**
   * Set up all event listeners for the application
   */
  function setupEventListeners() {
    
    // ===== PURCHASE BUTTON =====
    buyBtn.addEventListener('click', buySelected);
    
    // ===== BUYER FORM INPUTS =====
    // Trigger validation and budget updates on input
    buyerBudgetInput.addEventListener('input', updateBudgetDisplay);
    buyerNameInput.addEventListener('input', validatePurchase);
    buyerIDInput.addEventListener('input', validatePurchase);
    buyerPhoneInput.addEventListener('input', validatePurchase);
    buyerEmailInput.addEventListener('input', validatePurchase);
    
    // ===== CLEAR SELECTION BUTTON =====
    document.getElementById('clearSelection').addEventListener('click', () => {
      selected.clear();
      lastSelected = null;
      render();
    });
    
    // ===== RESET DEMO BUTTON =====
    document.getElementById('resetDemo').addEventListener('click', () => {
      if (!confirm('Reset all demo data? This will clear all purchases and buyer information.')) return;
      
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      
      // Reset state
      soldSet = new Set(PRE_SOLD);
      selected.clear();
      lastSelected = null;
      totalSpent = 0;
      
      // Clear form inputs
      buyerNameInput.value = '';
      buyerIDInput.value = '';
      buyerPhoneInput.value = '';
      buyerEmailInput.value = '';
      buyerAddressInput.value = '';
      buyerOccupationInput.value = '';
      buyerBudgetInput.value = '';
      document.getElementById('bespokeNote').value = '';
      
      // Save reset state
      saveState();
      
      // Reset log
      logContainer.innerHTML = '<div class="log-empty">No transactions yet</div>';
      
      // Update displays
      updateBudgetDisplay();
      render();
    });
    
    // ===== CLEAR LOG BUTTON =====
    document.getElementById('clearLog').addEventListener('click', () => {
      if (!confirm('Clear transaction history?')) return;
      logContainer.innerHTML = '<div class="log-empty">No transactions yet</div>';
    });
    
    // ===== SELECT ALL AVAILABLE BUTTON =====
    document.getElementById('selectAvailable').addEventListener('click', () => {
      // Add all non-sold plots to selection
      for (let i = 1; i <= TOTAL; i++) {
        if (!soldSet.has(i)) selected.add(i);
      }
      render();
    });
    
    // ===== SELECT RANGE BUTTON =====
    document.getElementById('selectRange').addEventListener('click', () => {
      const start = prompt('Enter start plot number (1-200):');
      const end = prompt('Enter end plot number (1-200):');
      
      if (!start || !end) return;
      
      // Parse and clamp to valid range
      const s = Math.max(1, Math.min(TOTAL, parseInt(start)));
      const e = Math.max(1, Math.min(TOTAL, parseInt(end)));
      
      // Select all plots in range (excluding sold)
      for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
        if (!soldSet.has(i)) selected.add(i);
      }
      render();
    });
    
    // ===== ZOOM IN BUTTON =====
    document.getElementById('zoomIn').addEventListener('click', () => {
      zoomLevel = Math.min(1.5, zoomLevel + 0.1);
      gridEl.style.transform = `scale(${zoomLevel})`;
      gridEl.style.transformOrigin = 'top left';
    });
    
    // ===== ZOOM OUT BUTTON =====
    document.getElementById('zoomOut').addEventListener('click', () => {
      zoomLevel = Math.max(0.6, zoomLevel - 0.1);
      gridEl.style.transform = `scale(${zoomLevel})`;
      gridEl.style.transformOrigin = 'top left';
    });
  }

  // ==========================================
  // APPLICATION START
  // ==========================================
  
  // Initialize the application when script loads
  init();
  
  // ==========================================
  // DEBUG API (Window Object)
  // ==========================================
  
  /**
   * Expose debug helpers to browser console
   * Access via: window.LAND_SYSTEM in dev tools
   */
  window.LAND_SYSTEM = { 
    soldSet,        // Set of sold plots
    selected,       // Set of selected plots
    PRICE,          // Price per plot
    TOTAL,          // Total plot count
    totalSpent,     // Total amount spent
    currentBudget,  // Current buyer budget
    render,         // Force re-render function
    saveState       // Force save function
  };
  
})();
