/**
 * HOTEL MANAGEMENT SYSTEM - FRONT DESK CHECK-IN / CHECK-OUT SERVICE
 * Handles guest arrival check-in, departure check-out & billing settlement,
 * and synchronizes state between Bookings and Rooms directly in Supabase.
 */

import { store } from '../core/state.js';
import { supabase } from '../core/supabaseClient.js';
import { toast } from '../core/toast.js';
import { roomService } from './roomService.js';
import { bookingService, mapBookingFromDB } from './bookingService.js';

export const checkinService = {
  /**
   * Reference operational date for the hotel
   */
  getOperationalDate() {
    return "2026-11-21";
  },

  /**
   * Front Desk KPI metrics
   * @returns {Promise<Object>}
   */
  async getFrontDeskStats() {
    const [bookings, rooms] = await Promise.all([
      bookingService.getAllBookings(),
      roomService.getAllRooms()
    ]);

    // Arrivals pending: confirmed or pending bookings
    const arrivalsPending = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;

    // Departures: in-house guests currently checked in
    const inHouseGuests = bookings.filter(b => b.status === 'checked_in').length;

    // Due for checkout: in-house guests
    const departuresPending = inHouseGuests;

    // Rooms cleaning: rooms currently marked cleaning
    const roomsCleaning = rooms.filter(r => r.status === 'cleaning').length;

    return {
      arrivalsPending,
      departuresPending,
      inHouseGuests,
      roomsCleaning
    };
  },

  /**
   * Get arrivals (Check-in list)
   * @param {Object} options { search }
   * @returns {Promise<Array>}
   */
  async getArrivals({ search = '' } = {}) {
    const bookings = await bookingService.getAllBookings();
    let list = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');

    if (search && search.trim() !== '') {
      const kw = search.trim().toLowerCase();
      list = list.filter(b => 
        b.id.toLowerCase().includes(kw) ||
        b.customerName.toLowerCase().includes(kw) ||
        b.customerPhone.toLowerCase().includes(kw) ||
        b.roomNumber.toLowerCase().includes(kw) ||
        `phòng ${b.roomNumber}`.toLowerCase().includes(kw)
      );
    }

    // Sort by check-in date
    return list.sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
  },

  /**
   * Get departures (Check-out list: In-house guests)
   * @param {Object} options { search }
   * @returns {Promise<Array>}
   */
  async getDepartures({ search = '' } = {}) {
    const bookings = await bookingService.getAllBookings();
    let list = bookings.filter(b => b.status === 'checked_in');

    if (search && search.trim() !== '') {
      const kw = search.trim().toLowerCase();
      list = list.filter(b => 
        b.id.toLowerCase().includes(kw) ||
        b.customerName.toLowerCase().includes(kw) ||
        b.customerPhone.toLowerCase().includes(kw) ||
        b.roomNumber.toLowerCase().includes(kw) ||
        `phòng ${b.roomNumber}`.toLowerCase().includes(kw)
      );
    }

    // Sort by check-out date ascending (due soonest first)
    return list.sort((a, b) => a.checkOutDate.localeCompare(b.checkOutDate));
  },

  /**
   * Get all active front desk operations (Arrivals + Departures)
   * @param {Object} options { search }
   * @returns {Promise<Array>}
   */
  async getAllActivities({ search = '' } = {}) {
    const [arrivals, departures] = await Promise.all([
      this.getArrivals({ search }),
      this.getDepartures({ search })
    ]);

    const mappedArrivals = arrivals.map(item => ({ ...item, activityType: 'checkin' }));
    const mappedDepartures = departures.map(item => ({ ...item, activityType: 'checkout' }));

    return [...mappedArrivals, ...mappedDepartures];
  },

  /**
   * Execute Guest Check-in
   * - Booking status becomes 'checked_in'
   * - Room status becomes 'occupied'
   * @param {string} bookingId 
   * @param {Object} details { idCard, notes }
   * @returns {Promise<Object>}
   */
  async processCheckIn(bookingId, details = {}) {
    const targetBooking = await bookingService.getBookingById(bookingId);
    if (!targetBooking) throw new Error('Không tìm thấy đơn đặt phòng!');

    const room = await roomService.getRoomById(targetBooking.roomId);
    if (!room) throw new Error('Không tìm thấy phòng liên kết với đơn này!');

    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'checked_in',
          customer_id_card: details.idCard || targetBooking.customerIdCard,
          check_in_notes: details.notes || '',
          actual_check_in_time: nowIso
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('[checkinService.processCheckIn] Lỗi:', error);
        toast.show('Không thể hoàn tất Check-in: ' + error.message, 'error');
        throw new Error(error.message);
      }

      const updatedBooking = mapBookingFromDB(data);

      // Đồng bộ trạng thái Phòng -> 'occupied'
      await roomService.updateRoomStatus(room.id, 'occupied');

      // Đồng bộ store
      const bookings = store.get('bookings') || [];
      const idx = bookings.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        bookings[idx] = updatedBooking;
        store.set('bookings', [...bookings]);
      }

      return updatedBooking;
    } catch (err) {
      console.error('[checkinService.processCheckIn] Ngoại lệ:', err);
      throw err;
    }
  },

  /**
   * Execute Guest Check-out & Surcharge Settlement
   * - Booking status becomes 'checked_out'
   * - Payment status becomes 'paid'
   * - Room status becomes 'cleaning'
   * @param {string} bookingId 
   * @param {Object} details { paymentMethod, surcharge, notes }
   * @returns {Promise<Object>}
   */
  async processCheckOut(bookingId, details = {}) {
    const targetBooking = await bookingService.getBookingById(bookingId);
    if (!targetBooking) throw new Error('Không tìm thấy đơn đặt phòng!');

    const surcharge = Number(details.surcharge) || 0;
    const finalTotal = targetBooking.totalAmount + surcharge;
    const nowIso = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: 'checked_out',
          payment_status: 'paid',
          surcharge: surcharge,
          final_total: finalTotal,
          payment_method: details.paymentMethod || 'Tiền mặt',
          check_out_notes: details.notes || '',
          actual_check_out_time: nowIso
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('[checkinService.processCheckOut] Lỗi:', error);
        toast.show('Không thể hoàn tất Check-out: ' + error.message, 'error');
        throw new Error(error.message);
      }

      const updatedBooking = mapBookingFromDB(data);

      // Đồng bộ trạng thái phòng -> 'cleaning'
      await roomService.updateRoomStatus(targetBooking.roomId, 'cleaning');

      // Đồng bộ store
      const bookings = store.get('bookings') || [];
      const idx = bookings.findIndex(b => b.id === bookingId);
      if (idx !== -1) {
        bookings[idx] = updatedBooking;
        store.set('bookings', [...bookings]);
      }

      return updatedBooking;
    } catch (err) {
      console.error('[checkinService.processCheckOut] Ngoại lệ:', err);
      throw err;
    }
  },

  /**
   * Get list of rooms currently in cleaning state
   * @returns {Promise<Array>}
   */
  async getCleaningRooms() {
    const rooms = await roomService.getAllRooms();
    return rooms.filter(r => r.status === 'cleaning');
  },

  /**
   * Mark room finished cleaning -> ready for guests ('available')
   * @param {string} roomId 
   * @returns {Promise<Object>}
   */
  async markRoomCleaned(roomId) {
    return roomService.updateRoomStatus(roomId, 'available');
  }
};
