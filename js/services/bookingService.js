/**
 * HOTEL MANAGEMENT SYSTEM - BOOKING SERVICE
 * Data access and operations for guest bookings
 * Chuẩn bị sẵn để tích hợp Supabase Client (`supabase.from('bookings').select(...)`)
 */

import { store } from '../core/state.js';

export const bookingService = {
  /**
   * Get recent bookings with optional limit
   * @param {number} limit 
   * @returns {Array}
   */
  async getRecentBookings(limit = 7) {
    const bookings = store.get('bookings') || [];
    // Sort by latest created/checkIn
    const sorted = [...bookings].sort((a, b) => b.id.localeCompare(a.id));
    return sorted.slice(0, limit);
  },

  /**
   * Count how many bookings check-in or created today
   * Giả lập ngày làm việc hiện tại của khách sạn: 2026-11-21
   */
  async getTodayBookingsCount() {
    const today = "2026-11-21";
    const bookings = store.get('bookings') || [];
    return bookings.filter(b => b.checkInDate === today).length;
  },

  /**
   * Get all bookings
   */
  async getAllBookings() {
    return store.get('bookings') || [];
  }
};
