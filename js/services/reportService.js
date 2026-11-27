/**
 * HOTEL MANAGEMENT SYSTEM - REPORT SERVICE
 * Aggregates live statistics, revenue, ADR, occupancy, and breakdowns directly from Supabase
 */

import { supabase } from '../core/supabaseClient.js';
import { toast } from '../core/toast.js';
import { roomService } from './roomService.js';
import { bookingService, mapBookingFromDB } from './bookingService.js';

/**
 * Helper: Tính khoảng ngày [startDate, endDate] theo bộ lọc kỳ báo cáo
 * @param {'today'|'7days'|'month'|'quarter'|'all'} period
 */
function getPeriodDateRange(period) {
  const now = new Date();
  const toISODate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(end);
  let periodDays = 1;

  if (period === 'today') {
    periodDays = 1;
  } else if (period === '7days') {
    start.setDate(end.getDate() - 6);
    periodDays = 7;
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    periodDays = Math.max(1, end.getDate());
  } else if (period === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), quarterStartMonth, 1);
    periodDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  } else {
    // 'all'
    return { startDate: null, endDate: null, periodDays: 30 };
  }

  return {
    startDate: toISODate(start),
    endDate: toISODate(end),
    periodDays
  };
}

export const reportService = {
  /**
   * Get all 6 primary KPI metrics for the Dashboard (100% live from Supabase)
   */
  async getDashboardKPIs() {
    const [roomStats, todayBookingsCount, allBookings] = await Promise.all([
      roomService.getRoomStats(),
      bookingService.getTodayBookingsCount(),
      bookingService.getAllBookings()
    ]);

    const activeBookings = (allBookings || []).filter(b => b.status !== 'cancelled');
    const monthlyRevenue = activeBookings.reduce((sum, b) => {
      const amount = b.finalTotal !== null && b.finalTotal !== undefined ? b.finalTotal : b.totalAmount;
      return sum + (Number(amount) || 0);
    }, 0);

    return {
      totalRooms: roomStats.total,
      availableRooms: roomStats.available,
      occupiedRooms: roomStats.occupied,
      maintenanceRooms: roomStats.maintenance,
      cleaningRooms: roomStats.cleaning,
      todayBookings: todayBookingsCount,
      monthlyRevenue,
      revenueGrowth: 0,
      occupancyRate: roomStats.occupancyRate
    };
  },

  /**
   * Get 7-day revenue breakdown for Dashboard bar chart (100% live from Supabase)
   */
  async getWeeklyRevenue() {
    const allBookings = await bookingService.getAllBookings();
    const activeBookings = (allBookings || []).filter(b => b.status !== 'cancelled');

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const shortDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      days.push({
        iso,
        day: dayNames[d.getDay()],
        date: shortDate,
        amount: 0
      });
    }

    const dayMap = new Map(days.map(item => [item.iso, item]));
    activeBookings.forEach(b => {
      const target = dayMap.get(b.checkInDate);
      if (target) {
        const amt = Number(b.finalTotal !== null && b.finalTotal !== undefined ? b.finalTotal : b.totalAmount) || 0;
        target.amount += amt;
      }
    });

    return days;
  },

  /**
   * Get room status distribution for donut chart
   */
  async getRoomStatusDistribution() {
    const stats = await roomService.getRoomStats();
    return [
      { status: 'available', label: 'Phòng trống', count: stats.available, color: '#16a34a' },
      { status: 'occupied', label: 'Đang sử dụng', count: stats.occupied, color: '#2563eb' },
      { status: 'cleaning', label: 'Đang dọn dẹp', count: stats.cleaning, color: '#d97706' },
      { status: 'maintenance', label: 'Đang bảo trì', count: stats.maintenance, color: '#e11d48' }
    ];
  },

  /**
   * Get comprehensive Analytics Report from Supabase (`bookings`, `rooms`, `customers`)
   * @param {'today'|'7days'|'month'|'quarter'|'all'} period
   */
  async getDetailedReport(period = 'month') {
    const { startDate, endDate, periodDays } = getPeriodDateRange(period);

    try {
      let bookingsQuery = supabase
        .from('bookings')
        .select('*')
        .order('check_in_date', { ascending: false });

      if (startDate && endDate) {
        bookingsQuery = bookingsQuery
          .gte('check_in_date', startDate)
          .lte('check_in_date', endDate);
      }

      const [bookingsRes, roomsRes, customersRes] = await Promise.all([
        bookingsQuery,
        supabase.from('rooms').select('id, type, status, price'),
        supabase.from('customers').select('id', { count: 'exact', head: true })
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (customersRes.error) throw customersRes.error;

      const bookings = (bookingsRes.data || []).map(mapBookingFromDB);
      const rooms = roomsRes.data || [];
      const totalCustomers = customersRes.count || 0;

      // Active bookings (không bị hủy)
      const validBookings = bookings.filter(b => b.status !== 'cancelled');
      const completedBookings = bookings.filter(b => b.status === 'checked_out').length;

      // 1. Tổng doanh thu
      const totalRevenue = validBookings.reduce((sum, b) => {
        const amt = b.finalTotal !== null && b.finalTotal !== undefined ? b.finalTotal : b.totalAmount;
        return sum + (Number(amt) || 0);
      }, 0);

      // 2. Tổng số đêm bán được & Công suất phòng trung bình (%)
      const totalNightsSold = validBookings.reduce((sum, b) => sum + (Number(b.nights) || 0), 0);
      const totalRoomNightsAvailable = rooms.length * periodDays;
      const avgOccupancyRate = totalRoomNightsAvailable > 0
        ? Math.min(100, Number(((totalNightsSold / totalRoomNightsAvailable) * 100).toFixed(1)))
        : 0;

      // 3. ADR - Giá phòng trung bình/đêm
      const adr = totalNightsSold > 0 ? Math.round(totalRevenue / totalNightsSold) : 0;

      // 4. Doanh thu theo loại phòng
      const typeMap = new Map();
      rooms.forEach(r => {
        if (!typeMap.has(r.type)) {
          typeMap.set(r.type, { roomType: r.type, bookingsCount: 0, nightsCount: 0, revenue: 0 });
        }
      });

      validBookings.forEach(b => {
        const key = b.roomType || 'Khác';
        if (!typeMap.has(key)) {
          typeMap.set(key, { roomType: key, bookingsCount: 0, nightsCount: 0, revenue: 0 });
        }
        const entry = typeMap.get(key);
        entry.bookingsCount += 1;
        entry.nightsCount += Number(b.nights) || 0;
        entry.revenue += Number(b.finalTotal !== null && b.finalTotal !== undefined ? b.finalTotal : b.totalAmount) || 0;
      });

      const revenueByRoomType = Array.from(typeMap.values())
        .sort((a, b) => b.revenue - a.revenue);

      // 5. Tỉ lệ trạng thái đơn đặt phòng
      const statusDefs = [
        { status: 'checked_out', label: 'Đã trả phòng', color: '#16a34a' },
        { status: 'checked_in', label: 'Đang lưu trú', color: '#2563eb' },
        { status: 'confirmed', label: 'Đã xác nhận', color: '#0d9488' },
        { status: 'pending', label: 'Chờ xác nhận', color: '#d97706' },
        { status: 'cancelled', label: 'Đã hủy', color: '#e11d48' }
      ];

      const totalBookingsCount = bookings.length;
      const bookingStatusBreakdown = statusDefs.map(def => {
        const count = bookings.filter(b => b.status === def.status).length;
        const percent = totalBookingsCount > 0 ? Math.round((count / totalBookingsCount) * 100) : 0;
        return { ...def, count, percent };
      });

      return {
        period,
        startDate,
        endDate,
        kpis: {
          totalRevenue,
          avgOccupancyRate,
          adr,
          completedBookings,
          validBookingsCount: validBookings.length,
          totalNightsSold,
          totalCustomers,
          totalRooms: rooms.length
        },
        revenueByRoomType,
        bookingStatusBreakdown,
        detailedBookings: bookings
      };
    } catch (err) {
      console.error('[reportService.getDetailedReport] Lỗi tải báo cáo:', err);
      toast.show('Không thể tải dữ liệu báo cáo: ' + err.message, 'error');
      throw err;
    }
  }
};
