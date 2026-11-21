/**
 * HOTEL MANAGEMENT SYSTEM - CORE UTILITIES
 * Helper functions for formatting, DOM manipulation, and badges
 */

/**
 * Format number to Vietnamese currency string (e.g., 1.500.000 ₫)
 * @param {number} amount 
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format ISO Date string (YYYY-MM-DD) to Vietnamese standard DD/MM/YYYY
 * @param {string} dateString 
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Return badge HTML for room status
 * @param {string} status 'available' | 'occupied' | 'cleaning' | 'maintenance'
 * @returns {string} HTML string
 */
export function getRoomStatusBadge(status) {
  const map = {
    available: { label: "Phòng trống", class: "badge-available" },
    occupied: { label: "Đang có khách", class: "badge-occupied" },
    cleaning: { label: "Đang dọn dẹp", class: "badge-cleaning" },
    maintenance: { label: "Đang bảo trì", class: "badge-maintenance" }
  };

  const item = map[status] || { label: status, class: "badge-available" };
  return `<span class="badge ${item.class}"><span class="badge-dot"></span>${item.label}</span>`;
}

/**
 * Return badge HTML for booking status
 * @param {string} status 'checked_in' | 'confirmed' | 'pending' | 'cancelled' | 'checked_out'
 * @returns {string} HTML string
 */
export function getBookingStatusBadge(status) {
  const map = {
    checked_in: { label: "Đã nhận phòng", class: "badge-occupied" },
    confirmed: { label: "Đã xác nhận", class: "badge-confirmed" },
    pending: { label: "Chờ xử lý", class: "badge-pending" },
    cancelled: { label: "Đã hủy", class: "badge-cancelled" },
    checked_out: { label: "Đã trả phòng", class: "badge-available" }
  };

  const item = map[status] || { label: status, class: "badge-pending" };
  return `<span class="badge ${item.class}"><span class="badge-dot"></span>${item.label}</span>`;
}

/**
 * Get initials from a full name (e.g. "Nguyễn Văn An" -> "NA")
 * @param {string} fullName 
 * @returns {string}
 */
export function getInitials(fullName) {
  if (!fullName) return "KH";
  const words = fullName.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Sanitize text to prevent XSS in HTML templates
 * @param {string} str 
 * @returns {string}
 */
export function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
