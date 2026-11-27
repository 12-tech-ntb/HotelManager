/**
 * HOTEL MANAGEMENT SYSTEM - VOUCHERS PAGE CONTROLLER
 * Full CRUD, Toggle Active/Inactive, Search/Filter, Copy code, Loading states
 */

import { voucherService } from '../services/voucherService.js';
import { formatCurrency, escapeHTML, onReady } from '../core/utils.js';
import { toast } from '../core/toast.js';
import { initLucideIcons } from '../main.js';

const state = {
  filters: {
    search: '',
    type: 'all',
    status: 'all'
  },
  vouchers: [],
  editingVoucherId: null,
  deletingVoucherId: null
};

onReady(async () => {
  try {
    initElements();
    await loadVouchers();
  } catch (err) {
    console.error('[vouchers.js] Lỗi khởi tạo trang Voucher:', err);
    toast.show('Không thể khởi tạo trang Voucher: ' + err.message, 'error');
  }
});

function initElements() {
  // Search input (debounce 250ms)
  const searchInput = document.getElementById('voucherSearchInput');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.filters.search = e.target.value.trim();
        renderVouchersList();
      }, 250);
    });
  }

  // Filters
  const typeFilter = document.getElementById('voucherTypeFilter');
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      state.filters.type = e.target.value;
      renderVouchersList();
    });
  }

  const statusFilter = document.getElementById('voucherStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      renderVouchersList();
    });
  }

  // Create button
  const btnAdd = document.getElementById('btnAddVoucher');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => openVoucherModal(null));
  }

  // Voucher Modal events
  const voucherModal = document.getElementById('voucherModal');
  document.getElementById('closeVoucherModalBtn')?.addEventListener('click', closeVoucherModal);
  document.getElementById('cancelVoucherModalBtn')?.addEventListener('click', closeVoucherModal);
  voucherModal?.addEventListener('click', (e) => {
    if (e.target === voucherModal) closeVoucherModal();
  });

  // Dynamic value label & max when switching type
  document.getElementById('voucherTypeSelect')?.addEventListener('change', syncVoucherTypeConstraints);

  // Submit Form
  document.getElementById('voucherForm')?.addEventListener('submit', handleSaveVoucher);

  // Delete Modal events
  const deleteModal = document.getElementById('deleteVoucherModal');
  document.getElementById('closeDeleteVoucherBtn')?.addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteVoucherBtn')?.addEventListener('click', closeDeleteModal);
  deleteModal?.addEventListener('click', (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });
  document.getElementById('confirmDeleteVoucherBtn')?.addEventListener('click', handleDeleteVoucher);

  // Escape key closes open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeVoucherModal();
      closeDeleteModal();
    }
  });
}

async function loadVouchers() {
  state.vouchers = await voucherService.getAllVouchers();
  renderKPIs();
  renderVouchersList();
}

function renderKPIs() {
  const total = state.vouchers.length;
  const active = state.vouchers.filter(v => v.active).length;
  const inactive = total - active;
  const totalUsed = state.vouchers.reduce((sum, v) => sum + (Number(v.usedCount) || 0), 0);

  const elTotal = document.getElementById('kpiTotalVouchers');
  const elActive = document.getElementById('kpiActiveVouchers');
  const elInactive = document.getElementById('kpiInactiveVouchers');
  const elUsed = document.getElementById('kpiTotalUsedVouchers');

  if (elTotal) elTotal.textContent = total;
  if (elActive) elActive.textContent = active;
  if (elInactive) elInactive.textContent = inactive;
  if (elUsed) elUsed.textContent = totalUsed;
}

