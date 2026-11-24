/**
 * HOTEL MANAGEMENT SYSTEM - CUSTOMER MANAGEMENT CONTROLLER
 * KPI Stats, Filter/Search, CRUD, Profile & Booking History
 */

import { customerService } from '../services/customerService.js';
import { formatCurrency, escapeHTML, onReady } from '../core/utils.js';
import { toast } from '../core/toast.js';
import { initLucideIcons } from '../main.js';

// ─── Page Local State ───────────────────────────────────────────────────────
const state = {
  filters: {
    search: '',
    category: 'all'
  },
  editingCustomerId: null,
  deletingCustomerId: null,
  viewingCustomerId: null
};

// ─── Bootstrap ───────────────────────────────────────────────────────────────
onReady(async () => {
  try {
    setCurrentDate();
    initElements();
    await loadPage();
  } catch (err) {
    console.error('Error initializing customers page:', err);
  }
});

/** Set date badge in header */
function setCurrentDate() {
  const badge = document.getElementById('currentDateBadge');
  if (!badge) return;
  const now = new Date('2026-11-22');
  badge.textContent = now.toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

// ─── Event Listeners ─────────────────────────────────────────────────────────
function initElements() {
  // Search input (debounced)
  const searchInput = document.getElementById('customerSearchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.filters.search = e.target.value.trim();
        loadTable();
      }, 250);
    });
  }

  // Category filter
  const catFilter = document.getElementById('filterCustomerCategory');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      loadTable();
    });
  }

  // Add Customer Button
  const btnAdd = document.getElementById('btnAddCustomerModal');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => openCustomerModal());
  }

  // Customer Form Modal Close
  const customerModalClose = document.getElementById('customerModalClose');
  const customerModalCancel = document.getElementById('customerModalCancel');
  const customerFormBackdrop = document.getElementById('customerFormModal');

  [customerModalClose, customerModalCancel].forEach(btn => {
    if (btn) btn.addEventListener('click', closeCustomerModal);
  });
  if (customerFormBackdrop) {
    customerFormBackdrop.addEventListener('click', (e) => {
      if (e.target === customerFormBackdrop) closeCustomerModal();
    });
  }

  // Customer Form Submit
  const customerForm = document.getElementById('customerForm');
  if (customerForm) {
    customerForm.addEventListener('submit', handleCustomerFormSubmit);
  }

  // Profile Modal Close
  const profileModalClose = document.getElementById('profileModalClose');
  const profileModalClose2 = document.getElementById('profileModalClose2');
  const profileBackdrop = document.getElementById('customerProfileModal');

  [profileModalClose, profileModalClose2].forEach(btn => {
    if (btn) btn.addEventListener('click', closeProfileModal);
  });
  if (profileBackdrop) {
    profileBackdrop.addEventListener('click', (e) => {
      if (e.target === profileBackdrop) closeProfileModal();
    });
  }

  // Edit from Profile Modal
  const btnEditFromProfile = document.getElementById('btnEditFromProfile');
  if (btnEditFromProfile) {
    btnEditFromProfile.addEventListener('click', () => {
      closeProfileModal();
      if (state.viewingCustomerId) {
        openCustomerModal(state.viewingCustomerId);
      }
    });
  }

  // Delete Customer Modal
  const deleteClose = document.getElementById('deleteCustomerClose');
  const deleteCancel = document.getElementById('deleteCustomerCancel');
  const deleteConfirm = document.getElementById('deleteCustomerConfirm');
  const deleteBackdrop = document.getElementById('deleteCustomerModal');

  [deleteClose, deleteCancel].forEach(btn => {
    if (btn) btn.addEventListener('click', closeDeleteModal);
  });
  if (deleteBackdrop) {
    deleteBackdrop.addEventListener('click', (e) => {
      if (e.target === deleteBackdrop) closeDeleteModal();
    });
  }
  if (deleteConfirm) {
    deleteConfirm.addEventListener('click', handleConfirmDelete);
  }

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCustomerModal();
      closeProfileModal();
      closeDeleteModal();
    }
  });
}

// ─── Load & Render ────────────────────────────────────────────────────────────
async function loadPage() {
  await Promise.all([loadKpiCards(), loadTable()]);
}

async function loadKpiCards() {
  const stats = await customerService.getCustomerStats();

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setVal('kpiTotalCustomers', stats.total);
  setVal('kpiLoyalCustomers', stats.loyal);
  setVal('kpiInHouseCustomers', stats.inHouse);
  setVal('kpiTotalRevenue', formatCurrency(stats.totalRevenue));

  initLucideIcons();
}

