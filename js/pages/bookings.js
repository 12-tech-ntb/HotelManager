/**
 * HOTEL MANAGEMENT SYSTEM - BOOKINGS PAGE CONTROLLER
 * Handles Mini KPI metrics, Table rendering, Search/Filter, Create Booking flow, Detail Modal, Confirm and Cancel
 */

import { bookingService } from '../services/bookingService.js';
import { roomService } from '../services/roomService.js';
import { customerService } from '../services/customerService.js';
import { formatCurrency, formatDate, calculateNights, getBookingStatusBadge, getPaymentStatusBadge, getInitials, escapeHTML } from '../core/utils.js';
import { toast } from '../core/toast.js';
import { initLucideIcons } from '../main.js';

// Page Controller State
const state = {
  filters: {
    search: '',
    status: 'all',
    checkInDate: ''
  },
  availableRooms: [],
  selectedRoom: null,
  appliedVoucher: null,
  discountAmount: 0,
  cancellingBookingId: null
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    initElements();
    await loadBookings();
    await loadMiniKPIs();
  } catch (err) {
    console.error('Error initializing bookings page:', err);
  }
});

/**
 * Initialize event listeners & DOM elements
 */
function initElements() {
  // Search input with debounce
  const searchInput = document.getElementById('bookingSearchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.filters.search = e.target.value.trim();
        loadBookings();
      }, 250);
    });
  }

  // Status filter dropdown
  const statusFilter = document.getElementById('filterBookingStatus');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      loadBookings();
    });
  }

  // Check-in date filter
  const checkInDateFilter = document.getElementById('filterCheckInDate');
  const btnClearDate = document.getElementById('btnClearCheckInDate');

  if (checkInDateFilter) {
    checkInDateFilter.addEventListener('change', (e) => {
      state.filters.checkInDate = e.target.value;
      loadBookings();
    });
  }

  if (btnClearDate) {
    btnClearDate.addEventListener('click', () => {
      if (checkInDateFilter) checkInDateFilter.value = '';
      state.filters.checkInDate = '';
      loadBookings();
    });
  }

  // Open Create Booking Modal
  const btnOpenCreate = document.getElementById('btnCreateBookingModal');
  if (btnOpenCreate) {
    btnOpenCreate.addEventListener('click', () => openCreateModal());
  }

  // Create Modal Close / Cancel
  const createModalClose = document.getElementById('createModalClose');
  const createModalCancel = document.getElementById('createModalCancel');
  const createModalBackdrop = document.getElementById('createBookingModal');

  [createModalClose, createModalCancel].forEach(btn => {
    if (btn) btn.addEventListener('click', () => closeCreateModal());
  });

  if (createModalBackdrop) {
    createModalBackdrop.addEventListener('click', (e) => {
      if (e.target === createModalBackdrop) closeCreateModal();
    });
  }

  // Customer Type Radio Toggle
  const customerTypeRadios = document.querySelectorAll('input[name="customerTypeRadio"]');
  const existingCustWrapper = document.getElementById('existingCustomerWrapper');
  const newCustWrapper = document.getElementById('newCustomerWrapper');

  customerTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'existing') {
        if (existingCustWrapper) existingCustWrapper.style.display = 'block';
        if (newCustWrapper) newCustWrapper.style.display = 'none';
      } else {
        if (existingCustWrapper) existingCustWrapper.style.display = 'none';
        if (newCustWrapper) newCustWrapper.style.display = 'block';
      }
    });
  });

  // Date inputs change in Create Booking Modal -> triggers recalculation & room availability
  const checkInInput = document.getElementById('inputBookingCheckIn');
  const checkOutInput = document.getElementById('inputBookingCheckOut');

  [checkInInput, checkOutInput].forEach(inp => {
    if (inp) {
      inp.addEventListener('change', () => handleDatesChanged());
    }
  });

  // Room select change
  const roomSelect = document.getElementById('selectAvailableRoom');
  if (roomSelect) {
    roomSelect.addEventListener('change', (e) => handleRoomSelected(e.target.value));
  }

  // Apply Voucher Button
  const btnApplyVoucher = document.getElementById('btnApplyVoucher');
  if (btnApplyVoucher) {
    btnApplyVoucher.addEventListener('click', () => handleApplyVoucher());
  }

  // Submit Create Booking Form
  const createForm = document.getElementById('createBookingForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateBookingSubmit);
  }

  // Detail Modal Close
  const detailModalClose = document.getElementById('detailModalClose');
  const detailModalDismiss = document.getElementById('detailModalDismiss');
  const detailModalBackdrop = document.getElementById('bookingDetailModal');

  [detailModalClose, detailModalDismiss].forEach(btn => {
    if (btn) btn.addEventListener('click', () => closeDetailModal());
  });

  if (detailModalBackdrop) {
    detailModalBackdrop.addEventListener('click', (e) => {
      if (e.target === detailModalBackdrop) closeDetailModal();
    });
  }

  // Cancel Confirmation Modal
  const cancelModalClose = document.getElementById('cancelModalClose');
  const cancelModalDismiss = document.getElementById('cancelModalDismiss');
  const cancelModalBackdrop = document.getElementById('cancelBookingModal');
  const btnConfirmCancel = document.getElementById('btnConfirmCancelBooking');

  [cancelModalClose, cancelModalDismiss].forEach(btn => {
    if (btn) btn.addEventListener('click', () => closeCancelModal());
  });

  if (cancelModalBackdrop) {
    cancelModalBackdrop.addEventListener('click', (e) => {
      if (e.target === cancelModalBackdrop) closeCancelModal();
    });
  }

  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener('click', handleExecuteCancel);
  }

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCreateModal();
      closeDetailModal();
      closeCancelModal();
    }
  });
}

