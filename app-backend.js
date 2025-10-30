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
  const buyerPhoneInput = document.getElementById('buyerPhone');
  const buyerIDInput = document.getElementById('buyerID');
  

  
  // Payment Controls
  const paymentModeFull = document.getElementById('paymentModeFull');
  const paymentModeInstallments = document.getElementById('paymentModeInstallments');
  const installmentFields = document.getElementById('installmentFields');
  const depositTypePercent = document.getElementById('depositTypePercent');
  const depositTypeAmount = document.getElementById('depositTypeAmount');
  const depositPercentInput = document.getElementById('depositPercent');
  const depositAmountInput = document.getElementById('depositAmount');
  const depositHelper = document.getElementById('depositHelper');
  const installmentMonthsInput = document.getElementById('installmentMonths');
  const installmentStartDateInput = document.getElementById('installmentStartDate');
  const installmentSummary = document.getElementById('installmentSummary');
  const monthlyAmountEl = document.getElementById('monthlyAmount');
  const depositPayableEl = document.getElementById('depositPayable');
  
  // Transaction Log
  const logContainer = document.getElementById('logContainer');
  
  // Payments Panel Elements
  const payTxIdInput = document.getElementById('payTransactionId');
  const loadTxBtn = document.getElementById('loadTransactionBtn');
  const recordPaymentBtn = document.getElementById('recordPaymentBtn');
  const payAmountInput = document.getElementById('payAmount');
  const payMethodSelect = document.getElementById('payMethod');
  const payRefInput = document.getElementById('payReference');
  const payDateInput = document.getElementById('payDate');
  const paymentSummaryEl = document.getElementById('paymentSummary');
  const payTotalAmountEl = document.getElementById('payTotalAmount');
  const payTotalPaidEl = document.getElementById('payTotalPaid');
  const payRemainingEl = document.getElementById('payRemaining');
  const paymentsListEl = document.getElementById('paymentsList');
  
  // Buyer Balance Elements
  const balanceBuyerIdNumberInput = document.getElementById('balanceBuyerIdNumber');
  const loadBuyerBalanceBtn = document.getElementById('loadBuyerBalanceBtn');
  const buyerBalanceListEl = document.getElementById('buyerBalanceList');

  // Payment Report Elements
  const generateReportBtn = document.getElementById('generateReportBtn');
  const exportReportBtn = document.getElementById('exportReportBtn');
  const reportStats = document.getElementById('reportStats');
  const totalSalesAmountEl = document.getElementById('totalSalesAmount');
  const totalPaidAmountEl = document.getElementById('totalPaidAmount');
  const totalOutstandingAmountEl = document.getElementById('totalOutstandingAmount');
  const totalPlotsSoldEl = document.getElementById('totalPlotsSold');
  const paymentReportListEl = document.getElementById('paymentReportList');

  // API instance from global
  const API = (typeof window !== 'undefined' && window.LandPurchaseAPI) ? window.LandPurchaseAPI : null;

  // ==========================================
  // BACKEND API INTEGRATION
  // ==========================================
  
  /**
   * Load plots from backend API
   */
  async function loadPlots() {
    if (!USE_BACKEND || !API || typeof API.getPlots !== 'function') {
      console.log('Backend not available, using mock data');
      return;
    }
    
    try {
      const plots = await API.getPlots();
      soldSet = new Set();
      
      plots.forEach(plot => {
        if (plot.status === 'sold') {
          soldSet.add(plot.id);
        }
      });
      
      const stats = await API.getPlotStats();
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
    const phone = buyerPhoneInput.value.trim();
    const idNumber = buyerIDInput.value.trim();
    
    if (!name || !phone || !idNumber || !USE_BACKEND || !API) {
      return null;
    }
    
    try {
      // Try to find existing buyer by ID number
      const buyers = await API.getBuyers();
      let buyer = buyers.find(b => b.id_number === idNumber);
      
      if (!buyer) {
        // Create new buyer
        buyer = await API.createBuyer({
          name,
          id_number: idNumber,
          phone,
          email: '', // Empty email
          address: '', // Empty address
          occupation: '', // Empty occupation
          budget: 0 // No budget tracking
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
    if (!USE_BACKEND || !API || !currentBuyerId) {
      return null;
    }
    
    try {
      const plotIds = plots.join(',');
      
      const tx = await API.createTransaction({
        buyer_id: currentBuyerId,
        plot_ids: plotIds,
        total_amount: totalCost,
        notes: note
      });
      
      console.log('✓ Transaction saved to backend');
      return tx;
    } catch (error) {
      console.error('Failed to save transaction:', error);
      return null;
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

  /**
   * Compute deposit amount based on current inputs
   */
  function computeDepositAmount(totalCost) {
    if (!(paymentModeInstallments && paymentModeInstallments.checked)) return totalCost;
    const isPercent = depositTypePercent && depositTypePercent.checked;
    if (isPercent) {
      const pct = Math.max(0, Math.min(100, parseFloat(depositPercentInput && depositPercentInput.value) || 0));
      return Math.round((pct / 100) * totalCost);
    }
    const amt = Math.max(0, parseFloat(depositAmountInput && depositAmountInput.value) || 0);
    return Math.min(totalCost, Math.round(amt));
  }

  /**
   * Update installment UI helper labels and monthly calc
   */
  function updateInstallmentUI(totalCost) {
    if (!(paymentModeInstallments && paymentModeInstallments.checked)) return;
    const depositNow = computeDepositAmount(totalCost);
    const months = Math.max(0, parseInt(installmentMonthsInput && installmentMonthsInput.value) || 0);
    const remaining = Math.max(0, totalCost - depositNow);
    const monthly = months > 0 ? Math.ceil(remaining / months) : 0;
    
    if (depositHelper) {
      const pct = totalCost > 0 ? Math.round((depositNow / totalCost) * 100) : 0;
      depositHelper.textContent = `Deposit set to ${formatCurrency(depositNow)} (${pct}%) of ${formatCurrency(totalCost)}`;
    }
    if (depositPayableEl) depositPayableEl.textContent = formatCurrency(depositNow);
    if (monthlyAmountEl) monthlyAmountEl.textContent = formatCurrency(monthly);
    if (installmentSummary) installmentSummary.style.display = totalCost > 0 ? '' : 'none';
  }



  // ==========================================
  // FORM VALIDATION
  // ==========================================
  
  /**
   * Validate if purchase button should be enabled
   */
  function validatePurchase() {
    const selectedCount = selected.size;
    
    const hasName = buyerNameInput.value.trim().length > 0;
    const hasPhone = buyerPhoneInput.value.trim().length > 0;
    const hasID = buyerIDInput.value.trim().length > 0;
    
    const isValid = selectedCount > 0 && hasName && hasPhone && hasID;
    
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
    // Update installment summary when in installment mode
    if (paymentModeInstallments && paymentModeInstallments.checked) {
      updateInstallmentUI(totalCost);
    }
    validatePurchase();
  }

  // ==========================================
  // TRANSACTION LOGGING
  // ==========================================
  
  /**
   * Add a transaction to the history log
   */
  function log(buyerData, plots, totalCost, note, budgetBefore, budgetAfter) {
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
        <div><strong>Plot Numbers:</strong> ${buyerData.plots}</div>
      </div>
      <div class="log-details">
        Purchased ${plots.length} plot${plots.length > 1 ? 's' : ''}: ${plots.join(', ')}
      </div>
      ${note ? `<div class="payment-plan"><div class="payment-plan-title">Purchase Notes:</div>${note}</div>` : ''}
      <div class="log-budget">
        <div class="log-budget-item">
          <span class="log-budget-label">Purchase Amount</span>
          <span class="log-budget-value">${formatCurrency(totalCost)}</span>
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
    const buyerPhone = buyerPhoneInput.value.trim();
    const buyerID = buyerIDInput.value.trim();
    
    if (!buyerName || !buyerPhone || !buyerID) {
      alert('Please fill in all required fields:\n- Full Name\n- Phone Number\n- ID Number');
      return;
    }
    
    const plots = [...selected].sort((a, b) => a - b);
    const totalCost = plots.length * PRICE;
    const note = document.getElementById('bespokeNote').value.trim();
    
    const confirmation = confirm(
      `Confirm purchase for ${buyerName}?\n\n` +
      `ID: ${buyerID}\n` +
      `Phone: ${buyerPhone}\n\n` +
      `Plots: ${plots.join(', ')}\n` +
      `Total Cost: ${formatCurrency(totalCost)}` +
      (note ? `\n\nPurchase Notes: ${note.substring(0, 100)}...` : '')
    );
    
    if (!confirmation) return;
    
    // Get or create buyer
    const buyerData = await getOrCreateBuyer();
    
    const buyerInfo = {
      name: buyerName,
      id: buyerID,
      phone: buyerPhone,
      plots: plots.join(', ') // Include plot numbers in buyer info
    };
    
    // Mark plots as sold in backend
    if (USE_BACKEND && API && currentBuyerId) {
      try {
        await API.updatePlotsBulk(plots, 'sold', currentBuyerId);
        console.log('✓ Plots marked as sold in backend');
      } catch (error) {
        console.error('Failed to update plots:', error);
      }
    }
    
    // Update local sold set
    plots.forEach(n => soldSet.add(n));
    
    // Save transaction to backend
    const createdTx = await saveTransaction(buyerInfo, plots, totalCost, note, 0, 0);
    
    // Re-sync from backend to ensure UI reflects authoritative state
    if (USE_BACKEND && API) {
      await loadPlots();
    }

    // Add to log
    log(buyerInfo, plots, totalCost, note, 0, 0);
    
    // Clean up
    selected.clear();
    document.getElementById('bespokeNote').value = '';
    lastSelected = null;
    
    render();
    
    // Show toast success message
    try {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = `✓ Purchase sent successfully for ${buyerName} (${plots.length} plot${plots.length>1?'s':''})`;
        toast.style.display = 'block';
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.style.display = 'none', 200);
        }, 3500);
      }
    } catch(_) {}
  }

  // ==========================================
  // EVENT LISTENERS SETUP
  // ==========================================
  
  /**
   * Set up all event listeners for the application
   */
  function setupEventListeners() {
    
    buyBtn.addEventListener('click', buySelected);
    
    buyerNameInput.addEventListener('input', validatePurchase);
    buyerPhoneInput.addEventListener('input', validatePurchase);
    buyerIDInput.addEventListener('input', validatePurchase);

    // Payment mode toggles
    if (paymentModeFull && paymentModeInstallments) {
      paymentModeFull.addEventListener('change', () => {
        if (paymentModeFull.checked) {
          installmentFields.style.display = 'none';
          installmentSummary.style.display = 'none';
          validatePurchase();
        }
      });
      paymentModeInstallments.addEventListener('change', () => {
        if (paymentModeInstallments.checked) {
          installmentFields.style.display = '';
          updateInstallmentUI(selected.size * PRICE);
          validatePurchase();
        }
      });
    }

    // Deposit inputs behavior
    if (depositTypePercent && depositTypeAmount) {
      const onDepositTypeChange = () => {
        const isPercent = depositTypePercent.checked;
        depositPercentInput.disabled = !isPercent;
        depositAmountInput.disabled = isPercent;
        updateInstallmentUI(selected.size * PRICE);
        validatePurchase();
      };
      depositTypePercent.addEventListener('change', onDepositTypeChange);
      depositTypeAmount.addEventListener('change', onDepositTypeChange);
    }

    if (depositPercentInput) depositPercentInput.addEventListener('input', () => { updateInstallmentUI(selected.size * PRICE); validatePurchase(); });
    if (depositAmountInput) depositAmountInput.addEventListener('input', () => { updateInstallmentUI(selected.size * PRICE); validatePurchase(); });
    if (installmentMonthsInput) installmentMonthsInput.addEventListener('input', () => { updateInstallmentUI(selected.size * PRICE); validatePurchase(); });
    
    // Payments panel events
    if (loadTxBtn) {
      loadTxBtn.addEventListener('click', async () => {
        const txId = parseInt(payTxIdInput && payTxIdInput.value);
        if (!txId || !USE_BACKEND || !API) return;
        await refreshPaymentsView(txId);
      });
    }
    if (recordPaymentBtn) {
      recordPaymentBtn.addEventListener('click', async () => {
        const txId = parseInt(payTxIdInput && payTxIdInput.value);
        const amount = parseFloat(payAmountInput && payAmountInput.value) || 0;
        const method = (payMethodSelect && payMethodSelect.value) || 'cash';
        const reference = (payRefInput && payRefInput.value) || '';
        const paidAt = (payDateInput && payDateInput.value) ? new Date(payDateInput.value).toISOString() : new Date().toISOString();
        if (!txId || amount <= 0 || !USE_BACKEND || !API) return;
        try {
          await API.createPayment({ transaction_id: txId, amount, method, reference, paid_at: paidAt });
          // After creating payment, recompute remaining to decide status
          const { totalAmount, totalPaid } = await refreshPaymentsView(txId);
          const status = totalPaid >= totalAmount ? 'paid' : 'partial';
          await API.updateTransactionStatus(txId, status);
        } catch (err) {
          console.error('Failed to record payment:', err);
        }
      });
    }
    
    // Buyer Balance load
    if (loadBuyerBalanceBtn) {
      loadBuyerBalanceBtn.addEventListener('click', async () => {
        const idNumber = (balanceBuyerIdNumberInput && balanceBuyerIdNumberInput.value || '').trim();
        if (!idNumber || !USE_BACKEND || !API) return;
        try {
          if (buyerBalanceListEl) buyerBalanceListEl.innerHTML = '<div class="log-empty">Loading...</div>';
          const buyers = await API.getBuyers();
          // Search by ID number
          let buyer = buyers.find(b => b.id_number === idNumber);
          if (!buyer) {
            if (buyerBalanceListEl) buyerBalanceListEl.innerHTML = '<div class="log-empty">Buyer not found</div>';
            return;
          }
          // Try to get buyer's transactions with filter; fall back to all
          let txs = [];
          try {
            txs = await API.getTransactions({ buyer_id: buyer.id });
          } catch (_) {
            txs = await API.getTransactions({});
            if (Array.isArray(txs)) txs = txs.filter(t => String(t.buyer_id) === String(buyer.id));
          }
          if (!Array.isArray(txs) || txs.length === 0) {
            if (buyerBalanceListEl) buyerBalanceListEl.innerHTML = '<div class="log-empty">No transactions</div>';
            return;
          }
          // For each transaction, load payments and compute totals
          const rows = [];
          for (const tx of txs) {
            let payments = [];
            try {
              payments = await API.getPayments({ transaction_id: tx.id });
            } catch (_) { payments = []; }
            const totalAmount = Number(tx.total_amount || 0);
            const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const remaining = Math.max(0, totalAmount - totalPaid);
            const status = totalPaid >= totalAmount ? 'Paid' : (totalPaid > 0 ? 'Partial' : 'Unpaid');
            const plotNumbers = tx.plot_ids || 'N/A';
            rows.push(`
              <div class="log-entry">
                <div class="log-time">TX #${tx.id}</div>
                <div class="log-details">
                  <div><strong>Plot Numbers:</strong> ${plotNumbers}</div>
                  <div><strong>Total:</strong> ${formatCurrency(totalAmount)}</div>
                  <div><strong>Paid:</strong> ${formatCurrency(totalPaid)}</div>
                  <div><strong>Remaining:</strong> ${formatCurrency(remaining)}</div>
                  <div><strong>Status:</strong> ${status}</div>
                </div>
              </div>
            `);
          }
          if (buyerBalanceListEl) buyerBalanceListEl.innerHTML = rows.join('');
        } catch (err) {
          console.error('Failed to load buyer balance:', err);
          if (buyerBalanceListEl) buyerBalanceListEl.innerHTML = '<div class="log-empty">Failed to load</div>';
        }
      });
    }

    // Payment Report Generation
    if (generateReportBtn) {
      generateReportBtn.addEventListener('click', async () => {
        await generatePaymentReport();
      });
    }

    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', () => {
        exportPaymentReport();
      });
    }
    
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
      buyerPhoneInput.value = '';
      buyerIDInput.value = '';
      document.getElementById('bespokeNote').value = '';
      
      logContainer.innerHTML = '<div class="log-empty">No transactions yet</div>';
      
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
  // PAYMENTS HELPERS
  // ==========================================

  /**
   * Generate comprehensive payment report
   */
  async function generatePaymentReport() {
    if (!USE_BACKEND || !API) {
      if (paymentReportListEl) paymentReportListEl.innerHTML = '<div class="log-empty">Backend not available</div>';
      return;
    }

    try {
      if (paymentReportListEl) paymentReportListEl.innerHTML = '<div class="log-empty">Generating report...</div>';
      
      // Get all transactions and buyers
      const [transactions, buyers] = await Promise.all([
        API.getTransactions(),
        API.getBuyers()
      ]);

      if (!Array.isArray(transactions) || transactions.length === 0) {
        if (paymentReportListEl) paymentReportListEl.innerHTML = '<div class="log-empty">No transactions found</div>';
        return;
      }

      // Create buyer lookup map
      const buyerMap = {};
      buyers.forEach(buyer => {
        buyerMap[buyer.id] = buyer;
      });

      let totalSales = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;
      let totalPlots = 0;
      const reportRows = [];

      // Process each transaction
      for (const tx of transactions) {
        const buyer = buyerMap[tx.buyer_id] || { name: 'Unknown', phone: 'N/A', id_number: 'N/A' };
        const txAmount = Number(tx.total_amount || 0);
        
        // Get payments for this transaction
        let payments = [];
        try {
          payments = await API.getPayments({ transaction_id: tx.id });
        } catch (_) { payments = []; }
        
        const paidAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const outstanding = Math.max(0, txAmount - paidAmount);
        const status = paidAmount >= txAmount ? 'Paid' : (paidAmount > 0 ? 'Partial' : 'Unpaid');
        const plotCount = tx.plot_ids ? tx.plot_ids.split(',').length : 0;

        // Update totals
        totalSales += txAmount;
        totalPaid += paidAmount;
        totalOutstanding += outstanding;
        totalPlots += plotCount;

        // Create report row
        reportRows.push(`
          <div class="log-entry">
            <div class="log-time">TX #${tx.id} - ${buyer.name}</div>
            <div class="log-details">
              <div><strong>ID:</strong> ${buyer.id_number}</div>
              <div><strong>Phone:</strong> ${buyer.phone}</div>
              <div><strong>Plot Numbers:</strong> ${tx.plot_ids || 'N/A'}</div>
              <div><strong>Plots Count:</strong> ${plotCount}</div>
              <div><strong>Total Amount:</strong> ${formatCurrency(txAmount)}</div>
              <div><strong>Amount Paid:</strong> ${formatCurrency(paidAmount)}</div>
              <div><strong>Outstanding:</strong> ${formatCurrency(outstanding)}</div>
              <div><strong>Status:</strong> <span style="color: ${status === 'Paid' ? 'var(--success)' : status === 'Partial' ? 'var(--warning)' : 'var(--danger)'};">${status}</span></div>
            </div>
          </div>
        `);
      }

      // Update summary statistics
      if (totalSalesAmountEl) totalSalesAmountEl.textContent = formatCurrency(totalSales);
      if (totalPaidAmountEl) totalPaidAmountEl.textContent = formatCurrency(totalPaid);
      if (totalOutstandingAmountEl) totalOutstandingAmountEl.textContent = formatCurrency(totalOutstanding);
      if (totalPlotsSoldEl) totalPlotsSoldEl.textContent = totalPlots.toString();

      // Show statistics and export button
      if (reportStats) reportStats.style.display = '';
      if (exportReportBtn) exportReportBtn.style.display = '';

      // Display report
      if (paymentReportListEl) {
        paymentReportListEl.innerHTML = reportRows.length > 0 ? reportRows.join('') : '<div class="log-empty">No data to display</div>';
      }

      console.log('✓ Payment report generated successfully');
    } catch (error) {
      console.error('Failed to generate payment report:', error);
      if (paymentReportListEl) paymentReportListEl.innerHTML = '<div class="log-empty">Failed to generate report</div>';
    }
  }

  /**
   * Export payment report as CSV
   */
  function exportPaymentReport() {
    if (!USE_BACKEND || !API) return;

    try {
      // Get data from the current report display
      const reportEntries = document.querySelectorAll('#paymentReportList .log-entry');
      if (reportEntries.length === 0) {
        alert('No report data to export. Please generate a report first.');
        return;
      }

      // Create CSV content
      let csvContent = 'Transaction ID,Buyer Name,ID Number,Phone,Plot Numbers,Plot Count,Total Amount,Amount Paid,Outstanding,Status\n';
      
      reportEntries.forEach(entry => {
        const timeEl = entry.querySelector('.log-time');
        const detailsEl = entry.querySelector('.log-details');
        
        if (timeEl && detailsEl) {
          const txMatch = timeEl.textContent.match(/TX #(\d+) - (.+)/);
          const txId = txMatch ? txMatch[1] : '';
          const buyerName = txMatch ? txMatch[2] : '';
          
          const details = detailsEl.textContent;
          const idMatch = details.match(/ID:\s*([^\n]+)/);
          const phoneMatch = details.match(/Phone:\s*([^\n]+)/);
          const plotsMatch = details.match(/Plot Numbers:\s*([^\n]+)/);
          const countMatch = details.match(/Plots Count:\s*([^\n]+)/);
          const totalMatch = details.match(/Total Amount:\s*([^\n]+)/);
          const paidMatch = details.match(/Amount Paid:\s*([^\n]+)/);
          const outstandingMatch = details.match(/Outstanding:\s*([^\n]+)/);
          const statusMatch = details.match(/Status:\s*([^\n]+)/);

          const row = [
            txId,
            `"${buyerName}"`,
            idMatch ? idMatch[1].trim() : '',
            phoneMatch ? phoneMatch[1].trim() : '',
            `"${plotsMatch ? plotsMatch[1].trim() : ''}"`,
            countMatch ? countMatch[1].trim() : '',
            totalMatch ? totalMatch[1].trim() : '',
            paidMatch ? paidMatch[1].trim() : '',
            outstandingMatch ? outstandingMatch[1].trim() : '',
            statusMatch ? statusMatch[1].trim() : ''
          ].join(',');
          
          csvContent += row + '\n';
        }
      });

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payment_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✓ Payment report exported successfully');
    } catch (error) {
      console.error('Failed to export payment report:', error);
      alert('Failed to export report. Please try again.');
    }
  }
  
  async function refreshPaymentsView(txId) {
    try {
      if (!USE_BACKEND || !API) return { totalAmount: 0, totalPaid: 0 };
      const tx = await API.getTransaction(txId);
      const payments = await API.getPayments({ transaction_id: txId });
      const totalAmount = Number(tx.total_amount || 0);
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const remaining = Math.max(0, totalAmount - totalPaid);
      
      if (paymentSummaryEl) paymentSummaryEl.style.display = '';
      if (payTotalAmountEl) payTotalAmountEl.textContent = formatCurrency(totalAmount);
      if (payTotalPaidEl) payTotalPaidEl.textContent = formatCurrency(totalPaid);
      if (payRemainingEl) payRemainingEl.textContent = formatCurrency(remaining);
      if (recordPaymentBtn) recordPaymentBtn.disabled = false;
      
      if (paymentsListEl) {
        if (!payments.length) {
          paymentsListEl.innerHTML = '<div class="log-empty">No payments found</div>';
        } else {
          paymentsListEl.innerHTML = payments.map(p => {
            const when = p.paid_at ? new Date(p.paid_at).toLocaleString() : '';
            return `<div class="log-entry"><div class="log-time">${when}</div><div class="log-details"><strong>${formatCurrency(Number(p.amount||0))}</strong> · ${p.method || 'unknown'}${p.reference ? ` · ${p.reference}` : ''}</div></div>`;
          }).join('');
        }
      }
      
      return { totalAmount, totalPaid };
    } catch (err) {
      console.error('Failed to load payments/transaction:', err);
      return { totalAmount: 0, totalPaid: 0 };
    }
  }
  
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
