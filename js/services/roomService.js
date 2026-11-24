/**
 * HOTEL MANAGEMENT SYSTEM - ROOM SERVICE
 * Data access and operations for hotel rooms connected directly to Supabase
 */

import { store } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { toast } from '../core/toast.js';

/**
 * Map DB row (snake_case) to UI Model (camelCase)
 * @param {Object} row 
 * @returns {Object|null}
 */
export function mapRoomFromDB(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomNumber: String(row.room_number),
    type: row.type,
    floor: Number(row.floor),
    price: Number(row.price),
    capacity: Number(row.capacity || 2),
    status: row.status,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    image: row.image || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Map UI Model (camelCase) to DB row (snake_case)
 * @param {Object} data 
 * @returns {Object}
 */
export function mapRoomToDB(data) {
  const row = {};
  if (data.roomNumber !== undefined) row.room_number = String(data.roomNumber).trim();
  if (data.type !== undefined) row.type = String(data.type).trim();
  if (data.floor !== undefined) row.floor = Number(data.floor);
  if (data.price !== undefined) row.price = Number(data.price);
  if (data.capacity !== undefined) row.capacity = Number(data.capacity);
  if (data.status !== undefined) row.status = data.status;
  if (data.amenities !== undefined) row.amenities = Array.isArray(data.amenities) ? data.amenities : [];
  if (data.image !== undefined) row.image = data.image ? String(data.image).trim() : '';
  return row;
}

export const roomService = {
  /**
   * Retrieve all rooms from Supabase
   * @returns {Promise<Array>}
   */
  async getAllRooms() {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .order('room_number', { ascending: true });

      if (error) {
        console.error('[roomService.getAllRooms] Lỗi truy vấn Supabase:', error);
        toast.show('Không thể tải danh sách phòng: ' + error.message, 'error');
        return store.get('rooms') || [];
      }

      const rooms = (data || []).map(mapRoomFromDB);
      store.set('rooms', rooms);
      return rooms;
    } catch (err) {
      console.error('[roomService.getAllRooms] Ngoại lệ kết nối:', err);
      toast.show('Lỗi kết nối khi tải danh sách phòng: ' + err.message, 'error');
      return store.get('rooms') || [];
    }
  },

  /**
   * Get room by ID
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async getRoomById(id) {
    if (!id) return null;
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`[roomService.getRoomById] Lỗi lấy phòng ${id}:`, error);
        return null;
      }

      return mapRoomFromDB(data);
    } catch (err) {
      console.error(`[roomService.getRoomById] Ngoại lệ lấy phòng ${id}:`, err);
      return null;
    }
  },

  /**
   * Filter rooms by search keyword, room type, status, and floor
   * @param {Object} filters { search, type, status, floor }
   * @returns {Promise<Array>}
   */
  async filterRooms({ search = '', type = 'all', status = 'all', floor = 'all' } = {}) {
    let rooms = await this.getAllRooms();

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

    // Filter by floor
    if (floor && floor !== 'all') {
      rooms = rooms.filter(r => Number(r.floor) === Number(floor));
    }

    return rooms;
  },

  /**
   * Calculate summary statistics of hotel rooms
   * @returns {Promise<Object>} { total, available, occupied, maintenance, cleaning, occupancyRate }
   */
  async getRoomStats() {
    const rooms = await this.getAllRooms();
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
   * Create a new room in Supabase
   * @param {Object} roomData 
   * @returns {Promise<Object>} Created room
   */
  async createRoom(roomData) {
    try {
      const dbPayload = mapRoomToDB(roomData);
      
      const { data, error } = await supabase
        .from('rooms')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error('[roomService.createRoom] Lỗi Supabase:', error);
        toast.show('Không thể tạo phòng: ' + error.message, 'error');
        throw new Error(error.message);
      }

      const created = mapRoomFromDB(data);
      const rooms = store.get('rooms') || [];
      store.set('rooms', [created, ...rooms]);
      return created;
    } catch (err) {
      console.error('[roomService.createRoom] Ngoại lệ tạo phòng:', err);
      throw err;
    }
  },

  /**
   * Update existing room information in Supabase
   * @param {string} roomId 
   * @param {Object} updateData 
   * @returns {Promise<Object>} Updated room
   */
  async updateRoom(roomId, updateData) {
    try {
      const dbPayload = mapRoomToDB(updateData);

      const { data, error } = await supabase
        .from('rooms')
        .update(dbPayload)
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        console.error(`[roomService.updateRoom] Lỗi cập nhật phòng ${roomId}:`, error);
        toast.show('Không thể cập nhật phòng: ' + error.message, 'error');
        throw new Error(error.message);
      }

      const updated = mapRoomFromDB(data);
      const rooms = store.get('rooms') || [];
      const index = rooms.findIndex(r => r.id === roomId);
      if (index !== -1) {
        rooms[index] = updated;
        store.set('rooms', [...rooms]);
      }
      return updated;
    } catch (err) {
      console.error(`[roomService.updateRoom] Ngoại lệ cập nhật phòng ${roomId}:`, err);
      throw err;
    }
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
   * Delete room by ID in Supabase
   * @param {string} roomId 
   * @returns {Promise<boolean>}
   */
  async deleteRoom(roomId) {
    try {
      const room = await this.getRoomById(roomId);
      if (!room) {
        throw new Error("Không tìm thấy phòng để xóa!");
      }

      if (room.status === 'occupied') {
        throw new Error(`Không thể xóa phòng ${room.roomNumber} vì đang có khách lưu trú!`);
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) {
        console.error(`[roomService.deleteRoom] Lỗi xóa phòng ${roomId}:`, error);
        toast.show('Không thể xóa phòng: ' + error.message, 'error');
        throw new Error(error.message);
      }

      const rooms = store.get('rooms') || [];
      store.set('rooms', rooms.filter(r => r.id !== roomId));
      return true;
    } catch (err) {
      console.error(`[roomService.deleteRoom] Ngoại lệ xóa phòng ${roomId}:`, err);
      throw err;
    }
  },

  /**
   * Get all unique floor numbers existing in the rooms dataset
   * @returns {Promise<Array<number>>} Sorted array of floor numbers
   */
  async getAllFloors() {
    const rooms = await this.getAllRooms();
    const floors = [...new Set(rooms.map(r => Number(r.floor)))].filter(f => !isNaN(f) && f > 0);
    return floors.sort((a, b) => a - b);
  },

  /**
   * Bulk generate rooms for a range of floors into Supabase
   * @param {Object} config
   * @returns {Promise<Object>} { createdCount, skippedCount, createdRooms, skippedRoomNumbers }
   */
  async bulkCreateRooms(config = {}) {
    const existingRooms = await this.getAllRooms();
    const {
      startFloor = 1,
      endFloor = 1,
      roomsPerFloor = 4,
      type = "Standard Room",
      price = 850000,
      capacity = 2,
      amenities = ["Wifi", "TV", "Điều hòa"],
      prefix = ""
    } = config;

    const fromFloor = Math.min(Number(startFloor), Number(endFloor));
    const toFloor = Math.max(Number(startFloor), Number(endFloor));
    const countPerFloor = Math.max(1, Math.min(Number(roomsPerFloor), 30));

    const existingRoomNumbers = new Set(existingRooms.map(r => String(r.roomNumber).trim()));
    const rowsToInsert = [];
    const skippedRoomNumbers = [];

    for (let f = fromFloor; f <= toFloor; f++) {
      for (let i = 1; i <= countPerFloor; i++) {
        const cleanPrefix = prefix ? prefix.trim() : '';
        const roomNumberStr = `${cleanPrefix}${f}${String(i).padStart(2, '0')}`;

        if (existingRoomNumbers.has(roomNumberStr)) {
          skippedRoomNumbers.push(roomNumberStr);
          continue;
        }

        rowsToInsert.push({
          room_number: roomNumberStr,
          type: type || "Standard Room",
          floor: f,
          price: Number(price) || 850000,
          capacity: Number(capacity) || 2,
          status: "available",
          amenities: Array.isArray(amenities) && amenities.length > 0 ? amenities : ["Wifi", "TV", "Điều hòa"],
          image: ""
        });

        existingRoomNumbers.add(roomNumberStr);
      }
    }

    if (rowsToInsert.length === 0) {
      return {
        createdCount: 0,
        skippedCount: skippedRoomNumbers.length,
        createdRooms: [],
        skippedRoomNumbers
      };
    }

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert(rowsToInsert)
        .select();

      if (error) {
        console.error('[roomService.bulkCreateRooms] Lỗi tạo hàng loạt:', error);
        toast.show('Lỗi tạo phòng hàng loạt: ' + error.message, 'error');
        throw new Error(error.message);
      }

      const createdRooms = (data || []).map(mapRoomFromDB);
      const updatedRooms = [...createdRooms, ...existingRooms];
      store.set('rooms', updatedRooms);

      return {
        createdCount: createdRooms.length,
        skippedCount: skippedRoomNumbers.length,
        createdRooms,
        skippedRoomNumbers
      };
    } catch (err) {
      console.error('[roomService.bulkCreateRooms] Ngoại lệ:', err);
      throw err;
    }
  },

  /**
   * Clean up / delete all rooms on a specific floor safely in Supabase
   * Fails if any room is occupied or has active bookings
   * @param {number|string} floorNumber 
   * @returns {Promise<Object>} { deletedCount, floor }
   */
  async deleteFloorRooms(floorNumber) {
    const targetFloor = Number(floorNumber);
    const rooms = await this.getAllRooms();
    const floorRooms = rooms.filter(r => Number(r.floor) === targetFloor);

    if (floorRooms.length === 0) {
      throw new Error(`Không có phòng nào tại Tầng ${targetFloor} để xóa!`);
    }

    const occupiedRoom = floorRooms.find(r => r.status === 'occupied');
    if (occupiedRoom) {
      throw new Error(`Không thể xóa phòng tại Tầng ${targetFloor} vì phòng ${occupiedRoom.roomNumber} đang có khách lưu trú!`);
    }

    // Check active bookings in DB
    const floorRoomIds = floorRooms.map(r => r.id);
    const { data: activeBookings, error: bError } = await supabase
      .from('bookings')
      .select('id, room_number, status')
      .in('room_id', floorRoomIds)
      .in('status', ['confirmed', 'checked_in']);

    if (bError) {
      console.error('[roomService.deleteFloorRooms] Lỗi kiểm tra bookings:', bError);
      throw new Error('Không thể kiểm tra lịch đặt phòng của tầng này: ' + bError.message);
    }

    if (activeBookings && activeBookings.length > 0) {
      const firstB = activeBookings[0];
      throw new Error(`Không thể xóa phòng tại Tầng ${targetFloor} vì phòng ${firstB.room_number} đang có đơn đặt phòng hoạt động (${firstB.id})!`);
    }

    try {
      const { error: delError } = await supabase
        .from('rooms')
        .delete()
        .eq('floor', targetFloor);

      if (delError) {
        console.error(`[roomService.deleteFloorRooms] Lỗi xóa phòng tầng ${targetFloor}:`, delError);
        toast.show('Không thể xóa phòng tầng ' + targetFloor + ': ' + delError.message, 'error');
        throw new Error(delError.message);
      }

      const updatedRooms = rooms.filter(r => Number(r.floor) !== targetFloor);
      store.set('rooms', updatedRooms);

      return {
        deletedCount: floorRooms.length,
        floor: targetFloor
      };
    } catch (err) {
      console.error(`[roomService.deleteFloorRooms] Ngoại lệ:`, err);
      throw err;
    }
  }
};
