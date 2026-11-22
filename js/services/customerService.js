/**
 * HOTEL MANAGEMENT SYSTEM - CUSTOMER SERVICE
 * Data access and operations for hotel guests & guest profiles
 * Sẵn sàng tích hợp Supabase Client (`supabase.from('customers').*`)
 */

import { store } from '../core/state.js';

export const customerService = {
  /**
   * Retrieve all customers
   * @returns {Promise<Array>}
   */
  async getAllCustomers() {
    return store.get('customers') || [];
  },

  /**
   * Get customer by ID
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async getCustomerById(id) {
    const customers = store.get('customers') || [];
    return customers.find(c => c.id === id) || null;
  },

  /**
   * Calculate summary statistics of hotel customers
   * @returns {Promise<Object>} { total, loyal, inHouse, totalRevenue }
   */
  async getCustomerStats() {
    const customers = store.get('customers') || [];
    const bookings = store.get('bookings') || [];

    const total = customers.length;
    // Loyal guests: visited 2 times or more
    const loyal = customers.filter(c => (Number(c.visits) || 0) >= 2).length;

    // In-house guests: customers with active 'checked_in' bookings
    const inHouseCustomerIds = new Set(
      bookings
        .filter(b => b.status === 'checked_in')
        .map(b => b.customerId)
        .filter(Boolean)
    );
    const inHouse = inHouseCustomerIds.size;

    // Total accumulated revenue from all customers
    const totalRevenue = customers.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0);

    return {
      total,
      loyal,
      inHouse,
      totalRevenue
    };
  },

  /**
   * Filter customers by search keyword and category
   * @param {Object} filters { search, category }
   * @returns {Promise<Array>}
   */
  async filterCustomers({ search = '', category = 'all' } = {}) {
    let customers = store.get('customers') || [];

    // Filter by keyword (name, phone, email, idCard)
    if (search && search.trim() !== '') {
      const keyword = search.trim().toLowerCase();
      customers = customers.filter(c => {
        const nameMatch = c.fullName && c.fullName.toLowerCase().includes(keyword);
        const phoneMatch = c.phone && c.phone.toLowerCase().includes(keyword);
        const emailMatch = c.email && c.email.toLowerCase().includes(keyword);
        const idCardMatch = c.idCard && c.idCard.toLowerCase().includes(keyword);
        return nameMatch || phoneMatch || emailMatch || idCardMatch;
      });
    }

    // Filter by category
    if (category === 'vip') {
      customers = customers.filter(c => (Number(c.visits) || 0) >= 2);
    } else if (category === 'new') {
      customers = customers.filter(c => (Number(c.visits) || 0) <= 1);
    }

    return customers;
  },

  /**
   * Create or retrieve customer by phone number (used during booking)
   * @param {Object} customerData { fullName, phone, email, idCard }
   * @returns {Promise<Object>}
   */
  async findOrCreateCustomer(customerData) {
    const customers = store.get('customers') || [];
    const cleanPhone = String(customerData.phone).trim();

    const existing = customers.find(c => c.phone.trim() === cleanPhone);
    if (existing) {
      return existing;
    }

    return this.createCustomer(customerData);
  },

  /**
   * Create a new customer profile
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async createCustomer(data) {
    const customers = store.get('customers') || [];
    const cleanPhone = String(data.phone || '').trim();

    if (!cleanPhone) {
      throw new Error("Số điện thoại khách hàng không được để trống!");
    }

    // Check duplicate phone
    const exists = customers.some(c => c.phone.trim() === cleanPhone);
    if (exists) {
      throw new Error(`Số điện thoại "${cleanPhone}" đã được đăng ký cho khách hàng khác!`);
    }

    const newCustomer = {
      id: data.id || `c${String(Date.now()).slice(-4)}`,
      fullName: String(data.fullName || '').trim() || 'Khách vãng lai',
      phone: cleanPhone,
      email: data.email ? String(data.email).trim() : '',
      idCard: data.idCard ? String(data.idCard).trim() : '',
      visits: Number(data.visits) || 0,
      totalSpent: Number(data.totalSpent) || 0,
      notes: data.notes ? String(data.notes).trim() : ''
    };

    const updated = [newCustomer, ...customers];
    store.set('customers', updated);
    return newCustomer;
  },

  /**
   * Update existing customer profile
   * @param {string} id 
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async updateCustomer(id, data) {
    const customers = store.get('customers') || [];
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error("Không tìm thấy thông tin khách hàng cần cập nhật!");
    }

    const cleanPhone = data.phone ? String(data.phone).trim() : null;
    if (cleanPhone) {
      const exists = customers.some(c => c.id !== id && c.phone.trim() === cleanPhone);
      if (exists) {
        throw new Error(`Số điện thoại "${cleanPhone}" đã thuộc về khách hàng khác!`);
      }
    }

    const current = customers[index];
    const updatedCustomer = {
      ...current,
      ...data,
      fullName: data.fullName !== undefined ? String(data.fullName).trim() : current.fullName,
      phone: cleanPhone || current.phone,
      email: data.email !== undefined ? String(data.email).trim() : current.email,
      idCard: data.idCard !== undefined ? String(data.idCard).trim() : current.idCard,
      visits: data.visits !== undefined ? Number(data.visits) : current.visits,
      totalSpent: data.totalSpent !== undefined ? Number(data.totalSpent) : current.totalSpent,
      notes: data.notes !== undefined ? String(data.notes).trim() : (current.notes || '')
    };

    const updatedList = [...customers];
    updatedList[index] = updatedCustomer;
    store.set('customers', updatedList);
    return updatedCustomer;
  },

  /**
   * Delete customer profile
   * Blocked if customer has existing booking history
   * @param {string} id 
   * @returns {Promise<boolean>}
   */
  async deleteCustomer(id) {
    const customers = store.get('customers') || [];
    const customer = customers.find(c => c.id === id);
    if (!customer) {
      throw new Error("Không tìm thấy khách hàng cần xóa!");
    }

    // Check if customer has bookings
    const bookings = store.get('bookings') || [];
    const customerBookings = bookings.filter(b => b.customerId === id);
    if (customerBookings.length > 0) {
      throw new Error(`Không thể xóa khách hàng "${customer.fullName}" vì đang có ${customerBookings.length} đơn đặt phòng trong lịch sử hệ thống!`);
    }

    const updated = customers.filter(c => c.id !== id);
    store.set('customers', updated);
    return true;
  },

  /**
   * Get all booking records for a given customer
   * @param {string} customerId 
   * @returns {Promise<Array>}
   */
  async getCustomerBookings(customerId) {
    const bookings = store.get('bookings') || [];
    return bookings
      .filter(b => b.customerId === customerId)
      .sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
  }
};
