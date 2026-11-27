/**
 * HOTEL MANAGEMENT SYSTEM - ROOM MANAGEMENT CONTROLLER
 * Full CRUD, Search, Filter, Status Switching, Grid/Table view toggles
 */

import { roomService } from '../services/roomService.js';
import { formatCurrency, getRoomStatusBadge, escapeHTML, onReady, withButtonLoading } from '../core/utils.js';
import { subscribeHotelRealtime } from '../core/realtime.js';
import { toast } from '../core/toast.js';
import { initLucideIcons } from '../main.js';

// Page Local State
const state = {
  filters: {
    search: '',
    type: 'all',
    status: 'all',
    floor: 'all'
  },
  viewMode: 'grid', // 'grid' | 'table'
  editingRoomId: null,
  deletingRoomId: null
};

onReady(async () => {
  try {
    initElements();
    await loadRooms();
    subscribeHotelRealtime({
      tables: ['rooms'],
      onRoomsChange: () => loadRooms()
    });
  } catch (err) {
    console.error('Error initializing rooms page:', err);
  }
});

/**
 * Initialize event listeners & DOM elements
 */
function initElements() {
  // Search input with debounce
  const searchInput = document.getElementById('roomSearchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.filters.search = e.target.value.trim();
        loadRooms();
      }, 250);
    });
  }

  // Type filter
  const typeFilter = document.getElementById('filterRoomType');
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      state.filters.type = e.target.value;
      loadRooms();
    });
  }

  // Floor filter dropdown
  const floorFilter = document.getElementById('filterRoomFloor');
  if (floorFilter) {
    floorFilter.addEventListener('change', (e) => {
      state.filters.floor = e.target.value;
      loadRooms();
    });
  }

  // Status filter dropdown
  const statusFilter = document.getElementById('filterRoomStatus');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      syncStatusPills(e.target.value);
      loadRooms();
    });
  }

  // Quick status pills
  const statusPills = document.querySelectorAll('.status-filter-pill');
  statusPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const status = pill.dataset.status;
      state.filters.status = status;
      if (statusFilter) statusFilter.value = status;
      syncStatusPills(status);
      loadRooms();
    });
  });

  // View Mode Toggles
  const btnViewGrid = document.getElementById('btnViewGrid');
  const btnViewTable = document.getElementById('btnViewTable');

  if (btnViewGrid && btnViewTable) {
    btnViewGrid.addEventListener('click', () => {
      state.viewMode = 'grid';
      btnViewGrid.classList.add('active');
      btnViewTable.classList.remove('active');
      toggleViewContainers();
    });

    btnViewTable.addEventListener('click', () => {
      state.viewMode = 'table';
      btnViewTable.classList.add('active');
      btnViewGrid.classList.remove('active');
      toggleViewContainers();
    });
  }

  // Add Room Modal Open Button
  const btnAddRoom = document.getElementById('btnAddRoomModal');
  if (btnAddRoom) {
    btnAddRoom.addEventListener('click', () => openRoomModal());
  }

  // Bulk Setup Modal Open Button
  const btnBulkRoom = document.getElementById('btnBulkRoomModal');
  if (btnBulkRoom) {
    btnBulkRoom.addEventListener('click', () => openBulkModal());
  }

  // Bulk Modal Close buttons
  const bulkModalClose = document.getElementById('bulkModalClose');
  const bulkModalCancel = document.getElementById('bulkModalCancel');
  const bulkModalBackdrop = document.getElementById('bulkRoomModal');

  [bulkModalClose, bulkModalCancel].forEach(btn => {
    if (btn) btn.addEventListener('click', () => closeBulkModal());
  });

  if (bulkModalBackdrop) {
    bulkModalBackdrop.addEventListener('click', (e) => {
      if (e.target === bulkModalBackdrop) closeBulkModal();
    });
  }

  // Bulk Form Live Preview inputs
  const bulkInputs = ['bulkStartFloor', 'bulkEndFloor', 'bulkRoomsPerFloor', 'bulkRoomPrefix'];
  bulkInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => updateBulkPreview());
    }
  });

  // Bulk Form Submit
  const bulkRoomForm = document.getElementById('bulkRoomForm');
  if (bulkRoomForm) {
    bulkRoomForm.addEventListener('submit', handleBulkSubmit);
  }

  // Delete Floor Rooms Button
  const btnDeleteFloor = document.getElementById('btnDeleteFloorRooms');
  if (btnDeleteFloor) {
    btnDeleteFloor.addEventListener('click', handleDeleteFloor);
  }

  // Modal Close buttons
  const roomModalClose = document.getElementById('roomModalClose');
  const roomModalCancel = document.getElementById('roomModalCancel');
  const roomModalBackdrop = document.getElementById('roomFormModal');

  [roomModalClose, roomModalCancel].forEach(btn => {
    if (btn) btn.addEventListener('click', () => closeRoomModal());
  });

  if (roomModalBackdrop) {
    roomModalBackdrop.addEventListener('click', (e) => {
      if (e.target === roomModalBackdrop) closeRoomModal();
    });
  }

  // Room Form Submit
  const roomForm = document.getElementById('roomForm');
  if (roomForm) {
    roomForm.addEventListener('submit', handleRoomFormSubmit);
  }

  // Delete Confirmation Modal
  const deleteModalClose = document.getElementById('deleteModalClose');
  const deleteModalCancel = document.getElementById('deleteModalCancel');
  const deleteModalConfirm = document.getElementById('deleteModalConfirm');
  const deleteModalBackdrop = document.getElementById('deleteConfirmModal');

  [deleteModalClose, deleteModalCancel].forEach(btn => {
    if (btn) btn.addEventListener('click', () => closeDeleteModal());
  });

  if (deleteModalBackdrop) {
    deleteModalBackdrop.addEventListener('click', (e) => {
      if (e.target === deleteModalBackdrop) closeDeleteModal();
    });
  }

  if (deleteModalConfirm) {
    deleteModalConfirm.addEventListener('click', handleConfirmDelete);
  }

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeRoomModal();
      closeDeleteModal();
      closeBulkModal();
    }
  });
}

