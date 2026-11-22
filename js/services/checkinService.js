/**
 * HOTEL MANAGEMENT SYSTEM - FRONT DESK CHECK-IN / CHECK-OUT SERVICE
 * Handles guest arrival check-in, departure check-out & billing settlement,
 * and synchronizes state between Bookings and Rooms.
 */

import { store } from '../core/state.js';
import { roomService } from './roomService.js';
import { bookingService } from './bookingService.js';

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
    const bookings = store.get('bookings') || [];
    const rooms = store.get('rooms') || [];
    const today = this.getOperationalDate();

    // Arrivals pending: confirmed or pending bookings
    const arrivalsPending = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length;

    // Departures: in-house guests currently checked in
    const inHouseGuests = bookings.filter(b => b.status === 'checked_in').length;

    // Due for checkout: in-house guests with checkout <= today + 2
    const departuresPending = bookings.filter(b => b.status === 'checked_in').length;

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
    const bookings = store.get('bookings') || [];
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
    const bookings = store.get('bookings') || [];
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
    const bookings = store.get('bookings') || [];
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index === -1) throw new Error('Không tìm thấy đơn đặt phòng!');

    const targetBooking = bookings[index];

    // Verify room
    const room = await roomService.getRoomById(targetBooking.roomId);
    if (!room) throw new Error('Không tìm thấy phòng liên kết với đơn này!');

    // Update booking
    const updatedBooking = {
      ...targetBooking,
      status: 'checked_in',
      customerIdCard: details.idCard || targetBooking.customerIdCard,
      checkInNotes: details.notes || '',
      actualCheckInTime: `${this.getOperationalDate()} 14:15`
    };

    const updatedBookings = [...bookings];
    updatedBookings[index] = updatedBooking;
    store.set('bookings', updatedBookings);

    // Synchronize Room Status -> 'occupied'
    await roomService.updateRoomStatus(room.id, 'occupied');

    return updatedBooking;
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
    const bookings = store.get('bookings') || [];
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index === -1) throw new Error('Không tìm thấy đơn đặt phòng!');

    const targetBooking = bookings[index];
    const surcharge = Number(details.surcharge) || 0;
    const finalTotal = targetBooking.totalAmount + surcharge;

    // Update booking
    const updatedBooking = {
      ...targetBooking,
      status: 'checked_out',
      paymentStatus: 'paid',
      surcharge,
      finalTotal,
      paymentMethod: details.paymentMethod || 'Tiền mặt',
      checkOutNotes: details.notes || '',
      actualCheckOutTime: `${this.getOperationalDate()} 11:45`
    };

    const updatedBookings = [...bookings];
    updatedBookings[index] = updatedBooking;
    store.set('bookings', updatedBookings);

    // Synchronize Room Status -> 'cleaning'
    await roomService.updateRoomStatus(targetBooking.roomId, 'cleaning');

    return updatedBooking;
  },

  /**
   * Get list of rooms currently in cleaning state
   * @returns {Promise<Array>}
   */
  async getCleaningRooms() {
    const rooms = store.get('rooms') || [];
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