/**
 * Load Mini KPI Strip Counts
 */
async function loadMiniKPIs() {
  const stats = await bookingService.getBookingStats();

  const elTotal = document.getElementById('kpiTotalBookings');
  if (elTotal) elTotal.textContent = stats.total;

  const elPending = document.getElementById('kpiPendingBookings');
  if (elPending) elPending.textContent = stats.pending;

  const elConfirmed = document.getElementById('kpiConfirmedBookings');
  if (elConfirmed) elConfirmed.textContent = stats.confirmed;

  const elCheckedIn = document.getElementById('kpiCheckedInBookings');
  if (elCheckedIn) elCheckedIn.textContent = stats.checked_in;
}

/**
 * Load & Render Bookings Table
 */
async function loadBookings() {
  const bookings = await bookingService.filterBookings(state.filters);
  const allBookings = await bookingService.getAllBookings();

  renderCountDisplay(bookings.length, allBookings.length);
  renderTable(bookings);

  initLucideIcons();
}

/**
 * Update Counter Display
 */
function renderCountDisplay(filteredCount, totalCount) {
  const display = document.getElementById('bookingsCountDisplay');
  if (display) {
    display.innerHTML = `Hiển thị <span class="rooms-count-badge">${filteredCount}</span> trên tổng số <strong>${totalCount}</strong> đơn đặt phòng`;
  }
}

/**
 * Render Table Rows
 */