function renderVouchersList() {
  const tbody = document.getElementById('vouchersTbody');
  const countLabel = document.getElementById('voucherCountLabel');
  if (!tbody) return;

  let filtered = [...state.vouchers];
  const kw = state.filters.search.toLowerCase();

  if (kw) {
    filtered = filtered.filter(v =>
      v.code.toLowerCase().includes(kw) ||
      v.description.toLowerCase().includes(kw)
    );
  }

  if (state.filters.type !== 'all') {
    filtered = filtered.filter(v => v.type === state.filters.type);
  }

  if (state.filters.status === 'active') {
    filtered = filtered.filter(v => v.active === true);
  } else if (state.filters.status === 'inactive') {
    filtered = filtered.filter(v => v.active === false);
  }

  if (countLabel) {
    countLabel.textContent = `Hiển thị ${filtered.length} / ${state.vouchers.length} mã`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty-state">
          <i data-lucide="ticket" style="width: 34px; height: 34px;"></i>
          <span>Không tìm thấy mã voucher nào phù hợp.</span>
        </td>
      </tr>
    `;
    initLucideIcons();
    return;
  }

  tbody.innerHTML = filtered.map(v => {
    const discountStr = v.type === 'percentage'
      ? `${v.value}%`
      : formatCurrency(v.value);
    const typeLabel = v.type === 'percentage' ? 'Theo phần trăm' : 'Giảm trực tiếp';
    const minOrderStr = v.minOrder > 0 ? formatCurrency(v.minOrder) : 'Không giới hạn';

    return `
      <tr>
        <td>
          <div class="voucher-code-pill">
            <span>${escapeHTML(v.code)}</span>
            <button type="button" class="btn-copy-code" data-copy-code="${escapeHTML(v.code)}" title="Sao chép mã">
              <i data-lucide="copy" style="width: 13px; height: 13px;"></i>
            </button>
          </div>
        </td>
        <td style="max-width: 280px;">
          <div style="font-size: 0.875rem; color: var(--text-main); font-weight: 500;">
            ${escapeHTML(v.description || 'Chưa có mô tả')}
          </div>
        </td>
        <td>
          <div class="voucher-value-badge">${discountStr}</div>
          <span class="voucher-type-tag">${typeLabel}</span>
        </td>
        <td style="font-size: 0.875rem; color: var(--text-secondary);">${minOrderStr}</td>
        <td>
          <span class="badge ${v.usedCount > 0 ? 'badge-confirmed' : 'badge-pending'}">
            ${v.usedCount} lượt
          </span>
        </td>
        <td>
          <label class="toggle-switch" title="${v.active ? 'Đang kích hoạt - Nhấn để tạm ngưng' : 'Đang tạm ngưng - Nhấn để kích hoạt'}">
            <input type="checkbox" class="voucher-toggle-input" data-id="${escapeHTML(v.id)}" ${v.active ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 0.4rem;">
            <button type="button" class="btn btn-outline btn-sm btn-edit-voucher" data-id="${escapeHTML(v.id)}" title="Chỉnh sửa">
              <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
            </button>
            <button type="button" class="btn btn-outline btn-sm btn-delete-voucher" data-id="${escapeHTML(v.id)}" title="Xóa mã" style="color: var(--status-maintenance);">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Bind row events
  tbody.querySelectorAll('.btn-copy-code').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = btn.getAttribute('data-copy-code');
      try {
        await navigator.clipboard.writeText(code);
        toast.show(`Đã sao chép mã "${code}"!`, 'success');
      } catch {
        toast.show(`Mã voucher: ${code}`, 'info');
      }
    });
  });

  tbody.querySelectorAll('.voucher-toggle-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const id = input.getAttribute('data-id');
      const nextState = e.target.checked;
      input.disabled = true;
      try {
        await voucherService.toggleVoucherStatus(id, nextState);
        toast.show(nextState ? 'Đã kích hoạt mã Voucher!' : 'Đã tạm ngưng mã Voucher!', 'success');
        await loadVouchers();
      } catch (err) {
        e.target.checked = !nextState;
        toast.show('Lỗi đổi trạng thái: ' + err.message, 'error');
      } finally {
        input.disabled = false;
      }
    });
  });

  tbody.querySelectorAll('.btn-edit-voucher').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const found = state.vouchers.find(v => v.id === id);
      if (found) openVoucherModal(found);
    });
  });

  tbody.querySelectorAll('.btn-delete-voucher').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const found = state.vouchers.find(v => v.id === id);
      if (found) openDeleteModal(found);
    });
  });

  initLucideIcons();
}