/**
 * Sync active class for status pills
 */
function syncStatusPills(status) {
  const pills = document.querySelectorAll('.status-filter-pill');
  pills.forEach(pill => {
    if (pill.dataset.status === status) {
      pill.classList.add('active');
    } else {
      pill.classList.remove('active');
    }
  });
}

/**
 * Toggle between Grid and Table containers
 */
function toggleViewContainers() {
  const gridContainer = document.getElementById('roomsGridContainer');
  const tableContainer = document.getElementById('roomsTableContainer');

  if (state.viewMode === 'grid') {
    if (gridContainer) gridContainer.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.remove('active');
  } else {
    if (gridContainer) gridContainer.classList.add('hidden');
    if (tableContainer) tableContainer.classList.add('active');
  }
}

/**
 * Load and render rooms list
 */
async function loadRooms() {
  await populateFloorFilter();

  const filteredRooms = await roomService.filterRooms(state.filters);
  const allRooms = await roomService.getAllRooms();

  renderCounts(filteredRooms.length, allRooms.length);
  renderGrid(filteredRooms);
  renderTable(filteredRooms);
  toggleViewContainers();

  initLucideIcons();
}

/**
 * Render Room Count Summary
 */
function renderCounts(filteredCount, totalCount) {
  const countEl = document.getElementById('roomsCountDisplay');
  if (countEl) {
    countEl.innerHTML = `Hiển thị <span class="rooms-count-badge">${filteredCount}</span> trên tổng số <strong>${totalCount}</strong> phòng`;
  }
}

/**
 * Render Rooms Grid View
 */
