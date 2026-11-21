/**
 * HOTEL MANAGEMENT SYSTEM - REPORT SERVICE
 * Aggregates statistics, revenue, and charts
 * Chuẩn bị sẵn để gọi view / aggregate function trong PostgreSQL qua Supabase
 */

import { store } from '../core/state.js';
import { roomService } from './roomService.js';
import { bookingService } from './bookingService.js';

export const reportService = {
  /**
   * Get all 6 primary KPI metrics for the Dashboard
   */
  async getDashboardKPIs() {
    const roomStats = await roomService.getRoomStats();
    const todayBookingsCount = await bookingService.getTodayBookingsCount();
    const revenue = store.get('revenue');

    return {
      totalRooms: roomStats.total,
      availableRooms: roomStats.available,
      occupiedRooms: roomStats.occupied,
      maintenanceRooms: roomStats.maintenance,
      cleaningRooms: roomStats.cleaning,
      todayBookings: todayBookingsCount,
      monthlyRevenue: revenue.currentMonth,
      revenueGrowth: revenue.growthPercentage,
      occupancyRate: roomStats.occupancyRate
    };
  },

  /**
   * Get weekly revenue breakdown for bar chart
   */
  async getWeeklyRevenue() {
    const revenue = store.get('revenue');
    return revenue.weeklyDays || [];
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
  }
};
