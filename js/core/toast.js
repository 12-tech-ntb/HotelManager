/**
 * HOTEL MANAGEMENT SYSTEM - TOAST NOTIFICATION COMPONENT
 * Light-weight non-intrusive notification manager
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (!document.querySelector('.toast-container')) {
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
      this.container = container;
    } else {
      this.container = document.querySelector('.toast-container');
    }
  }

  /**
   * Display toast message
   * @param {string} message 
   * @param {'info' | 'success' | 'warning' | 'error'} type 
   * @param {number} duration ms
   */
  show(message, type = 'info', duration = 3000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Choose icon
    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'error') iconName = 'x-circle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    // Render Lucide icon if available
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons({ root: toast });
    }

    // Auto remove
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }
}

export const toast = new ToastManager();
