/**
 * HOTEL MANAGEMENT SYSTEM - MAIN ENTRY POINT
 * Handles navigation, mobile drawer, search shortcuts, and Lucide icons
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNavigation();
  initLucideIcons();
  initSearchShortcut();
  initCurrentDate();
});

/**
 * Mobile Sidebar Drawer and Overlay Toggle
 */
function initMobileNavigation() {
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarClose = document.getElementById('sidebarCloseBtn');
  const overlay = document.getElementById('sidebarOverlay');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (mobileToggle) {
    mobileToggle.addEventListener('click', openSidebar);
  }

  if (sidebarClose) {
    sidebarClose.addEventListener('click', closeSidebar);
  }

  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }

  // Handle Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });
}

/**
 * Render Lucide SVG Icons safely
 */
export function initLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Quick search focus keyboard shortcut (Ctrl + K / Cmd + K)
 */
function initSearchShortcut() {
  const searchInput = document.getElementById('globalSearchInput');
  if (!searchInput) return;

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

/**
 * Display formatted current date in header
 */
function initCurrentDate() {
  const dateBadge = document.getElementById('currentDateBadge');
  if (!dateBadge) return;

  const now = new Date();
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = days[now.getDay()];
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  
  dateBadge.textContent = `${dayName}, ${dateStr}`;
}