async function loadTable() {
  const customers = await customerService.filterCustomers(state.filters);
  const allCustomers = await customerService.getAllCustomers();

  renderTable(customers);
  renderCount(customers.length, allCustomers.length);
  initLucideIcons();
}

function renderCount(filtered, total) {
  const el = document.getElementById('customersCountDisplay');
  if (!el) return;
  el.innerHTML = `Hiển thị <span class="rooms-count-badge">${filtered}</span> trên tổng số <strong>${total}</strong> khách hàng`;
}

function renderTable(customers) {
  const tbody = document.getElementById('customerTableBody');
  if (!tbody) return;

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
            <i data-lucide="user-x" style="width: 40px; height: 40px; opacity: 0.35;"></i>
            <span>Không tìm thấy khách hàng nào phù hợp</span>
          </div>
        </td>
      </tr>`;
    initLucideIcons();
    return;
  }

  tbody.innerHTML = customers.map(c => {
    const initials = getInitials(c.fullName);
    const isVip = (Number(c.visits) || 0) >= 2;
    const loyalBadge = isVip
      ? `<span class="customer-tag-vip"><i data-lucide="star" style="width: 10px; height: 10px;"></i> VIP</span>`
      : `<span class="customer-tag-new">Khách mới</span>`;

    return `
    <tr>
      <td>
        <div class="customer-name-cell">
          <div class="customer-avatar-badge ${isVip ? 'vip' : ''}">${escapeHTML(initials)}</div>
          <div class="customer-name-wrapper">
            <span class="customer-fullname">${escapeHTML(c.fullName)}</span>
            <span class="customer-meta-sub">${escapeHTML(c.id)} &bull; ${loyalBadge}</span>
          </div>
        </div>
      </td>
      <td style="font-family: var(--font-mono, monospace); font-size: 0.85rem; color: var(--text-secondary);">
        ${escapeHTML(c.phone || '—')}
      </td>
      <td style="font-size: 0.85rem; color: var(--text-secondary);">
        ${c.email ? escapeHTML(c.email) : '<span style="color: var(--text-muted);">—</span>'}
      </td>
      <td style="font-family: var(--font-mono, monospace); font-size: 0.82rem; color: var(--text-secondary);">
        ${c.idCard ? escapeHTML(c.idCard) : '<span style="color: var(--text-muted);">—</span>'}
      </td>
      <td style="text-align: center;">
        <span style="font-weight: 700; font-size: 1rem; color: var(--color-accent);">${Number(c.visits) || 0}</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);"> lần</span>
      </td>
      <td style="text-align: right; font-weight: 700; font-size: 0.9rem; color: var(--text-main);">
        ${formatCurrency(Number(c.totalSpent) || 0)}
      </td>
      <td>
        <div class="customer-actions-btns" style="justify-content: center;">
          <button
            class="btn-action-icon"
            title="Xem hồ sơ & lịch sử đặt phòng"
            onclick="window._customersPage.openProfile('${escapeHTML(c.id)}')"
          >
            <i data-lucide="eye" style="width: 15px; height: 15px;"></i>
          </button>
          <button
            class="btn-action-icon"
            title="Chỉnh sửa thông tin"
            onclick="window._customersPage.openEdit('${escapeHTML(c.id)}')"
          >
            <i data-lucide="edit-3" style="width: 15px; height: 15px;"></i>
          </button>
          <button
            class="btn-action-icon danger"
            title="Xóa khách hàng"
            onclick="window._customersPage.openDelete('${escapeHTML(c.id)}')"
          >
            <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  initLucideIcons();
}

