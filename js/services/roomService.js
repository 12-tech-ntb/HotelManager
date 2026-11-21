/**
 * HOTEL MANAGEMENT SYSTEM - ROOM SERVICE
 * Data access and operations for hotel rooms
 * Chuẩn bị sẵn để cắm Supabase Client (`supabase.from('rooms').select(...)`)
 */

import { store } from '../core/state.js';

export const roomService = {
  /**
   * Retrieve all rooms
   * @returns {Array}
   */
  async getAllRooms() {
    return store.get('rooms');
  },

  /**
   * Calculate summary statistics of hotel rooms
   * @returns {Object} { total, available, occupied, maintenance, cleaning, occupancyRate }
   */
  async getRoomStats() {
    const rooms = store.get('rooms') || [];
    const total = rooms.length;
    const available = rooms.filter(r => r.status === 'available').length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const maintenance = rooms.filter(r => r.status === 'maintenance').length;
    const cleaning = rooms.filter(r => r.status === 'cleaning').length;

    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return {
      total,
      available,
      occupied,
      maintenance,
      cleaning,
      occupancyRate
    };
  },

  /**
   * Filter rooms by status
   * @param {string} status 
   */
  async getRoomsByStatus(status) {
    const rooms = store.get('rooms') || [];
    if (!status || status === 'all') return rooms;
    return rooms.filter(r => r.status === status);
  }
};