function renderTable(bookings) {
  const tbody = document.getElementById('bookingsTableTbody');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="table-empty-state">
          <i data-lucide="calendar-x" style="width: 44px; height: 44px; color: var(--text-muted);"></i>
          <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-top: 0.5rem;">Không tìm thấy đơn đặt phòng</h4>
          <p style="font-size: 0.813rem; color: var(--text-muted);">
            Thử thay đổi từ khóa tìm kiếm hoặc bỏ lọc ngày nhận phòng.
          </p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const initials = getInitials(b.customerName);
    const inDate = formatDate(b.checkInDate);
    const outDate = formatDate(b.checkOutDate);
    const nights = b.nights || calculateNights(b.checkInDate, b.checkOutDate) || 1;
    const formattedTotal = formatCurrency(b.totalAmount);
    const statusBadge = getBookingStatusBadge(b.status);
    const paymentBadge = getPaymentStatusBadge(b.paymentStatus);

    const voucherHTML = b.voucherCode 
      ? `<span class="voucher-chip"><i data-lucide="ticket" style="width: 12px; height: 12px;"></i>${escapeHTML(b.voucherCode)}</span>` 
      : `<span class="voucher-none">&mdash;</span>`;

    return `
      <tr data-booking-id="${escapeHTML(b.id)}">
        <!-- 1. Code -->
        <td>
          <code style="font-weight: 700; color: var(--color-primary); background-color: var(--bg-surface-subtle); padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.813rem;">
            ${escapeHTML(b.id)}
          </code>
        </td>

        <!-- 2. Customer -->
        <td>
          <div class="customer-cell">
            <div class="customer-avatar">${initials}</div>
            <div class="customer-meta">
              <span class="customer-name">${escapeHTML(b.customerName)}</span>
              <span class="customer-phone">${escapeHTML(b.customerPhone)}</span>
            </div>
          </div>
        </td>

        <!-- 3. Room -->
        <td>
          <span class="room-badge">
            <i data-lucide="door-closed" style="width: 14px; height: 14px;"></i>
            P.${escapeHTML(b.roomNumber)}
          </span>
          <div class="text-muted" style="font-size: 0.75rem; margin-top: 0.2rem;">
            ${escapeHTML(b.roomType)}
          </div>
        </td>

        <!-- 4. Stay period -->
        <td>
          <div class="stay-period">
            <span class="stay-dates">${inDate} &rarr; ${outDate}</span>
            <span class="stay-nights-badge">${nights} đêm</span>
          </div>
        </td>

        <!-- 5. Voucher -->
        <td>${voucherHTML}</td>

        <!-- 6. Total -->
        <td class="font-bold" style="color: var(--color-primary); font-size: 0.95rem;">
          ${formattedTotal}
        </td>

        <!-- 7. Payment -->
        <td>${paymentBadge}</td>

        <!-- 8. Status -->
        <td>${statusBadge}</td>

        <!-- 9. Actions -->
        <td class="text-right">
          <div style="display: inline-flex; align-items: center; gap: 0.35rem;">
            <!-- View details -->
            <button class="btn btn-outline btn-sm btn-view-detail" data-booking-id="${escapeHTML(b.id)}" title="Xem chi tiết đơn">
              <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
              Chi tiết
            </button>

            <!-- Confirm button (if pending) -->
            ${b.status === 'pending' ? `
              <button class="btn btn-primary btn-sm btn-confirm-booking" data-booking-id="${escapeHTML(b.id)}" title="Xác nhận đơn">
                <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                Xác nhận
              </button>
            ` : ''}

            <!-- Cancel button (if pending or confirmed) -->
            ${(b.status === 'pending' || b.status === 'confirmed') ? `
              <button class="btn btn-outline btn-sm btn-cancel-booking" data-booking-id="${escapeHTML(b.id)}" style="color: var(--status-maintenance);" title="Hủy đặt phòng">
                <i data-lucide="x-circle" style="width: 14px; height: 14px;"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  bindTableActions(tbody);
}

/**
 * Bind Action buttons in table
 */
function bindTableActions(tbody) {
  // View detail
  const detailBtns = tbody.querySelectorAll('.btn-view-detail');
  detailBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.bookingId;
      const booking = await bookingService.getBookingById(id);
      if (booking) openDetailModal(booking);
    });
  });

  // Confirm booking
  const confirmBtns = tbody.querySelectorAll('.btn-confirm-booking');
  confirmBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.bookingId;
      try {
        await bookingService.confirmBooking(id);
        toast.show(`Đã xác nhận đơn đặt phòng ${id}!`, 'success');
        await loadBookings();
        await loadMiniKPIs();
      } catch (err) {
        toast.show(err.message, 'error');
      }
    });
  });

  // Cancel booking
  const cancelBtns = tbody.querySelectorAll('.btn-cancel-booking');
  cancelBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.bookingId;
      const booking = await bookingService.getBookingById(id);
      if (booking) openCancelModal(booking);
    });
  });
}

/**
 * Open Create Booking Modal
 */
