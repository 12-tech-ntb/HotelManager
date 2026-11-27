/**
 * HOTEL MANAGEMENT SYSTEM - MAIN ENTRY POINT
 * Handles auth guard, navigation, mobile drawer, search shortcuts, and Lucide icons
 */

import { requireAuth, signOut } from './core/auth.js';
import { onReady } from './core/utils.js';

// ============================================================================
// 1. AUTH GUARD CHO TOÀN BỘ TRANG QUẢN LÝ
// ============================================================================
// Chạy top-level await ngay khi module nạp để kiểm tra phiên đăng nhập:
// - Nếu chưa đăng nhập: lập tức chuyển hướng về trang login, không hiển thị dữ liệu
// - Nếu đã đăng nhập: tiếp tục khởi tạo giao diện và nạp thông tin nhân viên
const session = await requireAuth();

// ============================================================================
// 2. KHỞI TẠO CÁC TÍNH NĂNG GIAO DIỆN CHUNG
// ============================================================================
function initApp() {
  initMobileNavigation();
  initLucideIcons();
  initSearchShortcut();
  initCurrentDate();
  initSmoothPageTransitions();

  if (session && session.user) {
    initUserSessionUI(session.user);
  }
}

// Gỡ trạng thái chuyển cảnh nếu người dùng quay lại bằng nút Back (bfcache)
window.addEventListener('pageshow', () => {
  document.body.classList.remove('page-leaving');
});

// Chạy an toàn bất kể DOM đã load trước hay sau khi hoàn thành requireAuth
onReady(initApp);

/**
 * Hiển thị thông tin người dùng đang đăng nhập và gắn các nút Đăng xuất
 * @param {Object} user 
 */
function initUserSessionUI(user) {
  const email = user.email || 'Nhân viên';
  const shortName = email.split('@')[0];

  // 1. Cập nhật Sidebar Profile
  const nameEl = document.querySelector('.user-name');
  if (nameEl) {
    nameEl.textContent = shortName;
    nameEl.title = email;
  }

  const roleEl = document.querySelector('.user-role');
  if (roleEl) {
    roleEl.textContent = email;
    roleEl.title = email;
  }

  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl) {
    const initials = shortName.slice(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }

  // Thêm nút Đăng xuất nhỏ trong Sidebar Footer
  const userProfile = document.querySelector('.user-quick-profile');
  if (userProfile && !document.getElementById('sidebarLogoutBtn')) {
    const sidebarLogout = document.createElement('button');
    sidebarLogout.id = 'sidebarLogoutBtn';
    sidebarLogout.className = 'sidebar-logout-btn';
    sidebarLogout.title = `Đăng xuất (${email})`;
    sidebarLogout.setAttribute('aria-label', 'Đăng xuất');
    sidebarLogout.style.cssText = 'background:none; border:none; color:#57534e; cursor:pointer; padding:6px; border-radius:9999px; display:flex; align-items:center; justify-content:center; margin-left:auto; transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);';
    sidebarLogout.innerHTML = '<i data-lucide="log-out" style="width: 16px; height: 16px;"></i>';
    
    sidebarLogout.addEventListener('mouseenter', () => {
      sidebarLogout.style.color = '#be123c';
      sidebarLogout.style.backgroundColor = 'rgba(225, 29, 72, 0.12)';
    });
    sidebarLogout.addEventListener('mouseleave', () => {
      sidebarLogout.style.color = '#57534e';
      sidebarLogout.style.backgroundColor = 'transparent';
    });
    sidebarLogout.addEventListener('click', handleLogoutClick);

    userProfile.appendChild(sidebarLogout);
  }

  // 2. Thêm nút Đăng xuất trên Header Right
  const headerRight = document.querySelector('.header-right');
  if (headerRight && !document.getElementById('headerLogoutBtn')) {
    const headerLogout = document.createElement('button');
    headerLogout.id = 'headerLogoutBtn';
    headerLogout.className = 'header-action-btn';
    headerLogout.setAttribute('aria-label', 'Đăng xuất');
    headerLogout.title = `Đăng xuất khỏi hệ thống (${email})`;
    headerLogout.innerHTML = '<i data-lucide="log-out" style="width: 17px; height: 17px; color: #ef4444;"></i>';
    headerLogout.addEventListener('click', handleLogoutClick);

    headerRight.appendChild(headerLogout);
  }

  // Cập nhật lại các icon vừa được chèn
  initLucideIcons();
}

/**
 * Xử lý xác nhận đăng xuất
 */
async function handleLogoutClick() {
  const confirmed = window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống quản lý?');
  if (confirmed) {
    await signOut();
  }
}

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

/**
 * Smooth Page Leave Transition (Glassy Dashboard V2)
 * Applies subtle blur fade-out (~150ms) before navigating between internal pages.
 */
function initSmoothPageTransitions() {
  document.addEventListener('click', (e) => {
    // Bỏ qua nếu mở tab mới hoặc click chuột giữa/phải
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      link.hasAttribute('download') ||
      link.getAttribute('target') === '_blank'
    ) {
      return;
    }

    // Kiểm tra liên kết nội bộ cùng origin
    let targetUrl;
    try {
      targetUrl = new URL(href, window.location.href);
    } catch {
      return;
    }
    if (targetUrl.origin !== window.location.origin) return;
    if (targetUrl.href === window.location.href) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(() => {
      window.location.href = targetUrl.href;
    }, 150);
  });
}
