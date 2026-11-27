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
 * Calculate number of nights between check-in and check-out
 * @param {string} checkInDate 'YYYY-MM-DD'
 * @param {string} checkOutDate 'YYYY-MM-DD'
 * @returns {number}
 */
export function calculateNights(checkInDate, checkOutDate) {
  if (!checkInDate || !checkOutDate) return 0;
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const diffTime = end.getTime() - start.getTime();
  if (diffTime <= 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    checked_in: { label: "Đang lưu trú", class: "badge-occupied" },
    confirmed: { label: "Đã xác nhận", class: "badge-confirmed" },
    pending: { label: "Chờ xác nhận", class: "badge-pending" },
    cancelled: { label: "Đã hủy", class: "badge-cancelled" },
    checked_out: { label: "Đã trả phòng", class: "badge-available" }
  };

  const item = map[status] || { label: status, class: "badge-pending" };
  return `<span class="badge ${item.class}"><span class="badge-dot"></span>${item.label}</span>`;
}

/**
 * Return badge HTML for payment status
 * @param {string} status 'paid' | 'unpaid' | 'partial'
 * @returns {string} HTML string
 */
export function getPaymentStatusBadge(status) {
  const map = {
    paid: { label: "Đã thanh toán", class: "badge-available" },
    unpaid: { label: "Chưa thanh toán", class: "badge-maintenance" },
    partial: { label: "Đặt cọc một phần", class: "badge-cleaning" }
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

/**
 * Safe DOM Ready callback execution.
 * Handles both cases: DOM still loading or already parsed (interactive/complete)
 * Vital for scripts that use top-level await where DOMContentLoaded may have already fired.
 * @param {Function} fn 
 */
export function onReady(fn) {
  if (typeof fn !== 'function') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => fn());
  } else {
    fn();
  }
}

/**
 * Prevent double submission by disabling a button and showing a loading label
 * while an async Supabase operation is running.
 * @param {HTMLElement|null} btn
 * @param {Function} asyncFn
 * @param {string} loadingText
 */
export async function withButtonLoading(btn, asyncFn, loadingText = 'Đang xử lý...') {
  if (!btn) return await asyncFn();
  if (btn.disabled) return;
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>${escapeHTML(loadingText)}</span>`;
  try {
    return await asyncFn();
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

