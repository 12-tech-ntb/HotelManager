/**
 * HOTEL MANAGEMENT SYSTEM - BOOKING SERVICE
 * Comprehensive operations for guest reservations & schedule conflict checks
 * Sẵn sàng tích hợp Supabase Client (`supabase.from('bookings').*`)
 */

import { store } from '../core/state.js';
import { roomService } from './roomService.js';
import { customerService } from './customerService.js';

export const bookingService = {
  /**
   * Get all bookings
   * @returns {Promise<Array>}
   */
  async getAllBookings() {
    return store.get('bookings') || [];
  },

  /**
   * Get recent bookings with optional limit
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async getRecentBookings(limit = 7) {
    const bookings = store.get('bookings') || [];
    const sorted = [...bookings].sort((a, b) => b.id.localeCompare(a.id));
    return sorted.slice(0, limit);
  },

  /**
   * Get booking statistics for Mini KPI Strip
   * @returns {Promise<Object>}
   */
  async getBookingStats() {
    const bookings = store.get('bookings') || [];
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      checked_in: bookings.filter(b => b.status === 'checked_in').length,
      checked_out: bookings.filter(b => b.status === 'checked_out').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length
    };
  },

  /**
   * Count bookings checking in or created today (2026-11-21)
   */
  async getTodayBookingsCount() {
    const today = "2026-11-21";
    const bookings = store.get('bookings') || [];
    return bookings.filter(b => b.checkInDate === today).length;
  },

  /**
   * Filter bookings by keyword, status, and check-in date
   * @param {Object} filters { search, status, checkInDate }
   * @returns {Promise<Array>}
   */
  async filterBookings({ search = '', status = 'all', checkInDate = '' } = {}) {
    let bookings = store.get('bookings') || [];

    // Filter by keyword (ID, customer name, phone, room number)
    if (search && search.trim() !== '') {
      const keyword = search.trim().toLowerCase();
      bookings = bookings.filter(b => 
        b.id.toLowerCase().includes(keyword) ||
        b.customerName.toLowerCase().includes(keyword) ||
        b.customerPhone.toLowerCase().includes(keyword) ||
        b.roomNumber.toLowerCase().includes(keyword) ||
        `phòng ${b.roomNumber}`.toLowerCase().includes(keyword)
      );
    }

    // Filter by status
    if (status && status !== 'all') {
      bookings = bookings.filter(b => b.status === status);
    }

    // Filter by check-in date
    if (checkInDate && checkInDate.trim() !== '') {
      bookings = bookings.filter(b => b.checkInDate === checkInDate.trim());
    }

    // Sort newest first
    return [...bookings].sort((a, b) => b.id.localeCompare(a.id));
  },

  /**
   * Get booking by ID
   * @param {string} id 
   * @returns {Promise<Object|null>}
   */
  async getBookingById(id) {
    const bookings = store.get('bookings') || [];
    return bookings.find(b => b.id === id) || null;
  },

  /**
   * Find rooms available between checkInDate and checkOutDate
   * Checks for overlapping reservations with active bookings (confirmed, checked_in)
   * @param {string} checkInDate 'YYYY-MM-DD'
   * @param {string} checkOutDate 'YYYY-MM-DD'
   * @param {string|null} excludeBookingId (optional when editing)
   * @returns {Promise<Array>}
   */
  async getAvailableRoomsForDates(checkInDate, checkOutDate, excludeBookingId = null) {
    if (!checkInDate || !checkOutDate) return [];

    const allRooms = await roomService.getAllRooms();
    const allBookings = store.get('bookings') || [];

    // Filter out maintenance rooms
    const activeRooms = allRooms.filter(r => r.status !== 'maintenance');

    // Find conflicting room IDs
    const conflictingRoomIds = new Set();
    const inTime = new Date(checkInDate).getTime();
    const outTime = new Date(checkOutDate).getTime();

    allBookings.forEach(b => {
      if (excludeBookingId && b.id === excludeBookingId) return;
      if (b.status === 'cancelled' || b.status === 'checked_out') return;

      const bInTime = new Date(b.checkInDate).getTime();
      const bOutTime = new Date(b.checkOutDate).getTime();

      // Check overlap: (StartA < EndB) and (EndA > StartB)
      if (inTime < bOutTime && outTime > bInTime) {
        conflictingRoomIds.add(b.roomId);
      }
    });

    return activeRooms.filter(r => !conflictingRoomIds.has(r.id));
  },

  /**
   * Validate a Voucher code against subtotal
   * @param {string} code 
   * @param {number} subtotal 
   * @returns {Object} { valid, voucher, discountAmount, message }
   */
  validateVoucher(code, subtotal) {
    if (!code || code.trim() === '') {
      return { valid: false, voucher: null, discountAmount: 0, message: '' };
    }

    const cleanCode = code.trim().toUpperCase();
    const vouchers = store.get('vouchers') || [];
    const voucher = vouchers.find(v => v.code.toUpperCase() === cleanCode && v.active);

    if (!voucher) {
      return { valid: false, voucher: null, discountAmount: 0, message: 'Mã voucher không tồn tại hoặc đã hết hạn.' };
    }

    if (subtotal < (voucher.minOrder || 0)) {
      return {
        valid: false,
        voucher,
        discountAmount: 0,
        message: `Đơn phòng tối thiểu để áp dụng mã này là ${new Intl.NumberFormat('vi-VN').format(voucher.minOrder)} ₫.`
      };
    }

    let discountAmount = 0;
    if (voucher.type === 'percentage') {
      discountAmount = Math.round((subtotal * voucher.value) / 100);
    } else if (voucher.type === 'fixed') {
      discountAmount = voucher.value;
    }

    // Discount cannot exceed subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    return {
      valid: true,
      voucher,
      discountAmount,
      message: `Áp dụng thành công mã ${voucher.code}: Giảm ${new Intl.NumberFormat('vi-VN').format(discountAmount)} ₫!`
    };
  },

  /**
   * Create a new booking
   * @param {Object} data 
   * @returns {Promise<Object>} Created booking
   */
  async createBooking(data) {
    const bookings = store.get('bookings') || [];

    // Ensure customer exists or create new
    let customer = null;
    if (data.customerId) {
      customer = await customerService.getCustomerById(data.customerId);
    }
    if (!customer) {
      customer = await customerService.findOrCreateCustomer({
        fullName: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail || '',
        idCard: data.customerIdCard || ''
      });
    }

    // Verify room
    const room = await roomService.getRoomById(data.roomId);
    if (!room) {
      throw new Error('Phòng được chọn không hợp lệ!');
    }

    // Double check availability
    const availableRooms = await this.getAvailableRoomsForDates(data.checkInDate, data.checkOutDate);
    const isAvailable = availableRooms.some(r => r.id === room.id);
    if (!isAvailable) {
      throw new Error(`Phòng ${room.roomNumber} đã có người đặt trong khoảng ngày bạn chọn! Vui lòng chọn phòng khác.`);
    }

    // Generate new booking ID: BK-202611-XXX
    const nextNumber = String(bookings.length + 1).padStart(3, '0');
    const newId = `BK-202611-${nextNumber}`;

    const newBooking = {
      id: newId,
      customerId: customer.id,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      customerEmail: customer.email || '',
      customerIdCard: customer.idCard || '',
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomType: room.type,
      roomPrice: room.price,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      nights: Number(data.nights) || 1,
      voucherCode: data.voucherCode || '',
      discountAmount: Number(data.discountAmount) || 0,
      totalAmount: Number(data.totalAmount) || room.price,
      status: data.status || 'confirmed',
      paymentStatus: data.paymentStatus || 'paid',
      specialRequests: data.specialRequests || '',
      createdAt: '2026-11-22 09:00'
    };

    // If checkInDate is today and status is checked_in, mark room occupied
    if (newBooking.checkInDate === "2026-11-21" && newBooking.status === "checked_in") {
      await roomService.updateRoomStatus(room.id, "occupied");
    }

    const updatedBookings = [newBooking, ...bookings];
    store.set('bookings', updatedBookings);
    return newBooking;
  },

  /**
   * Confirm a pending booking
   * @param {string} bookingId 
   * @returns {Promise<Object>}
   */
  async confirmBooking(bookingId) {
    const bookings = store.get('bookings') || [];
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index === -1) {
      throw new Error('Không tìm thấy đơn đặt phòng!');
    }

    const updated = { ...bookings[index], status: 'confirmed' };
    const updatedBookings = [...bookings];
    updatedBookings[index] = updated;
    store.set('bookings', updatedBookings);
    return updated;
  },

  /**
   * Cancel a booking
   * @param {string} bookingId 
   * @param {string} reason 
   * @returns {Promise<Object>}
   */
  async cancelBooking(bookingId, reason = '') {
    const bookings = store.get('bookings') || [];
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index === -1) {
      throw new Error('Không tìm thấy đơn đặt phòng!');
    }

    const targetBooking = bookings[index];

    // If room was occupied by this booking, restore to available or cleaning
    if (targetBooking.status === 'checked_in') {
      await roomService.updateRoomStatus(targetBooking.roomId, 'available');
    }

    const updated = { 
      ...targetBooking, 
      status: 'cancelled',
      cancelReason: reason || 'Khách yêu cầu hủy phòng'
    };
    const updatedBookings = [...bookings];
    updatedBookings[index] = updated;
    store.set('bookings', updatedBookings);
    return updated;
  }
};
