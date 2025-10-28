/* ============================================
   LAND PURCHASE SYSTEM - JAVASCRIPT (BACKEND INTEGRATION)
   ============================================
   
   This system manages land plot sales with:
   - Visual plot grid (20x10 = 200 plots)
   - Buyer information collection
   - Budget tracking
   - Transaction logging
   - Backend API integration
   ============================================ */

(function(){
  'use strict';
  
  // ==========================================
  // CONSTANTS & CONFIGURATION
  // ==========================================
  
  const TOTAL = 200;                    // Total number of plots
  const PRICE = 65800;                  // Price per plot in KES
  const CURRENCY = 'KES';               // Currency code
  const USE_BACKEND = true;             // Toggle backend integration
  
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  let soldSet = new Set();        // Set of sold plot numbers
  let selected = new Set();       // Set of currently selected plot numbers
  let lastSelected = null;        // Last selected plot (for shift-select)
  let zoomLevel = 1;              // Current zoom level for grid
  let currentBudget = 0;          // Buyer's total budget
  let totalSpent = 0;             // Total amount spent from budget
  let currentBuyerId = null;      // Current buyer ID from backend

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
  // BACKEND API INTEGRATION
  // ==========================================
  
  /**
   * Load plots from backend API
   */
  async function loadPlots() {
    if (!USE_BACKEND || typeof LandPurchaseAPI === 'undefined') {
      console.log('Backend not available, using mock data');
      return;
    }
    
    try {
      const plots = await LandPurchaseAPI.getPlots();
      soldSet = new Set();
      
      plots.forEach(plot => {
        if (plot.status === 'sold') {
          soldSet.add(plot.id);
        }
      });
      
      const stats = await LandPurchaseAPI.getPlotStats();
      soldEl.innerText = stats.summary.sold || 0;
      availEl.innerText = stats.summary.available || 0;
      
      console.log('✓ Plots loaded from backend');
    } catch (error) {
      console.error('Failed to load plots from backend:', error);
    }
  }

  /**
   * Create or retrieve buyer from backend
   */
  async function getOrCreateBuyer() {
    const name = buyerNameInput.value.trim();
    const idNumber = buyerIDInput.value.trim();
    const phone = buyerPhoneInput.value.trim();
    const email = buyerEmailInput.value.trim();
    const address = buyerAddressInput.value.trim();
    const occupation = buyerOccupationInput.value.trim();
    const budget = parseFloat(buyerBudgetInput.value) || 0;
    
    if (!name || !idNumber || !phone || !email || !USE_BACKEND) {
      return null;
    }
    
    try {
      // Try to find existing buyer
      const buyers = await LandPurchaseAPI.getBuyers();
      let buyer = buyers.find(b => b.id_number === idNumber);
      
      if (!buyer) {
        // Create new buyer
        buyer = await LandPurchaseAPI.createBuyer({
          name,
          id_number: idNumber,
          phone,
          email,
          address,
          occupation,
          budget
        });
        console.log('✓ New buyer created:', buyer.id);
      }
      
      currentBuyerId = buyer.id;
      return buyer;
    } catch (error) {
      console.error('Failed to create/get buyer:', error);
      return null;
    }
  }

  /**
   * Save transaction to backend
   */
  async function saveTransaction(buyerData, plots, totalCost, note, budgetBefore, budgetAfter) {
    if (!USE_BACKEND || typeof LandPurchaseAPI === 'undefined' || !currentBuyerId) {
      return;
    }
    
    try {
      const plotIds = plots.join(',');
      
      await LandPurchaseAPI.createTransaction({
        buyer_id: currentBuyerId,
        plot_ids: plotIds,
        total_amount: totalCost,
        notes: note
      });
      
      console.log('✓ Transaction saved to backend');
    } catch (error) {
      console.error('Failed to save transaction:', error);
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================
  
  /**
   * Initialize the application
   */
  async function init() {
    await loadPlots();
    setupEventListeners();
    render();
    updateBudgetDisplay();
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  
  /**
   * Format a number as currency string
   */
  function formatCurrency(amount) {
    return `${CURRENCY} ${amount.toLocaleString()}`;
  }

  // ==========================================
  // BUDGET MANAGEMENT
  // ==========================================
  
  /**
   * Update the remaining budget display
   */
  function updateBudgetDisplay() {
    const budget = parseFloat(buyerBudgetInput.value) || 0;
    currentBudget = budget;
    const remaining = budget - totalSpent;
    
    remainingBudgetEl.innerText = formatCurrency(remaining);
    
    remainingBudgetEl.classList.remove('low', 'critical');
    
    if (remaining < PRICE) {
      remainingBudgetEl.classList.add('critical');
    } else if (remaining < PRICE * 5) {
      remainingBudgetEl.classList.add('low');
    }
    
    validatePurchase();
  }

  // ==========================================
  // FORM VALIDATION
  // ==========================================
  
  /**
   * Validate if purchase button should be enabled
   */
  function validatePurchase() {
    const selectedCount = selected.size;
    const totalCost = selectedCount * PRICE;
    const budget = parseFloat(buyerBudgetInput.value) || 0;
    const remaining = budget - totalSpent;
    
    const hasName = buyerNameInput.value.trim().length > 0;
    const hasID = buyerIDInput.value.trim().length > 0;
    const hasPhone = buyerPhoneInput.value.trim().length > 0;
    const hasEmail = buyerEmailInput.value.trim().length > 0;
    
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
   */
  function createPlot(n) {
    const div = document.createElement('div');
    div.className = 'plot';
    div.dataset.index = n;
    div.innerText = n;
    
    const isSold = soldSet.has(n);
    const isSelected = selected.has(n);
    
    if (isSold) {
      div.classList.add('sold');
      div.title = `Plot #${n} - SOLD`;
    } else {
      div.title = `Plot #${n} - ${formatCurrency(PRICE)}`;
      div.addEventListener('click', handlePlotClick);
    }
    
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
   */
  function handlePlotClick(e) {
    const idx = Number(this.dataset.index);
    
    if (soldSet.has(idx)) return;
    
    if (e.shiftKey && lastSelected !== null) {
      const start = Math.min(lastSelected, idx);
      const end = Math.max(lastSelected, idx);
      
      for (let i = start; i <= end; i++) {
        if (!soldSet.has(i)) {
          selected.add(i);
        }
      }
    } else {
      if (selected.has(idx)) {
        selected.delete(idx);
      } else {
        selected.add(idx);
      }
    }
    
    lastSelected = idx;
    render();
  }

  // ==========================================
  // MAIN RENDER FUNCTION
  // ==========================================
  
  /**
   * Render the entire UI
   */
  function render() {
    // Render grid
    gridEl.innerHTML = '';
    for (let i = 1; i <= TOTAL; i++) {
      gridEl.appendChild(createPlot(i));
    }
    
    // Update statistics
    const available = TOTAL - soldSet.size;
    const selectedCount = selected.size;
    const totalCost = selectedCount * PRICE;
    
    soldEl.innerText = soldSet.size;
    availEl.innerText = available;
    selectedCostEl.innerText = formatCurrency(totalCost);
    
    // Update selection info
    if (selectedCount === 0) {
      selectedInfoEl.innerText = 'No plots selected';
      summaryCard.classList.add('empty');
    } else {
      const plots = [...selected].sort((a, b) => a - b);
      const preview = plots.length > 5 
        ? `${plots.slice(0, 5).join(', ')} and ${plots.length - 5} more`
        : plots.join(', ');
      
      selectedInfoEl.innerText = `${selectedCount} plot${selectedCount > 1 ? 's' : ''}: ${preview}`;
      summaryCard.classList.remove('empty');
    }
    
    // Update button states
    clearSelectionBtn.disabled = selectedCount === 0;
    validatePurchase();
  }

  // ==========================================
  // TRANSACTION LOGGING
  // ==========================================
  
  /**
   * Add a transaction to the history log
   */
  function log(buyerData, plots, totalCost, bespokePlan, budgetBefore, budgetAfter) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString();
    const date = new Date().toLocaleDateString();
    
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
    
    const empty = logContainer.querySelector('.log-empty');
    if (empty) empty.remove();
    
    logContainer.insertBefore(entry, logContainer.firstChild);
  }

  // ==========================================
  // PURCHASE PROCESSING
  // ==========================================
  
  /**
   * Process the purchase of selected plots
   */
  async function buySelected() {
    if (selected.size === 0) return;
    
    const buyerName = buyerNameInput.value.trim();
    const buyerID = buyerIDInput.value.trim();
    const buyerPhone = buyerPhoneInput.value.trim();
    const buyerEmail = buyerEmailInput.value.trim();
    
    if (!buyerName || !buyerID || !buyerPhone || !buyerEmail) {
      alert('Please fill in all required fields:\n- Full Name\n- ID/Passport Number\n- Phone Number\n- Email Address');
      return;
    }
    
    const plots = [...selected].sort((a, b) => a - b);
    const totalCost = plots.length * PRICE;
    const budget = parseFloat(buyerBudgetInput.value) || 0;
    const remaining = budget - totalSpent;
    const note = document.getElementById('bespokeNote').value.trim();
    
    if (totalCost > remaining) {
      alert(
        `Insufficient budget!\n\n` +
        `Selected plots cost: ${formatCurrency(totalCost)}\n` +
        `Remaining budget: ${formatCurrency(remaining)}\n` +
        `Shortfall: ${formatCurrency(totalCost - remaining)}`
      );
      return;
    }
    
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
    
    const budgetBefore = remaining;
    totalSpent += totalCost;
    const budgetAfter = budget - totalSpent;
    
    // Get or create buyer
    const buyerData = await getOrCreateBuyer();
    
    const buyerInfo = {
      name: buyerName,
      id: buyerID,
      phone: buyerPhone,
      email: buyerEmail,
      address: buyerAddressInput.value.trim(),
      occupation: buyerOccupationInput.value.trim()
    };
    
    // Mark plots as sold in backend
    if (USE_BACKEND && typeof LandPurchaseAPI !== 'undefined' && currentBuyerId) {
      try {
        await LandPurchaseAPI.updatePlotsBulk(plots, 'sold', currentBuyerId);
        console.log('✓ Plots marked as sold in backend');
      } catch (error) {
        console.error('Failed to update plots:', error);
      }
    }
    
    // Update local sold set
    plots.forEach(n => soldSet.add(n));
    
    // Save transaction to backend
    await saveTransaction(buyerInfo, plots, totalCost, note, budgetBefore, budgetAfter);
    
    // Re-sync from backend to ensure UI reflects authoritative state
    if (USE_BACKEND && typeof LandPurchaseAPI !== 'undefined') {
      await loadPlots();
    }

    // Add to log
    log(buyerInfo, plots, totalCost, note, budgetBefore, budgetAfter);
    
    // Clean up
    selected.clear();
    document.getElementById('bespokeNote').value = '';
    lastSelected = null;
    
    updateBudgetDisplay();
    render();
    
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
    
    buyBtn.addEventListener('click', buySelected);
    
    buyerBudgetInput.addEventListener('input', updateBudgetDisplay);
    buyerNameInput.addEventListener('input', validatePurchase);
    buyerIDInput.addEventListener('input', validatePurchase);
    buyerPhoneInput.addEventListener('input', validatePurchase);
    buyerEmailInput.addEventListener('input', validatePurchase);
    
    document.getElementById('clearSelection').addEventListener('click', () => {
      selected.clear();
      lastSelected = null;
      render();
    });
    
    document.getElementById('resetDemo').addEventListener('click', async () => {
      if (!confirm('Reset all demo data? This will clear all purchases and buyer information.')) return;
      
      soldSet = new Set();
      selected.clear();
      lastSelected = null;
      totalSpent = 0;
      
      buyerNameInput.value = '';
      buyerIDInput.value = '';
      buyerPhoneInput.value = '';
      buyerEmailInput.value = '';
      buyerAddressInput.value = '';
      buyerOccupationInput.value = '';
      buyerBudgetInput.value = '';
      document.getElementById('bespokeNote').value = '';
      
      logContainer.innerHTML = '<div class="log-empty">No transactions yet</div>';
      
      updateBudgetDisplay();
      render();
      
      // Reload plots from backend
      if (USE_BACKEND) {
        await loadPlots();
        render();
      }
    });
    
    document.getElementById('clearLog').addEventListener('click', () => {
      if (!confirm('Clear transaction history?')) return;
      logContainer.innerHTML = '<div class="log-empty">No transactions yet</div>';
    });
    
    document.getElementById('selectAvailable').addEventListener('click', () => {
      for (let i = 1; i <= TOTAL; i++) {
        if (!soldSet.has(i)) selected.add(i);
      }
      render();
    });
    
    document.getElementById('selectRange').addEventListener('click', () => {
      const start = prompt('Enter start plot number (1-200):');
      const end = prompt('Enter end plot number (1-200):');
      
      if (!start || !end) return;
      
      const s = Math.max(1, Math.min(TOTAL, parseInt(start)));
      const e = Math.max(1, Math.min(TOTAL, parseInt(end)));
      
      for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
        if (!soldSet.has(i)) selected.add(i);
      }
      render();
    });
    
    document.getElementById('zoomIn').addEventListener('click', () => {
      zoomLevel = Math.min(1.5, zoomLevel + 0.1);
      gridEl.style.transform = `scale(${zoomLevel})`;
      gridEl.style.transformOrigin = 'top left';
    });
    
    document.getElementById('zoomOut').addEventListener('click', () => {
      zoomLevel = Math.max(0.6, zoomLevel - 0.1);
      gridEl.style.transform = `scale(${zoomLevel})`;
      gridEl.style.transformOrigin = 'top left';
    });
  }

  // ==========================================
  // APPLICATION START
  // ==========================================
  
  init();
  
  // ==========================================
  // DEBUG API (Window Object)
  // ==========================================
  
  window.LAND_SYSTEM = { 
    soldSet,
    selected,
    PRICE,
    TOTAL,
    totalSpent,
    currentBudget,
    render,
    loadPlots
  };
  
})();