// ─── Customer Profile Modal ───────────────────────────────────────────────────
async function openProfile(customerId) {
  const customer = await customerService.getCustomerById(customerId);
  if (!customer) {
    toast.show('Không tìm thấy thông tin khách hàng!', 'error');
    return;
  }

  state.viewingCustomerId = customerId;

  // Avatar & Banner
  const initials = getInitials(customer.fullName);
  const isVip = (Number(customer.visits) || 0) >= 2;
  const avatarEl = document.getElementById('profileAvatarLetters');
  const bannerNameEl = document.getElementById('profileBannerName');
  const bannerMetaEl = document.getElementById('profileBannerMeta');

  if (avatarEl) {
    avatarEl.textContent = initials;
    avatarEl.style.background = isVip
      ? 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)';
  }

  if (bannerNameEl) {
    const vipTag = isVip
      ? `<span style="font-size: 0.75rem; padding: 0.2rem 0.6rem; background: rgba(245,158,11,0.2); border-radius: 20px; color: #fbbf24;">⭐ VIP</span>`
      : '';
    bannerNameEl.innerHTML = escapeHTML(customer.fullName) + ' ' + vipTag;
  }

  if (bannerMetaEl) {
    bannerMetaEl.innerHTML = `
      <span><i data-lucide="phone" style="width: 13px; height: 13px;"></i> ${escapeHTML(customer.phone || '—')}</span>
      <span><i data-lucide="mail" style="width: 13px; height: 13px;"></i> ${escapeHTML(customer.email || '—')}</span>
      <span><i data-lucide="id-card" style="width: 13px; height: 13px;"></i> ${escapeHTML(customer.idCard || '—')}</span>
    `;
  }

  // Booking History
  const bookings = await customerService.getCustomerBookings(customerId);
  const totalNights = bookings.reduce((sum, b) => {
    if (!b.checkInDate || !b.checkOutDate) return sum;
    const nights = Math.round((new Date(b.checkOutDate) - new Date(b.checkInDate)) / 86400000);
    return sum + (nights > 0 ? nights : 0);
  }, 0);
  const totalSpent = bookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  // Mini stats
  const setMini = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setMini('profileStatBookings', bookings.length);
  setMini('profileStatNights', `${totalNights} đêm`);
  setMini('profileStatSpent', formatCurrency(totalSpent));

  // Profile info
  const infoEl = document.getElementById('profileInfoFields');
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="form-group" style="flex: 1;">
        <label class="form-label">Ghi chú / Sở thích</label>
        <div class="form-control" style="min-height: 60px; background-color: var(--bg-surface-subtle); color: var(--text-secondary); font-size: 0.85rem;">
          ${customer.notes ? escapeHTML(customer.notes) : '<em style="color: var(--text-muted);">Chưa có ghi chú</em>'}
        </div>
      </div>`;
  }

  // History table
  const historyCount = document.getElementById('profileHistoryCount');
  if (historyCount) historyCount.textContent = `${bookings.length} đơn`;

  const historyBody = document.getElementById('profileBookingHistoryBody');
  if (historyBody) {
    if (bookings.length === 0) {
      historyBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">
            Chưa có lịch sử đặt phòng
          </td>
        </tr>`;
    } else {
      historyBody.innerHTML = bookings.map(b => {
        const statusLabel = getBookingStatusLabel(b.status);
        return `
        <tr>
          <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700; color: var(--color-accent);">
            ${escapeHTML(b.id)}
          </td>
          <td><strong>${escapeHTML(b.roomNumber || '—')}</strong><br><span style="color: var(--text-muted); font-size: 0.75rem;">${escapeHTML(b.roomType || '')}</span></td>
          <td>${formatDate(b.checkInDate)}</td>
          <td>${formatDate(b.checkOutDate)}</td>
          <td style="text-align: right; font-weight: 700;">${formatCurrency(b.totalAmount || 0)}</td>
          <td style="text-align: center;">${statusLabel}</td>
        </tr>`;
      }).join('');
    }
  }

  const modal = document.getElementById('customerProfileModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    initLucideIcons();
  }
}