function renderGrid(rooms) {
  const container = document.getElementById('roomsGridContainer');
  if (!container) return;

  if (rooms.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1;" class="table-empty-state card">
        <i data-lucide="search-x" style="width: 48px; height: 48px; color: var(--text-muted);"></i>
        <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">Không tìm thấy phòng phù hợp</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 400px;">
          Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = rooms.map(room => {
    const statusBadge = getRoomStatusBadge(room.status);
    const formattedPrice = formatCurrency(room.price);
    const amenitiesHTML = (room.amenities || []).slice(0, 3).map(a => `
      <span class="amenity-chip">${escapeHTML(a)}</span>
    `).join('') + ((room.amenities || []).length > 3 ? `<span class="amenity-chip">+${room.amenities.length - 3}</span>` : '');

    return `
      <div class="room-card" data-room-id="${escapeHTML(room.id)}">
        <!-- Thumbnail / Placeholder -->
        <div class="room-card-thumbnail">
          ${room.image ? `
            <img src="${escapeHTML(room.image)}" alt="Phòng ${escapeHTML(room.roomNumber)}" class="room-card-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          ` : ''}
          <div class="room-card-placeholder" style="${room.image ? 'display: none;' : ''}">
            <i data-lucide="bed-double" style="width: 36px; height: 36px;"></i>
            <span style="font-size: 0.75rem; font-weight: 600;">Aurora Room Image</span>
          </div>

          <!-- Badges Overlay -->
          <div class="room-card-badges">
            <span class="floor-chip">Tầng ${escapeHTML(room.floor)}</span>
            ${statusBadge}
          </div>
        </div>

        <!-- Body -->
        <div class="room-card-body">
          <div class="room-title-row">
            <div>
              <h3 class="room-number-heading">Phòng ${escapeHTML(room.roomNumber)}</h3>
              <div class="room-type-sub">${escapeHTML(room.type)}</div>
            </div>
            <div class="room-meta-item" style="color: var(--text-secondary); font-size: 0.78rem;" title="Sức chứa tối đa">
              <i data-lucide="users" style="width: 14px; height: 14px;"></i>
              <span>${escapeHTML(room.capacity)} người</span>
            </div>
          </div>

          <div class="room-price-box">
            <span class="room-price-val">${formattedPrice}</span>
            <span class="room-price-unit">/ đêm</span>
          </div>

          <div class="room-amenities-list">
            ${amenitiesHTML}
          </div>
        </div>

        <!-- Footer / Quick Action Bar -->
        <div class="room-card-footer">
          <div class="room-status-dropdown" title="Đổi nhanh trạng thái">
            <select class="room-status-select" data-room-id="${escapeHTML(room.id)}">
              <option value="available" ${room.status === 'available' ? 'selected' : ''}>🟢 Trống</option>
              <option value="occupied" ${room.status === 'occupied' ? 'selected' : ''}>🔵 Đang có khách</option>
              <option value="cleaning" ${room.status === 'cleaning' ? 'selected' : ''}>🟡 Dọn dẹp</option>
              <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>🔴 Bảo trì</option>
            </select>
          </div>

          <div class="room-actions-btns">
            <button class="btn btn-outline btn-sm btn-edit-room" data-room-id="${escapeHTML(room.id)}" title="Sửa thông tin">
              <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
              Sửa
            </button>
            <button class="btn btn-outline btn-sm btn-delete-room" data-room-id="${escapeHTML(room.id)}" style="color: var(--status-maintenance);" title="Xóa phòng">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  bindRoomActions(container);
}

/**
 * Render Rooms Table View
 */
function renderTable(rooms) {
  const tbody = document.getElementById('roomsTableTbody');
  if (!tbody) return;

  if (rooms.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty-state">
          <i data-lucide="search-x" style="width: 36px; height: 36px;"></i>
          <span>Không tìm thấy phòng phù hợp với bộ lọc</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rooms.map(room => {
    const statusBadge = getRoomStatusBadge(room.status);
    const formattedPrice = formatCurrency(room.price);
    const amenitiesText = (room.amenities || []).join(', ');

    return `
      <tr data-room-id="${escapeHTML(room.id)}">
        <td>
          <div class="room-table-cell">
            <div class="room-table-thumbnail">
              <i data-lucide="bed-double" style="width: 20px; height: 20px;"></i>
            </div>
            <div>
              <div class="font-bold" style="font-size: 0.95rem;">Phòng ${escapeHTML(room.roomNumber)}</div>
              <div class="text-muted" style="font-size: 0.75rem;">ID: ${escapeHTML(room.id)}</div>
            </div>
          </div>
        </td>
        <td><span class="floor-chip" style="background-color: var(--bg-surface-subtle); color: var(--text-main); border: 1px solid var(--border-color);">Tầng ${escapeHTML(room.floor)}</span></td>
        <td class="font-semibold">${escapeHTML(room.type)}</td>
        <td class="font-bold" style="color: var(--color-accent);">${formattedPrice}</td>
        <td>
          <div class="room-meta-item" style="font-size: 0.813rem;">
            <i data-lucide="users" style="width: 14px; height: 14px; color: var(--text-muted);"></i>
            <span>${escapeHTML(room.capacity)} người</span>
          </div>
        </td>
        <td style="max-width: 220px; font-size: 0.78rem; color: var(--text-secondary);" title="${escapeHTML(amenitiesText)}">
          ${escapeHTML(amenitiesText)}
        </td>
        <td>
          <select class="room-status-select" data-room-id="${escapeHTML(room.id)}" style="width: auto; padding: 0.25rem 0.5rem;">
            <option value="available" ${room.status === 'available' ? 'selected' : ''}>🟢 Trống</option>
            <option value="occupied" ${room.status === 'occupied' ? 'selected' : ''}>🔵 Đang có khách</option>
            <option value="cleaning" ${room.status === 'cleaning' ? 'selected' : ''}>🟡 Dọn dẹp</option>
            <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>🔴 Bảo trì</option>
          </select>
        </td>
        <td class="text-right">
          <div style="display: inline-flex; gap: 0.35rem;">
            <button class="btn btn-outline btn-sm btn-edit-room" data-room-id="${escapeHTML(room.id)}" title="Sửa thông tin phòng">
              <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
              Sửa
            </button>
            <button class="btn btn-outline btn-sm btn-delete-room" data-room-id="${escapeHTML(room.id)}" style="color: var(--status-maintenance);" title="Xóa phòng">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  bindRoomActions(tbody);
}

/**
 * Bind Action buttons in Card & Table: Edit, Delete, Quick Status change
 */
function bindRoomActions(parentEl) {
  // Quick status change dropdown
  const statusSelects = parentEl.querySelectorAll('.room-status-select');
  statusSelects.forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const roomId = e.target.dataset.roomId;
      const newStatus = e.target.value;
      try {
        await roomService.updateRoomStatus(roomId, newStatus);
        toast.show(`Đã cập nhật trạng thái phòng thành công!`, 'success');
        await loadRooms();
      } catch (err) {
        toast.show(err.message, 'error');
        await loadRooms(); // revert UI
      }
    });
  });

  // Edit room buttons
  const editBtns = parentEl.querySelectorAll('.btn-edit-room');
  editBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const roomId = btn.dataset.roomId;
      const room = await roomService.getRoomById(roomId);
      if (room) openRoomModal(room);
    });
  });

  // Delete room buttons
  const deleteBtns = parentEl.querySelectorAll('.btn-delete-room');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const roomId = btn.dataset.roomId;
      const room = await roomService.getRoomById(roomId);
      if (room) openDeleteModal(room);
    });
  });
}

/**
 * Open Room Add/Edit Modal
 * @param {Object|null} room null for Add, room object for Edit
 */
function openRoomModal(room = null) {
  const modal = document.getElementById('roomFormModal');
  const title = document.getElementById('roomModalTitle');
  const form = document.getElementById('roomForm');
  if (!modal || !form) return;

  state.editingRoomId = room ? room.id : null;

  if (room) {
    if (title) title.textContent = `Chỉnh sửa thông tin Phòng ${room.roomNumber}`;
    document.getElementById('inputRoomNumber').value = room.roomNumber || '';
    document.getElementById('inputRoomFloor').value = room.floor || 1;
    document.getElementById('inputRoomType').value = room.type || 'Standard Room';
    document.getElementById('inputRoomPrice').value = room.price || 850000;
    document.getElementById('inputRoomCapacity').value = room.capacity || 2;
    document.getElementById('inputRoomStatus').value = room.status || 'available';
    document.getElementById('inputRoomImage').value = room.image || '';

    // Checkboxes for amenities
    const checkboxes = form.querySelectorAll('input[name="amenities"]');
    checkboxes.forEach(cb => {
      cb.checked = (room.amenities || []).includes(cb.value);
    });
  } else {
    if (title) title.textContent = 'Thêm phòng mới';
    form.reset();
    document.getElementById('inputRoomFloor').value = 1;
    document.getElementById('inputRoomType').value = 'Standard Room';
    document.getElementById('inputRoomPrice').value = 850000;
    document.getElementById('inputRoomCapacity').value = 2;
    document.getElementById('inputRoomStatus').value = 'available';

    // Default amenities checked
    const checkboxes = form.querySelectorAll('input[name="amenities"]');
    checkboxes.forEach(cb => {
      cb.checked = ['Wifi', 'TV', 'Điều hòa'].includes(cb.value);
    });
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Close Room Form Modal
 */
function closeRoomModal() {
  const modal = document.getElementById('roomFormModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.editingRoomId = null;
}

/**
 * Handle Add/Edit Room form submission
 */
async function handleRoomFormSubmit(e) {
  e.preventDefault();

  const roomNumber = document.getElementById('inputRoomNumber').value.trim();
  const floor = Number(document.getElementById('inputRoomFloor').value);
  const type = document.getElementById('inputRoomType').value;
  const price = Number(document.getElementById('inputRoomPrice').value);
  const capacity = Number(document.getElementById('inputRoomCapacity').value);
  const status = document.getElementById('inputRoomStatus').value;
  const image = document.getElementById('inputRoomImage').value.trim();

  // Selected amenities
  const checkboxes = document.querySelectorAll('input[name="amenities"]:checked');
  const amenities = Array.from(checkboxes).map(cb => cb.value);

  // Validation
  if (!roomNumber) {
    toast.show('Vui lòng nhập số phòng!', 'warning');
    return;
  }
  if (isNaN(price) || price <= 0) {
    toast.show('Giá phòng mỗi đêm phải lớn hơn 0!', 'warning');
    return;
  }
  if (isNaN(capacity) || capacity < 1) {
    toast.show('Sức chứa tối thiểu 1 người!', 'warning');
    return;
  }

  const roomData = {
    roomNumber,
    floor,
    type,
    price,
    capacity,
    status,
    amenities,
    image
  };

  const submitBtn = e.submitter || e.target?.querySelector('button[type="submit"]');
  try {
    await withButtonLoading(submitBtn, async () => {
      if (state.editingRoomId) {
        await roomService.updateRoom(state.editingRoomId, roomData);
        toast.show(`Cập nhật thông tin Phòng ${roomNumber} thành công!`, 'success');
      } else {
        await roomService.createRoom(roomData);
        toast.show(`Đã thêm mới Phòng ${roomNumber} thành công!`, 'success');
      }

      closeRoomModal();
      await loadRooms();
    }, 'Đang lưu phòng...');
  } catch (err) {
    toast.show(err.message, 'error');
  }
}

/**
 * Open Delete Confirmation Modal
 */
function openDeleteModal(room) {
  const modal = document.getElementById('deleteConfirmModal');
  const textEl = document.getElementById('deleteModalTargetText');
  if (!modal) return;

  state.deletingRoomId = room.id;
  if (textEl) {
    textEl.innerHTML = `Bạn có chắc chắn muốn xóa <strong>Phòng ${escapeHTML(room.roomNumber)}</strong> (${escapeHTML(room.type)}) không?<br><span style="color: var(--text-muted); font-size: 0.8rem;">Thao tác này sẽ xóa vĩnh viễn phòng khỏi bộ nhớ hệ thống.</span>`;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Close Delete Confirmation Modal
 */
function closeDeleteModal() {
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.deletingRoomId = null;
}

/**
 * Confirm and execute deletion
 */
async function handleConfirmDelete() {
  if (!state.deletingRoomId) return;

  try {
    await roomService.deleteRoom(state.deletingRoomId);
    toast.show('Đã xóa phòng thành công!', 'success');
    closeDeleteModal();
    await loadRooms();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}

/**
 * Populate dynamic floor options for filter and cleanup selects
 */
async function populateFloorFilter() {
  const floorFilter = document.getElementById('filterRoomFloor');
  const cleanupSelect = document.getElementById('cleanupFloorSelect');
  const floors = await roomService.getAllFloors();

  if (floorFilter) {
    const currentVal = state.filters.floor;
    let html = `<option value="all">Tất cả các tầng</option>`;
    floors.forEach(f => {
      html += `<option value="${f}" ${String(currentVal) === String(f) ? 'selected' : ''}>Tầng ${f}</option>`;
    });
    floorFilter.innerHTML = html;
  }

  if (cleanupSelect) {
    let cleanHtml = `<option value="">-- Chọn tầng --</option>`;
    floors.forEach(f => {
      cleanHtml += `<option value="${f}">Tầng ${f}</option>`;
    });
    cleanupSelect.innerHTML = cleanHtml;
  }
}

/**
 * Open Bulk Room Setup Modal
 */
async function openBulkModal() {
  const modal = document.getElementById('bulkRoomModal');
  if (!modal) return;

  const floors = await roomService.getAllFloors();
  const nextFloor = floors.length > 0 ? Math.max(...floors) + 1 : 1;

  const startInput = document.getElementById('bulkStartFloor');
  const endInput = document.getElementById('bulkEndFloor');
  if (startInput) startInput.value = nextFloor;
  if (endInput) endInput.value = nextFloor;

  await updateBulkPreview();

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Close Bulk Room Setup Modal
 */
function closeBulkModal() {
  const modal = document.getElementById('bulkRoomModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * Update Bulk Room Live Preview
 */
async function updateBulkPreview() {
  const startFloor = Number(document.getElementById('bulkStartFloor')?.value) || 1;
  const endFloor = Number(document.getElementById('bulkEndFloor')?.value) || startFloor;
  const roomsPerFloor = Math.max(1, Math.min(Number(document.getElementById('bulkRoomsPerFloor')?.value) || 4, 30));
  const prefix = document.getElementById('bulkRoomPrefix')?.value?.trim() || '';

  const fromFloor = Math.min(startFloor, endFloor);
  const toFloor = Math.max(startFloor, endFloor);

  const rooms = await roomService.getAllRooms();
  const existingSet = new Set(rooms.map(r => String(r.roomNumber).trim()));

  const previewTagsContainer = document.getElementById('bulkPreviewTags');
  const countNewEl = document.getElementById('bulkCountNew');
  const countSkipEl = document.getElementById('bulkCountSkip');

  let newCount = 0;
  let skipCount = 0;
  let tagsHtml = '';

  for (let f = fromFloor; f <= toFloor; f++) {
    for (let i = 1; i <= roomsPerFloor; i++) {
      const roomNum = `${prefix}${f}${String(i).padStart(2, '0')}`;
      if (existingSet.has(roomNum)) {
        skipCount++;
        tagsHtml += `<span class="preview-tag existing" title="Phòng ${roomNum} đã tồn tại (sẽ bỏ qua)">${escapeHTML(roomNum)}</span>`;
      } else {
        newCount++;
        tagsHtml += `<span class="preview-tag new" title="Phòng ${roomNum} hợp lệ (sẽ tạo mới)">+${escapeHTML(roomNum)}</span>`;
      }
    }
  }

  if (previewTagsContainer) {
    previewTagsContainer.innerHTML = tagsHtml || '<span style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem;">Không có phòng nào được tạo</span>';
  }

  if (countNewEl) countNewEl.textContent = `Sẽ tạo mới: ${newCount}`;
  if (countSkipEl) countSkipEl.textContent = `Bỏ qua (đã có): ${skipCount}`;
}

/**
 * Handle Bulk Room Creation Submission
 */
async function handleBulkSubmit(e) {
  e.preventDefault();

  const startFloor = Number(document.getElementById('bulkStartFloor')?.value) || 1;
  const endFloor = Number(document.getElementById('bulkEndFloor')?.value) || startFloor;
  const roomsPerFloor = Number(document.getElementById('bulkRoomsPerFloor')?.value) || 4;
  const prefix = document.getElementById('bulkRoomPrefix')?.value?.trim() || '';
  const type = document.getElementById('bulkRoomType')?.value || 'Standard Room';
  const price = Number(document.getElementById('bulkRoomPrice')?.value) || 850000;
  const capacity = Number(document.getElementById('bulkRoomCapacity')?.value) || 2;

  const amenities = Array.from(document.querySelectorAll('input[name="bulkAmenities"]:checked')).map(cb => cb.value);

  try {
    const result = await roomService.bulkCreateRooms({
      startFloor,
      endFloor,
      roomsPerFloor,
      prefix,
      type,
      price,
      capacity,
      amenities
    });

    if (result.createdCount > 0) {
      toast.show(`Đã tạo thành công ${result.createdCount} phòng mới! ${result.skippedCount > 0 ? `(Bỏ qua ${result.skippedCount} phòng đã có)` : ''}`, 'success');
    } else {
      toast.show(`Tất cả ${result.skippedCount} phòng dự kiến đều đã tồn tại, không có phòng mới nào được tạo!`, 'info');
    }

    closeBulkModal();
    await loadRooms();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}

/**
 * Handle Floor Rooms Cleanup / Bulk Deletion
 */
async function handleDeleteFloor() {
  const cleanupSelect = document.getElementById('cleanupFloorSelect');
  const selectedFloor = cleanupSelect?.value;

  if (!selectedFloor) {
    toast.show('Vui lòng chọn tầng cần xóa các phòng!', 'warning');
    return;
  }

  const confirmMsg = `Bạn có chắc chắn muốn xóa toàn bộ các phòng tại Tầng ${selectedFloor}?\n\nLưu ý: Chỉ các phòng trống và không có lịch đặt phòng mới được phép xóa!`;
  if (!window.confirm(confirmMsg)) {
    return;
  }

  try {
    const result = await roomService.deleteFloorRooms(selectedFloor);
    toast.show(`Đã xóa thành công ${result.deletedCount} phòng tại Tầng ${result.floor}!`, 'success');
    closeBulkModal();
    await loadRooms();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}