async function openCreateModal() {
  const modal = document.getElementById('createBookingModal');
  const form = document.getElementById('createBookingForm');
  if (!modal || !form) return;

  form.reset();

  // Reset local form state
  state.selectedRoom = null;
  state.appliedVoucher = null;
  state.discountAmount = 0;

  // Set default dates: checkIn = 2026-11-21, checkOut = 2026-11-22
  const checkInInput = document.getElementById('inputBookingCheckIn');
  const checkOutInput = document.getElementById('inputBookingCheckOut');
  if (checkInInput) checkInInput.value = '2026-11-21';
  if (checkOutInput) checkOutInput.value = '2026-11-22';

  // Clear voucher message
  const vMsg = document.getElementById('voucherMessageText');
  if (vMsg) vMsg.textContent = '';
  const dRow = document.getElementById('priceReceiptDiscountRow');
  if (dRow) dRow.style.display = 'none';

  // Load existing customers dropdown
  const customers = await customerService.getAllCustomers();
  const selectCust = document.getElementById('selectExistingCustomer');
  if (selectCust) {
    selectCust.innerHTML = customers.map(c => `
      <option value="${escapeHTML(c.id)}">
        ${escapeHTML(c.fullName)} - ${escapeHTML(c.phone)} (${c.visits} lần lưu trú)
      </option>
    `).join('');
  }

  // Populate available rooms for dates
  await handleDatesChanged();

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Close Create Booking Modal
 */
function closeCreateModal() {
  const modal = document.getElementById('createBookingModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * Handle dates change: validate dates, update nights banner, refresh available rooms
 */
async function handleDatesChanged() {
  const inVal = document.getElementById('inputBookingCheckIn')?.value;
  const outVal = document.getElementById('inputBookingCheckOut')?.value;
  const nightsBannerText = document.getElementById('nightsBannerText');
  const roomSelect = document.getElementById('selectAvailableRoom');

  if (!inVal || !outVal) return;

  const nights = calculateNights(inVal, outVal);

  if (nights <= 0) {
    if (nightsBannerText) nightsBannerText.textContent = 'Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm!';
    if (roomSelect) {
      roomSelect.innerHTML = '<option value="">-- Vui lòng chọn ngày hợp lệ --</option>';
      roomSelect.disabled = true;
    }
    updatePricingReceipt();
    return;
  }

  if (nightsBannerText) {
    nightsBannerText.textContent = `Thời gian lưu trú: ${nights} đêm (${formatDate(inVal)} \u2192 ${formatDate(outVal)})`;
  }

  // Query available rooms
  const rooms = await bookingService.getAvailableRoomsForDates(inVal, outVal);
  state.availableRooms = rooms;

  if (roomSelect) {
    roomSelect.disabled = false;
    if (rooms.length === 0) {
      roomSelect.innerHTML = '<option value="">-- Không còn phòng trống trong khoảng ngày này --</option>';
      state.selectedRoom = null;
    } else {
      roomSelect.innerHTML = rooms.map(r => `
        <option value="${escapeHTML(r.id)}">
          Phòng ${escapeHTML(r.roomNumber)} - ${escapeHTML(r.type)} (${formatCurrency(r.price)}/đêm, ${r.capacity} khách)
        </option>
      `).join('');
      // Default select first available
      state.selectedRoom = rooms[0];
    }
  }

  updatePricingReceipt();
}

/**
 * Handle room selection change
 */
function handleRoomSelected(roomId) {
  state.selectedRoom = state.availableRooms.find(r => r.id === roomId) || null;
  updatePricingReceipt();
}

/**
 * Handle Apply Voucher
 */
function handleApplyVoucher() {
  const code = document.getElementById('inputBookingVoucher')?.value;
  const msgEl = document.getElementById('voucherMessageText');

  const inVal = document.getElementById('inputBookingCheckIn')?.value;
  const outVal = document.getElementById('inputBookingCheckOut')?.value;
  const nights = calculateNights(inVal, outVal) || 1;
  const subtotal = state.selectedRoom ? (state.selectedRoom.price * nights) : 0;

  if (!code || code.trim() === '') {
    state.appliedVoucher = null;
    state.discountAmount = 0;
    if (msgEl) {
      msgEl.className = 'voucher-message';
      msgEl.textContent = 'Vui lòng nhập mã voucher!';
    }
    updatePricingReceipt();
    return;
  }

  const result = bookingService.validateVoucher(code, subtotal);

  if (result.valid) {
    state.appliedVoucher = result.voucher;
    state.discountAmount = result.discountAmount;
    if (msgEl) {
      msgEl.className = 'voucher-message success';
      msgEl.textContent = result.message;
    }
  } else {
    state.appliedVoucher = null;
    state.discountAmount = 0;
    if (msgEl) {
      msgEl.className = 'voucher-message error';
      msgEl.textContent = result.message;
    }
  }

  updatePricingReceipt();
}

/**
 * Update Pricing Breakdown Display
 */
function updatePricingReceipt() {
  const inVal = document.getElementById('inputBookingCheckIn')?.value;
  const outVal = document.getElementById('inputBookingCheckOut')?.value;
  const nights = Math.max(1, calculateNights(inVal, outVal));

  const unitPrice = state.selectedRoom ? state.selectedRoom.price : 0;
  const subtotal = unitPrice * nights;
  const discount = Math.min(state.discountAmount, subtotal);
  const finalTotal = Math.max(0, subtotal - discount);

  // Update elements
  const elUnitPrice = document.getElementById('priceReceiptUnitPrice');
  const elNights = document.getElementById('priceReceiptNights');
  const elSubtotal = document.getElementById('priceReceiptSubtotal');
  const elDiscountRow = document.getElementById('priceReceiptDiscountRow');
  const elDiscount = document.getElementById('priceReceiptDiscount');
  const elFinalTotal = document.getElementById('priceReceiptFinalTotal');

  if (elUnitPrice) elUnitPrice.textContent = `${formatCurrency(unitPrice)} / đêm`;
  if (elNights) elNights.textContent = `${nights} đêm`;
  if (elSubtotal) elSubtotal.textContent = formatCurrency(subtotal);

  if (discount > 0 && elDiscountRow && elDiscount) {
    elDiscountRow.style.display = 'flex';
    elDiscount.textContent = `-${formatCurrency(discount)}`;
  } else if (elDiscountRow) {
    elDiscountRow.style.display = 'none';
  }

  if (elFinalTotal) elFinalTotal.textContent = formatCurrency(finalTotal);
}

/**
 * Submit Create Booking Form
 */
async function handleCreateBookingSubmit(e) {
  e.preventDefault();

  const inVal = document.getElementById('inputBookingCheckIn')?.value;
  const outVal = document.getElementById('inputBookingCheckOut')?.value;
  const nights = calculateNights(inVal, outVal);

  if (nights <= 0) {
    toast.show('Ngày trả phòng phải sau ngày nhận phòng!', 'warning');
    return;
  }

  if (!state.selectedRoom) {
    toast.show('Vui lòng chọn một phòng còn trống!', 'warning');
    return;
  }

  // Customer resolution
  const custType = document.querySelector('input[name="customerTypeRadio"]:checked')?.value;
  let customerId = null;
  let customerName = '';
  let customerPhone = '';
  let customerIdCard = '';
  let customerEmail = '';

  if (custType === 'existing') {
    customerId = document.getElementById('selectExistingCustomer')?.value;
    const cust = await customerService.getCustomerById(customerId);
    if (!cust) {
      toast.show('Vui lòng chọn khách hàng có sẵn!', 'warning');
      return;
    }
    customerName = cust.fullName;
    customerPhone = cust.phone;
    customerIdCard = cust.idCard;
    customerEmail = cust.email;
  } else {
    customerName = document.getElementById('inputNewCustName')?.value.trim();
    customerPhone = document.getElementById('inputNewCustPhone')?.value.trim();
    customerIdCard = document.getElementById('inputNewCustIdCard')?.value.trim();
    customerEmail = document.getElementById('inputNewCustEmail')?.value.trim();

    if (!customerName || !customerPhone) {
      toast.show('Vui lòng điền họ tên và số điện thoại của khách hàng mới!', 'warning');
      return;
    }
  }

  const paymentStatus = document.getElementById('selectPaymentStatus')?.value || 'paid';
  const initialStatus = document.getElementById('selectInitialStatus')?.value || 'confirmed';

  const subtotal = state.selectedRoom.price * nights;
  const discount = Math.min(state.discountAmount, subtotal);
  const totalAmount = Math.max(0, subtotal - discount);

  const bookingPayload = {
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    customerIdCard,
    roomId: state.selectedRoom.id,
    checkInDate: inVal,
    checkOutDate: outVal,
    nights,
    voucherCode: state.appliedVoucher ? state.appliedVoucher.code : '',
    discountAmount: discount,
    totalAmount,
    status: initialStatus,
    paymentStatus
  };

  try {
    const created = await bookingService.createBooking(bookingPayload);
    toast.show(`Tạo thành công đơn đặt phòng ${created.id}!`, 'success');
    closeCreateModal();
    await loadBookings();
    await loadMiniKPIs();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}

/**
 * Open Booking Detail Modal
 */
function openDetailModal(booking) {
  const modal = document.getElementById('bookingDetailModal');
  if (!modal) return;

  const nights = booking.nights || calculateNights(booking.checkInDate, booking.checkOutDate) || 1;

  document.getElementById('detailBookingCode').textContent = `Chi tiết đơn ${booking.id}`;
  document.getElementById('detailCreatedAt').textContent = `Khởi tạo lúc: ${booking.createdAt || 'N/A'}`;
  
  // Status Badge
  const statusCont = document.getElementById('detailStatusBadgeContainer');
  if (statusCont) statusCont.innerHTML = getBookingStatusBadge(booking.status);

  // Customer
  document.getElementById('detailCustName').textContent = booking.customerName;
  document.getElementById('detailCustPhone').textContent = booking.customerPhone;
  document.getElementById('detailCustIdCard').textContent = booking.customerIdCard || 'Chưa cập nhật';
  document.getElementById('detailCustEmail').textContent = booking.customerEmail || 'Chưa cập nhật';

  // Room
  document.getElementById('detailRoomNum').textContent = `Phòng ${booking.roomNumber}`;
  document.getElementById('detailRoomType').textContent = booking.roomType;
  document.getElementById('detailRoomPrice').textContent = `${formatCurrency(booking.roomPrice || (booking.totalAmount / nights))} / đêm`;

  // Stay & Financials
  document.getElementById('detailStayDates').textContent = `${formatDate(booking.checkInDate)} \u2192 ${formatDate(booking.checkOutDate)} (${nights} đêm)`;
  document.getElementById('detailVoucherCode').textContent = booking.voucherCode ? `${booking.voucherCode} (-${formatCurrency(booking.discountAmount || 0)})` : 'Không áp dụng';
  document.getElementById('detailPaymentStatus').innerHTML = getPaymentStatusBadge(booking.paymentStatus);
  document.getElementById('detailTotalAmount').textContent = formatCurrency(booking.totalAmount);

  // Dynamic actions in footer
  const footer = document.getElementById('detailModalActions');
  if (footer) {
    let actionButtons = `<button type="button" class="btn btn-outline" id="detailModalDismiss">Đóng</button>`;

    if (booking.status === 'pending') {
      actionButtons = `
        <button type="button" class="btn btn-danger btn-sm" id="detailActionCancel">Hủy đơn</button>
        <button type="button" class="btn btn-primary" id="detailActionConfirm">Xác nhận đơn</button>
        <button type="button" class="btn btn-outline" id="detailModalDismiss">Đóng</button>
      `;
    } else if (booking.status === 'confirmed') {
      actionButtons = `
        <button type="button" class="btn btn-danger btn-sm" id="detailActionCancel">Hủy đơn</button>
        <button type="button" class="btn btn-outline" id="detailModalDismiss">Đóng</button>
      `;
    }

    footer.innerHTML = actionButtons;

    // Bind footer action clicks
    document.getElementById('detailModalDismiss')?.addEventListener('click', closeDetailModal);
    document.getElementById('detailActionConfirm')?.addEventListener('click', async () => {
      try {
        await bookingService.confirmBooking(booking.id);
        toast.show(`Đã xác nhận đơn ${booking.id}!`, 'success');
        closeDetailModal();
        await loadBookings();
        await loadMiniKPIs();
      } catch (err) {
        toast.show(err.message, 'error');
      }
    });

    document.getElementById('detailActionCancel')?.addEventListener('click', () => {
      closeDetailModal();
      openCancelModal(booking);
    });
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Close Booking Detail Modal
 */
function closeDetailModal() {
  const modal = document.getElementById('bookingDetailModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * Open Cancel Booking Confirmation Modal
 */
function openCancelModal(booking) {
  const modal = document.getElementById('cancelBookingModal');
  const textEl = document.getElementById('cancelModalTargetText');
  if (!modal) return;

  state.cancellingBookingId = booking.id;
  if (textEl) {
    textEl.innerHTML = `Bạn có chắc chắn muốn hủy đơn đặt phòng <strong>${escapeHTML(booking.id)}</strong> của khách hàng <strong>${escapeHTML(booking.customerName)}</strong> (Phòng ${escapeHTML(booking.roomNumber)}) không?<br><span style="color: var(--text-muted); font-size: 0.8rem;">Phòng sẽ được giải phóng sẵn sàng cho khách khác đặt.</span>`;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Close Cancel Modal
 */
function closeCancelModal() {
  const modal = document.getElementById('cancelBookingModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.cancellingBookingId = null;
}

/**
 * Execute Cancel Booking
 */
async function handleExecuteCancel() {
  if (!state.cancellingBookingId) return;

  const reason = document.getElementById('inputCancelReason')?.value.trim();

  try {
    await bookingService.cancelBooking(state.cancellingBookingId, reason);
    toast.show(`Đã hủy đơn đặt phòng thành công!`, 'success');
    closeCancelModal();
    await loadBookings();
    await loadMiniKPIs();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}