function closeProfileModal() {
  const modal = document.getElementById('customerProfileModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.viewingCustomerId = null;
}

// ─── Add / Edit Customer Modal ────────────────────────────────────────────────
async function openCustomerModal(customerId = null) {
  state.editingCustomerId = customerId;

  const titleEl = document.getElementById('customerModalTitle');
  const submitLabel = document.getElementById('customerFormSubmitLabel');
  const form = document.getElementById('customerForm');
  if (!form) return;

  // Reset form
  form.reset();

  if (customerId) {
    const customer = await customerService.getCustomerById(customerId);
    if (!customer) {
      toast.show('Không tìm thấy thông tin khách hàng!', 'error');
      return;
    }

    if (titleEl) titleEl.innerHTML = `<i data-lucide="edit-3" style="width:20px;height:20px;vertical-align:middle;margin-right:0.35rem;color:var(--color-accent);"></i> Cập nhật hồ sơ khách`;
    if (submitLabel) submitLabel.textContent = 'Lưu thay đổi';

    setFieldVal('inputCustomerName', customer.fullName);
    setFieldVal('inputCustomerPhone', customer.phone);
    setFieldVal('inputCustomerEmail', customer.email);
    setFieldVal('inputCustomerIdCard', customer.idCard);
    setFieldVal('inputCustomerNotes', customer.notes || '');
  } else {
    if (titleEl) titleEl.innerHTML = `<i data-lucide="user-plus" style="width:20px;height:20px;vertical-align:middle;margin-right:0.35rem;color:var(--color-accent);"></i> Thêm khách hàng mới`;
    if (submitLabel) submitLabel.textContent = 'Lưu hồ sơ';
  }

  const modal = document.getElementById('customerFormModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    initLucideIcons();
    setTimeout(() => document.getElementById('inputCustomerName')?.focus(), 100);
  }
}

function closeCustomerModal() {
  const modal = document.getElementById('customerFormModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.editingCustomerId = null;
}

async function handleCustomerFormSubmit(e) {
  e.preventDefault();

  const fullName = document.getElementById('inputCustomerName')?.value?.trim();
  const phone = document.getElementById('inputCustomerPhone')?.value?.trim();
  const email = document.getElementById('inputCustomerEmail')?.value?.trim();
  const idCard = document.getElementById('inputCustomerIdCard')?.value?.trim();
  const notes = document.getElementById('inputCustomerNotes')?.value?.trim();

  if (!fullName) {
    toast.show('Vui lòng nhập họ và tên khách hàng!', 'warning');
    document.getElementById('inputCustomerName')?.focus();
    return;
  }
  if (!phone) {
    toast.show('Vui lòng nhập số điện thoại liên hệ!', 'warning');
    document.getElementById('inputCustomerPhone')?.focus();
    return;
  }

  const data = { fullName, phone, email, idCard, notes };

  try {
    if (state.editingCustomerId) {
      await customerService.updateCustomer(state.editingCustomerId, data);
      toast.show(`Cập nhật hồ sơ "${fullName}" thành công!`, 'success');
    } else {
      await customerService.createCustomer(data);
      toast.show(`Đã thêm khách hàng "${fullName}" thành công!`, 'success');
    }

    closeCustomerModal();
    await loadPage();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}

// ─── Delete Customer Modal ────────────────────────────────────────────────────
async function openDeleteModal(customerId) {
  const customer = await customerService.getCustomerById(customerId);
  if (!customer) return;

  state.deletingCustomerId = customerId;

  const textEl = document.getElementById('deleteCustomerText');
  if (textEl) {
    textEl.innerHTML = `Bạn có chắc chắn muốn xóa khách hàng <strong>${escapeHTML(customer.fullName)}</strong> không?<br>
      <span style="color: var(--text-muted); font-size: 0.8rem;">Thao tác này chỉ được phép nếu khách hàng chưa có đơn đặt phòng nào.</span>`;
  }

  const modal = document.getElementById('deleteCustomerModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    initLucideIcons();
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteCustomerModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.deletingCustomerId = null;
}

async function handleConfirmDelete() {
  if (!state.deletingCustomerId) return;
  try {
    await customerService.deleteCustomer(state.deletingCustomerId);
    toast.show('Đã xóa hồ sơ khách hàng thành công!', 'success');
    closeDeleteModal();
    await loadPage();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(fullName = '') {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function setFieldVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getBookingStatusLabel(status) {
  const map = {
    pending: '<span class="status-badge pending" style="font-size:0.72rem; padding: 0.15rem 0.5rem;">Chờ xác nhận</span>',
    confirmed: '<span class="status-badge confirmed" style="font-size:0.72rem; padding: 0.15rem 0.5rem;">Đã xác nhận</span>',
    checked_in: '<span class="status-badge checked-in" style="font-size:0.72rem; padding: 0.15rem 0.5rem;">Đang lưu trú</span>',
    checked_out: '<span class="status-badge checked-out" style="font-size:0.72rem; padding: 0.15rem 0.5rem;">Đã trả phòng</span>',
    cancelled: '<span class="status-badge cancelled" style="font-size:0.72rem; padding: 0.15rem 0.5rem;">Đã hủy</span>'
  };
  return map[status] || `<span>${escapeHTML(status)}</span>`;
}

// ─── Expose global callbacks (for inline onclick in table rows) ───────────────
window._customersPage = {
  openProfile: (id) => openProfile(id),
  openEdit: (id) => openCustomerModal(id),
  openDelete: (id) => openDeleteModal(id)
};
