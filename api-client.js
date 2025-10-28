/* ============================================
   API CLIENT
   ============================================
   
   Client-side API integration for Land Purchase System
   Handles communication with backend API
   ============================================ */

class LandPurchaseAPI {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ==========================================
  // PLOTS API
  // ==========================================

  async getPlots(status) {
    const endpoint = status ? `/plots?status=${status}` : '/plots';
    return this.request(endpoint);
  }

  async getPlotStats() {
    return this.request('/plots/stats');
  }

  async getPlot(id) {
    return this.request(`/plots/${id}`);
  }

  async updatePlot(id, status, buyerId) {
    return this.request(`/plots/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, buyer_id: buyerId })
    });
  }

  async updatePlotsBulk(plotIds, status, buyerId) {
    return this.request('/plots/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ plotIds, status, buyer_id: buyerId })
    });
  }

  // ==========================================
  // BUYERS API
  // ==========================================

  async getBuyers() {
    return this.request('/buyers');
  }

  async getBuyer(id) {
    return this.request(`/buyers/${id}`);
  }

  async createBuyer(buyerData) {
    return this.request('/buyers', {
      method: 'POST',
      body: JSON.stringify(buyerData)
    });
  }

  async updateBuyer(id, buyerData) {
    return this.request(`/buyers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(buyerData)
    });
  }

  // ==========================================
  // TRANSACTIONS API
  // ==========================================

  async getTransactions(filters = {}) {
    const params = new URLSearchParams(filters);
    const endpoint = `/transactions?${params}`;
    return this.request(endpoint);
  }

  async getTransaction(id) {
    return this.request(`/transactions/${id}`);
  }

  async createTransaction(transactionData) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData)
    });
  }

  async updateTransactionStatus(id, paymentStatus) {
    return this.request(`/transactions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ payment_status: paymentStatus })
    });
  }
}

// Export singleton instance
window.LandPurchaseAPI = new LandPurchaseAPI();
