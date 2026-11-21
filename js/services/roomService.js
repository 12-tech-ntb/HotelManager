/**
 * HOTEL MANAGEMENT SYSTEM - ROOM SERVICE
 * Data access and operations for hotel rooms
 * Sẵn sàng tích hợp Supabase Client (`supabase.from('rooms').*`)
 */

import { store } from '../core/state.js';

export const roomService = {
  /**
   * Retrieve all rooms
   * @returns {Promise<Array>}
   */
  async getAllRooms() {
    return store.get('rooms') || [];
  },

  /**
   * Get room by ID
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async getRoomById(id) {
    const rooms = store.get('rooms') || [];
    return rooms.find(r => r.id === id) || null;
  },

  /**
   * Filter rooms by search keyword, room type, and status
   * @param {Object} filters { search, type, status }
   * @returns {Promise<Array>}
   */
  async filterRooms({ search = '', type = 'all', status = 'all' } = {}) {
    let rooms = store.get('rooms') || [];

    // Filter by keyword (room number or room type name)
    if (search && search.trim() !== '') {
      const keyword = search.trim().toLowerCase();
      rooms = rooms.filter(r => 
        r.roomNumber.toLowerCase().includes(keyword) || 
        r.type.toLowerCase().includes(keyword) ||
        `phòng ${r.roomNumber}`.toLowerCase().includes(keyword)
      );
    }

    // Filter by room type
    if (type && type !== 'all') {
      rooms = rooms.filter(r => r.type === type);
    }

    // Filter by status
    if (status && status !== 'all') {
      rooms = rooms.filter(r => r.status === status);
    }

    return rooms;
  },

  /**
   * Calculate summary statistics of hotel rooms
   * @returns {Promise<Object>} { total, available, occupied, maintenance, cleaning, occupancyRate }
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
   * Create a new room
   * @param {Object} roomData 
   * @returns {Promise<Object>} Created room
   */
  async createRoom(roomData) {
    const rooms = store.get('rooms') || [];

    // Check duplicate room number
    const exists = rooms.some(r => r.roomNumber.trim() === String(roomData.roomNumber).trim());
    if (exists) {
      throw new Error(`Số phòng ${roomData.roomNumber} đã tồn tại trong hệ thống!`);
    }

    const newRoom = {
      id: roomData.id || `r_${Date.now()}`,
      roomNumber: String(roomData.roomNumber).trim(),
      type: roomData.type || "Standard Room",
      floor: Number(roomData.floor) || 1,
      price: Number(roomData.price) || 850000,
      capacity: Number(roomData.capacity) || 2,
      status: roomData.status || "available",
      amenities: Array.isArray(roomData.amenities) ? roomData.amenities : ["Wifi", "TV", "Điều hòa"],
      image: roomData.image || ""
    };

    const updatedRooms = [newRoom, ...rooms];
    store.set('rooms', updatedRooms);
    return newRoom;
  },

  /**
   * Update existing room information
   * @param {string} roomId 
   * @param {Object} updateData 
   * @returns {Promise<Object>} Updated room
   */
  async updateRoom(roomId, updateData) {
    const rooms = store.get('rooms') || [];
    const index = rooms.findIndex(r => r.id === roomId);
    if (index === -1) {
      throw new Error("Không tìm thấy thông tin phòng cần cập nhật!");
    }

    // Check duplicate room number if changed
    if (updateData.roomNumber) {
      const exists = rooms.some(r => r.id !== roomId && r.roomNumber.trim() === String(updateData.roomNumber).trim());
      if (exists) {
        throw new Error(`Số phòng ${updateData.roomNumber} đã tồn tại ở phòng khác!`);
      }
    }

    const updatedRoom = {
      ...rooms[index],
      ...updateData,
      roomNumber: updateData.roomNumber ? String(updateData.roomNumber).trim() : rooms[index].roomNumber,
      floor: updateData.floor !== undefined ? Number(updateData.floor) : rooms[index].floor,
      price: updateData.price !== undefined ? Number(updateData.price) : rooms[index].price,
      capacity: updateData.capacity !== undefined ? Number(updateData.capacity) : rooms[index].capacity
    };

    const updatedRooms = [...rooms];
    updatedRooms[index] = updatedRoom;
    store.set('rooms', updatedRooms);
    return updatedRoom;
  },

  /**
   * Quick update room status
   * @param {string} roomId 
   * @param {string} newStatus 'available' | 'cleaning' | 'maintenance' | 'occupied'
   * @returns {Promise<Object>}
   */
  async updateRoomStatus(roomId, newStatus) {
    return this.updateRoom(roomId, { status: newStatus });
  },

  /**
   * Delete room by ID
   * @param {string} roomId 
   * @returns {Promise<boolean>}
   */
  async deleteRoom(roomId) {
    const rooms = store.get('rooms') || [];
    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      throw new Error("Không tìm thấy phòng để xóa!");
    }

    // Cannot delete occupied room
    if (room.status === 'occupied') {
      throw new Error(`Không thể xóa phòng ${room.roomNumber} vì đang có khách lưu trú!`);
    }

    const updatedRooms = rooms.filter(r => r.id !== roomId);
    store.set('rooms', updatedRooms);
    return true;
  }
};
