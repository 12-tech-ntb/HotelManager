/**
 * HOTEL MANAGEMENT SYSTEM - STATE MANAGEMENT
 * Central In-Memory State Store with pub/sub event bus
 * Synchronized live with Supabase & Supabase Realtime
 */

class StateStore {
  constructor() {
    this.state = {
      hotel: {
        name: 'Aurora Hotel',
        currency: 'VND'
      },
      rooms: [],
      bookings: [],
      customers: [],
      vouchers: [],
      revenue: {
        currentMonth: 0,
        growthPercentage: 0,
        weeklyDays: []
      }
    };
    this.listeners = new Map();
  }

  /**
   * Get current state slice
   * @param {string} key 
   */
  get(key) {
    if (!key) return { ...this.state };
    return this.state[key];
  }

  /**
   * Update state and notify subscribers
   * @param {string} key 
   * @param {any} value 
   */
  set(key, value) {
    this.state[key] = value;
    this.notify(key, value);
  }

  /**
   * Subscribe to state changes
   * @param {string} event 
   * @param {Function} callback 
   */
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  /**
   * Notify subscribers of an event
   */
  notify(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`State listener error on event "${event}":`, err);
        }
      });
    }
  }
}

export const store = new StateStore();
