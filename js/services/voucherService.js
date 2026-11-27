/**
 * HOTEL MANAGEMENT SYSTEM - VOUCHER SERVICE
 * CRUD operations & usage tracking for promotional vouchers on Supabase
 */

import { store } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { toast } from '../core/toast.js';

/**
 * Map DB row (snake_case) to UI Model (camelCase)
 * @param {Object} row
 * @returns {Object|null}
 */
export function mapVoucherFromDB(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    description: row.description || '',
    type: row.type, // 'percentage' | 'fixed'
    value: Number(row.value || 0),
    minOrder: Number(row.min_order || 0),
    active: Boolean(row.active),
    usedCount: Number(row.used_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Map UI Model (camelCase) to DB row (snake_case)
 * @param {Object} v
 * @returns {Object}
 */
export function mapVoucherToDB(v) {
  const row = {};
  if (v.code !== undefined) row.code = String(v.code).trim().toUpperCase().replace(/\s+/g, '');
  if (v.description !== undefined) row.description = String(v.description || '').trim();
  if (v.type !== undefined) row.type = v.type;
  if (v.value !== undefined) row.value = Number(v.value);
  if (v.minOrder !== undefined) row.min_order = Number(v.minOrder || 0);
  if (v.active !== undefined) row.active = Boolean(v.active);
  if (v.usedCount !== undefined) row.used_count = Number(v.usedCount || 0);
  return row;
}

export const voucherService = {
  /**
   * Retrieve all vouchers from Supabase
   * @returns {Promise<Array>}
   */
  async getAllVouchers() {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[voucherService.getAllVouchers] Lỗi Supabase:', error);
        toast.show('Không thể tải danh sách voucher: ' + error.message, 'error');
        return store.get('vouchers') || [];
      }

      const vouchers = (data || []).map(mapVoucherFromDB);
      store.set('vouchers', vouchers);
      return vouchers;
    } catch (err) {
      console.error('[voucherService.getAllVouchers] Ngoại lệ kết nối:', err);
      toast.show('Lỗi kết nối khi tải danh sách voucher: ' + err.message, 'error');
      return store.get('vouchers') || [];
    }
  },

  /**
   * Get single voucher by ID
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getVoucherById(id) {
    if (!id) return null;
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`[voucherService.getVoucherById] Lỗi tìm voucher ${id}:`, error);
        return null;
      }
      return mapVoucherFromDB(data);
    } catch (err) {
      console.error(`[voucherService.getVoucherById] Ngoại lệ:`, err);
      return null;
    }
  },

  /**
   * Get summary statistics for vouchers
   * @returns {Promise<Object>}
   */
  async getVoucherStats() {
    const vouchers = await this.getAllVouchers();
    const total = vouchers.length;
    const active = vouchers.filter(v => v.active).length;
    const inactive = total - active;
    const totalUsed = vouchers.reduce((sum, v) => sum + (Number(v.usedCount) || 0), 0);

    return { total, active, inactive, totalUsed };
  },

  /**
   * Filter vouchers locally after fetching fresh list
   * @param {Object} filters { search, type, status }
   * @returns {Promise<Array>}
   */
  async filterVouchers({ search = '', type = 'all', status = 'all' } = {}) {
    let vouchers = await this.getAllVouchers();

    if (search && search.trim() !== '') {
      const kw = search.trim().toLowerCase();
      vouchers = vouchers.filter(v =>
        v.code.toLowerCase().includes(kw) ||
        v.description.toLowerCase().includes(kw)
      );
    }

    if (type && type !== 'all') {
      vouchers = vouchers.filter(v => v.type === type);
    }

    if (status === 'active') {
      vouchers = vouchers.filter(v => v.active === true);
    } else if (status === 'inactive') {
      vouchers = vouchers.filter(v => v.active === false);
    }

    return vouchers;
  },

  /**
   * Validate voucher business rules
   */
  _validatePayload(data) {
    const cleanCode = String(data.code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCode || cleanCode.length < 3) {
      throw new Error('Mã voucher phải có ít nhất 3 ký tự (không chứa khoảng trắng).');
    }
    const type = data.type;
    if (type !== 'percentage' && type !== 'fixed') {
      throw new Error('Loại giảm giá không hợp lệ.');
    }
    const value = Number(data.value);
    if (!value || value <= 0) {
      throw new Error('Giá trị giảm giá phải lớn hơn 0.');
    }
    if (type === 'percentage' && value > 100) {
      throw new Error('Voucher giảm theo phần trăm (%) không được vượt quá 100%.');
    }
    const minOrder = Number(data.minOrder || 0);
    if (minOrder < 0) {
      throw new Error('Giá trị đơn tối thiểu không được âm.');
    }
  },

  /**
   * Create a new voucher in Supabase
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createVoucher(data) {
    this._validatePayload(data);
    const dbPayload = mapVoucherToDB({
      code: data.code,
      description: data.description || '',
      type: data.type,
      value: data.value,
      minOrder: data.minOrder || 0,
      active: data.active !== undefined ? Boolean(data.active) : true
    });

    try {
      const { data: created, error } = await supabase
        .from('vouchers')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error('[voucherService.createVoucher] Lỗi Supabase:', error);
        if (error.code === '23505') {
          throw new Error(`Mã voucher "${dbPayload.code}" đã tồn tại trên hệ thống!`);
        }
        throw new Error(error.message);
      }

      const mapped = mapVoucherFromDB(created);
      const list = store.get('vouchers') || [];
      store.set('vouchers', [mapped, ...list]);
      return mapped;
    } catch (err) {
      console.error('[voucherService.createVoucher] Ngoại lệ:', err);
      throw err;
    }
  },

  /**
   * Update existing voucher in Supabase
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateVoucher(id, data) {
    this._validatePayload(data);
    const dbPayload = mapVoucherToDB({
      code: data.code,
      description: data.description,
      type: data.type,
      value: data.value,
      minOrder: data.minOrder,
      active: data.active
    });

    try {
      const { data: updated, error } = await supabase
        .from('vouchers')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[voucherService.updateVoucher] Lỗi cập nhật ${id}:`, error);
        if (error.code === '23505') {
          throw new Error(`Mã voucher "${dbPayload.code}" đã được sử dụng bởi voucher khác!`);
        }
        throw new Error(error.message);
      }

      const mapped = mapVoucherFromDB(updated);
      const list = store.get('vouchers') || [];
      const idx = list.findIndex(v => v.id === id);
      if (idx !== -1) {
        list[idx] = mapped;
        store.set('vouchers', [...list]);
      }
      return mapped;
    } catch (err) {
      console.error(`[voucherService.updateVoucher] Ngoại lệ:`, err);
      throw err;
    }
  },

  /**
   * Toggle active state of a voucher
   * @param {string} id
   * @param {boolean} active
   * @returns {Promise<Object>}
   */
  async toggleVoucherStatus(id, active) {
    try {
      const { data: updated, error } = await supabase
        .from('vouchers')
        .update({ active: Boolean(active) })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[voucherService.toggleVoucherStatus] Lỗi:`, error);
        throw new Error(error.message);
      }

      const mapped = mapVoucherFromDB(updated);
      const list = store.get('vouchers') || [];
      const idx = list.findIndex(v => v.id === id);
      if (idx !== -1) {
        list[idx] = mapped;
        store.set('vouchers', [...list]);
      }
      return mapped;
    } catch (err) {
      console.error(`[voucherService.toggleVoucherStatus] Ngoại lệ:`, err);
      throw err;
    }
  },

  /**
   * Delete voucher by ID
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteVoucher(id) {
    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[voucherService.deleteVoucher] Lỗi xóa ${id}:`, error);
        throw new Error(error.message);
      }

      const list = store.get('vouchers') || [];
      store.set('vouchers', list.filter(v => v.id !== id));
      return true;
    } catch (err) {
      console.error(`[voucherService.deleteVoucher] Ngoại lệ:`, err);
      throw err;
    }
  },

  /**
   * Increment used_count of a voucher after booking creation
   * Gracefully ignores if used_count column has not been migrated yet on DB.
   * @param {string} code
   */
  async incrementVoucherUsage(code) {
    if (!code || !String(code).trim()) return;
    const cleanCode = String(code).trim().toUpperCase();

    try {
      const { data: voucher, error: fetchError } = await supabase
        .from('vouchers')
        .select('id, used_count')
        .eq('code', cleanCode)
        .maybeSingle();

      if (fetchError) {
        // 42703 / PGRST204: column used_count not yet added in DB
        console.warn('[voucherService.incrementVoucherUsage] Không thể đọc used_count:', fetchError.message);
        return;
      }

      if (!voucher) return;

      const nextCount = (Number(voucher.used_count) || 0) + 1;
      const { error: updateError } = await supabase
        .from('vouchers')
        .update({ used_count: nextCount })
        .eq('id', voucher.id);

      if (updateError) {
        console.warn('[voucherService.incrementVoucherUsage] Không thể tăng used_count:', updateError.message);
      }
    } catch (err) {
      console.warn('[voucherService.incrementVoucherUsage] Ngoại lệ:', err);
    }
  }
};
