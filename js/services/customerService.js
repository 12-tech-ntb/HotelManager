/**
 * HOTEL MANAGEMENT SYSTEM - CUSTOMER SERVICE
 * Data access and operations for hotel guests & guest profiles
 * Connected directly to Supabase
 */

import { store } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { toast } from '../core/toast.js';

/**
 * Map DB row (snake_case) to UI Model (camelCase)
 * @param {Object} row 
 * @returns {Object|null}
 */
export function mapCustomerFromDB(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email || '',
    idCard: row.id_card || '',
    visits: Number(row.visits || 0),
    totalSpent: Number(row.total_spent || 0),
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Map UI Model (camelCase) to DB row (snake_case)
 * @param {Object} c 
 * @returns {Object}
 */
export function mapCustomerToDB(c) {
  const row = {};
  if (c.fullName !== undefined) row.full_name = String(c.fullName).trim();
  if (c.phone !== undefined) row.phone = String(c.phone).trim();
  if (c.email !== undefined) row.email = String(c.email).trim();
  if (c.idCard !== undefined) row.id_card = String(c.idCard).trim();
  if (c.visits !== undefined) row.visits = Number(c.visits || 0);
  if (c.totalSpent !== undefined) row.total_spent = Number(c.totalSpent || 0);
  if (c.notes !== undefined) row.notes = String(c.notes).trim();
  return row;
}

export const customerService = {
  /**
   * Retrieve all customers from Supabase
   * @returns {Promise<Array>}
   */
  async getAllCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[customerService.getAllCustomers] Lỗi Supabase:', error);
        toast.show('Không thể tải danh sách khách hàng: ' + error.message, 'error');
        return store.get('customers') || [];
      }

      const customers = (data || []).map(mapCustomerFromDB);
      store.set('customers', customers);
      return customers;
    } catch (err) {
      console.error('[customerService.getAllCustomers] Ngoại lệ kết nối:', err);
      toast.show('Lỗi kết nối khi tải danh sách khách hàng: ' + err.message, 'error');
      return store.get('customers') || [];
    }
  },

  /**
   * Get customer by ID
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async getCustomerById(id) {
    if (!id) return null;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`[customerService.getCustomerById] Lỗi tìm khách hàng ${id}:`, error);
        return null;
      }

      return mapCustomerFromDB(data);
    } catch (err) {
      console.error(`[customerService.getCustomerById] Ngoại lệ:`, err);
      return null;
    }
  },

  /**
   * Calculate summary statistics of hotel customers
   * @returns {Promise<Object>} { total, loyal, inHouse, totalRevenue }
   */
  async getCustomerStats() {
    const customers = await this.getAllCustomers();
    const bookings = store.get('bookings') || [];

    const total = customers.length;
    const loyal = customers.filter(c => (Number(c.visits) || 0) >= 2).length;

    const inHouseCustomerIds = new Set(
      bookings
        .filter(b => b.status === 'checked_in')
        .map(b => b.customerId)
        .filter(Boolean)
    );
    const inHouse = inHouseCustomerIds.size;

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
    let customers = await this.getAllCustomers();

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
    const cleanPhone = String(customerData.phone || '').trim();
    if (!cleanPhone) {
      throw new Error("Số điện thoại khách hàng không được để trống!");
    }

    // Normalized search in Supabase
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!error && data) {
        return mapCustomerFromDB(data);
      }
    } catch (e) {
      console.warn('[customerService.findOrCreateCustomer] Không thể kiểm tra phone:', e);
    }

    return this.createCustomer(customerData);
  },

  /**
   * Create a new customer profile in Supabase
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async createCustomer(data) {
    const cleanPhone = String(data.phone || '').trim();
    if (!cleanPhone) {
      throw new Error("Số điện thoại khách hàng không được để trống!");
    }

    const dbPayload = mapCustomerToDB({
      fullName: String(data.fullName || '').trim() || 'Khách vãng lai',
      phone: cleanPhone,
      email: data.email || '',
      idCard: data.idCard || '',
      visits: Number(data.visits) || 0,
      totalSpent: Number(data.totalSpent) || 0,
      notes: data.notes || ''
    });

    try {
      const { data: createdRow, error } = await supabase
        .from('customers')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error('[customerService.createCustomer] Lỗi Supabase:', error);
        toast.show('Không thể tạo thông tin khách hàng: ' + error.message, 'error');
        throw new Error(error.message);
      }

      const newCustomer = mapCustomerFromDB(createdRow);
      const customers = store.get('customers') || [];
      store.set('customers', [newCustomer, ...customers]);
      return newCustomer;
    } catch (err) {
      console.error('[customerService.createCustomer] Ngoại lệ:', err);
      throw err;
    }
  },

  /**
   * Update existing customer profile in Supabase
   * @param {string} id 
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  async updateCustomer(id, data) {
    try {
      const dbPayload = mapCustomerToDB(data);

      const { data: updatedRow, error } = await supabase
        .from('customers')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[customerService.updateCustomer] Lỗi cập nhật khách hàng ${id}:`, error);
        toast.show('Không thể cập nhật thông tin khách hàng: ' + error.message, 'error');
        throw new Error(error.message);
      }

      const updated = mapCustomerFromDB(updatedRow);
      const customers = store.get('customers') || [];
      const index = customers.findIndex(c => c.id === id);
      if (index !== -1) {
        customers[index] = updated;
        store.set('customers', [...customers]);
      }
      return updated;
    } catch (err) {
      console.error(`[customerService.updateCustomer] Ngoại lệ:`, err);
      throw err;
    }
  },

  /**
   * Delete customer profile in Supabase
   * Blocked if customer has existing booking history
   * @param {string} id 
   * @returns {Promise<boolean>}
   */
  async deleteCustomer(id) {
    try {
      const customer = await this.getCustomerById(id);
      if (!customer) {
        throw new Error("Không tìm thấy khách hàng cần xóa!");
      }

      // Check bookings in DB
      const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('id')
        .eq('customer_id', id);

      if (bError) {
        console.error('[customerService.deleteCustomer] Lỗi kiểm tra bookings:', bError);
        throw new Error('Không thể kiểm tra lịch sử đặt phòng của khách hàng: ' + bError.message);
      }

      if (bookings && bookings.length > 0) {
        throw new Error(`Không thể xóa khách hàng "${customer.fullName}" vì đang có ${bookings.length} đơn đặt phòng trong hệ thống!`);
      }

      const { error: delError } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (delError) {
        console.error(`[customerService.deleteCustomer] Lỗi xóa:`, delError);
        toast.show('Không thể xóa khách hàng: ' + delError.message, 'error');
        throw new Error(delError.message);
      }

      const customers = store.get('customers') || [];
      store.set('customers', customers.filter(c => c.id !== id));
      return true;
    } catch (err) {
      console.error(`[customerService.deleteCustomer] Ngoại lệ:`, err);
      throw err;
    }
  },

  /**
   * Get all booking records for a given customer
   * @param {string} customerId 
   * @returns {Promise<Array>}
   */
  async getCustomerBookings(customerId) {
    if (!customerId) return [];
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', customerId)
        .order('check_in_date', { ascending: false });

      if (error) {
        console.error('[customerService.getCustomerBookings] Lỗi:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        customerId: row.customer_id,
        roomNumber: row.room_number,
        roomType: row.room_type,
        checkInDate: row.check_in_date,
        checkOutDate: row.check_out_date,
        nights: Number(row.nights),
        totalAmount: Number(row.total_amount),
        status: row.status,
        paymentStatus: row.payment_status
      }));
    } catch (e) {
      console.error('[customerService.getCustomerBookings] Ngoại lệ:', e);
      return [];
    }
  }
};
