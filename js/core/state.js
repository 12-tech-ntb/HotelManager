/**
 * HOTEL MANAGEMENT SYSTEM - STATE MANAGEMENT
 * Central In-Memory State Store with pub/sub event bus
 * Designed to mirror future Supabase Realtime synchronization
 */

import { INITIAL_ROOMS, INITIAL_BOOKINGS, INITIAL_CUSTOMERS, INITIAL_VOUCHERS, REVENUE_DATA, HOTEL_CONFIG } from '../data/mock-data.js';

class StateStore {
  constructor() {
    this.state = {
      hotel: { ...HOTEL_CONFIG },
      rooms: [...INITIAL_ROOMS],
      bookings: [...INITIAL_BOOKINGS],
      customers: [...INITIAL_CUSTOMERS],
      vouchers: [...INITIAL_VOUCHERS],
      revenue: { ...REVENUE_DATA }
    };
    this.listeners = new Map();
  }

  /**
   * Get deep copy of current state slice
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
