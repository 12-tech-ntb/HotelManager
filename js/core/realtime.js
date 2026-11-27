/**
 * HOTEL MANAGEMENT SYSTEM - SUPABASE REALTIME MANAGER
 * Subscribes to live postgres_changes on `rooms` & `bookings` tables
 * with debounced UI refresh and automatic beforeunload cleanup.
 */

import { supabase } from './supabaseClient.js';

/**
 * Subscribe to Supabase Realtime changes for hotel tables
 * @param {Object} options
 * @param {Array<'rooms'|'bookings'>} [options.tables=['rooms', 'bookings']]
 * @param {Function} [options.onRoomsChange]
 * @param {Function} [options.onBookingsChange]
 * @param {Function} [options.onAnyChange]
 * @param {number} [options.debounceMs=300]
 * @returns {Function} cleanup function
 */
export function subscribeHotelRealtime({
  tables = ['rooms', 'bookings'],
  onRoomsChange = null,
  onBookingsChange = null,
  onAnyChange = null,
  debounceMs = 300
} = {}) {
  const channelName = `hotel-sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let channel = supabase.channel(channelName);

  let roomsTimer = null;
  let bookingsTimer = null;
  let anyTimer = null;

  const triggerDebounced = (timerRef, setter, callback, payload) => {
    if (typeof callback !== 'function') return;
    clearTimeout(timerRef);
    setter(setTimeout(() => {
      try {
        callback(payload);
      } catch (err) {
        console.error('[Realtime] Lỗi khi làm mới giao diện:', err);
      }
    }, debounceMs));
  };

  if (tables.includes('rooms')) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms' },
      (payload) => {
        if (onRoomsChange) {
          triggerDebounced(roomsTimer, (t) => { roomsTimer = t; }, onRoomsChange, payload);
        }
        if (onAnyChange) {
          triggerDebounced(anyTimer, (t) => { anyTimer = t; }, onAnyChange, payload);
        }
      }
    );
  }

  if (tables.includes('bookings')) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      (payload) => {
        if (onBookingsChange) {
          triggerDebounced(bookingsTimer, (t) => { bookingsTimer = t; }, onBookingsChange, payload);
        }
        if (onAnyChange) {
          triggerDebounced(anyTimer, (t) => { anyTimer = t; }, onAnyChange, payload);
        }
      }
    );
  }

  channel.subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      console.warn(`[Realtime] Kênh ${channelName} gặp sự cố kết nối.`);
    }
  });

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(roomsTimer);
    clearTimeout(bookingsTimer);
    clearTimeout(anyTimer);
    try {
      supabase.removeChannel(channel);
    } catch (err) {
      console.warn('[Realtime] Lỗi khi hủy kênh:', err);
    }
  };

  window.addEventListener('beforeunload', cleanup, { once: true });

  return cleanup;
}
