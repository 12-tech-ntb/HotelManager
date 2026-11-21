/**
 * HOTEL MANAGEMENT SYSTEM - CUSTOMER SERVICE
 * Data access and operations for hotel guests
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
   * Create or retrieve customer by phone number
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

    const newCustomer = {
      id: `c${String(Date.now()).slice(-4)}`,
      fullName: String(customerData.fullName).trim(),
      phone: cleanPhone,
      email: customerData.email ? String(customerData.email).trim() : '',
      idCard: customerData.idCard ? String(customerData.idCard).trim() : '',
      visits: 1,
      totalSpent: 0
    };

    const updated = [newCustomer, ...customers];
    store.set('customers', updated);
    return newCustomer;
  }
};