function syncVoucherTypeConstraints() {
  const type = document.getElementById('voucherTypeSelect')?.value;
  const label = document.getElementById('voucherValueLabel');
  const input = document.getElementById('voucherValueInput');
  if (!label || !input) return;

  if (type === 'percentage') {
    label.innerHTML = 'Mức giảm (%) <span class="text-danger">*</span>';
    input.max = '100';
    input.step = '1';
    input.placeholder = 'VD: 15';
  } else {
    label.innerHTML = 'Số tiền giảm (VNĐ) <span class="text-danger">*</span>';
    input.removeAttribute('max');
    input.step = '10000';
    input.placeholder = 'VD: 200000';
  }
}

function openVoucherModal(voucher = null) {
  const modal = document.getElementById('voucherModal');
  const title = document.getElementById('voucherModalTitle');
  const codeInput = document.getElementById('voucherCodeInput');
  const typeSelect = document.getElementById('voucherTypeSelect');
  const valueInput = document.getElementById('voucherValueInput');
  const minOrderInput = document.getElementById('voucherMinOrderInput');
  const descInput = document.getElementById('voucherDescInput');
  const activeCheckbox = document.getElementById('voucherActiveCheckbox');

  if (!modal) return;

  if (voucher) {
    state.editingVoucherId = voucher.id;
    title.textContent = `Chỉnh sửa Voucher (${voucher.code})`;
    codeInput.value = voucher.code;
    typeSelect.value = voucher.type;
    valueInput.value = voucher.value;
    minOrderInput.value = voucher.minOrder;
    descInput.value = voucher.description || '';
    activeCheckbox.checked = Boolean(voucher.active);
  } else {
    state.editingVoucherId = null;
    title.textContent = 'Tạo mã Voucher mới';
    document.getElementById('voucherForm')?.reset();
    typeSelect.value = 'percentage';
    minOrderInput.value = 0;
    activeCheckbox.checked = true;
  }

  syncVoucherTypeConstraints();
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  codeInput?.focus();
}

function closeVoucherModal() {
  const modal = document.getElementById('voucherModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.editingVoucherId = null;
}

async function handleSaveVoucher(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('saveVoucherBtn');
  const originalHTML = saveBtn ? saveBtn.innerHTML : '';

  const payload = {
    code: document.getElementById('voucherCodeInput')?.value,
    type: document.getElementById('voucherTypeSelect')?.value,
    value: document.getElementById('voucherValueInput')?.value,
    minOrder: document.getElementById('voucherMinOrderInput')?.value,
    description: document.getElementById('voucherDescInput')?.value,
    active: document.getElementById('voucherActiveCheckbox')?.checked
  };

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>Đang lưu...</span>';
  }

  try {
    if (state.editingVoucherId) {
      await voucherService.updateVoucher(state.editingVoucherId, payload);
      toast.show('Đã cập nhật thông tin Voucher!', 'success');
    } else {
      await voucherService.createVoucher(payload);
      toast.show('Đã tạo mã Voucher mới thành công!', 'success');
    }
    closeVoucherModal();
    await loadVouchers();
  } catch (err) {
    toast.show(err.message || 'Không thể lưu Voucher!', 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHTML;
      initLucideIcons();
    }
  }
}

function openDeleteModal(voucher) {
  state.deletingVoucherId = voucher.id;
  const label = document.getElementById('deleteVoucherCodeLabel');
  if (label) label.textContent = voucher.code;

  const modal = document.getElementById('deleteVoucherModal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
}

function closeDeleteModal() {
  const modal = document.getElementById('deleteVoucherModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  state.deletingVoucherId = null;
}

async function handleDeleteVoucher() {
  if (!state.deletingVoucherId) return;
  const btn = document.getElementById('confirmDeleteVoucherBtn');
  const originalHTML = btn ? btn.innerHTML : '';

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>Đang xóa...</span>';
  }

  try {
    await voucherService.deleteVoucher(state.deletingVoucherId);
    toast.show('Đã xóa mã Voucher khỏi hệ thống!', 'success');
    closeDeleteModal();
    await loadVouchers();
  } catch (err) {
    toast.show('Lỗi xóa Voucher: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      initLucideIcons();
    }
  }
}
