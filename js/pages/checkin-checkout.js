/**
 * HOTEL MANAGEMENT SYSTEM - FRONT DESK CHECK-IN / CHECK-OUT CONTROLLER
 * Manages front desk arrivals, departures, 1-touch actions, and room housekeeping state sync
 */

import { checkinService } from '../services/checkinService.js';
import { formatCurrency, formatDate, calculateNights, getBookingStatusBadge, getPaymentStatusBadge, getInitials, escapeHTML } from '../core/utils.js';
import { toast } from '../core/toast.js';
import { initLucideIcons } from '../main.js';

// Page Controller State
const state = {
  currentTab: 'arrivals', // 'arrivals' | 'departures' | 'all'
  searchKeyword: '',
  activeBooking: null // for modals
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    initElements();
    await refreshFrontDesk();
  } catch (err) {
    console.error('Error initializing front desk page:', err);
  }
});

/**
 * Initialize event listeners & DOM elements
 */
function initElements() {
  // Tabs navigation
  const tabArrivals = document.getElementById('tabArrivals');
  const tabDepartures = document.getElementById('tabDepartures');
  const tabAll = document.getElementById('tabAll');

  if (tabArrivals) {
    tabArrivals.addEventListener('click', () => switchTab('arrivals'));
  }
  if (tabDepartures) {
    tabDepartures.addEventListener('click', () => switchTab('departures'));
  }
  if (tabAll) {
    tabAll.addEventListener('click', () => switchTab('all'));
  }

  // Search input with debounce
  const searchInput = document.getElementById('frontDeskSearchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchKeyword = e.target.value.trim();
        loadOperationsTable();
      }, 250);
    });
  }

  // Check-in Modal Close & Form
  const checkInClose = document.getElementById('checkInModalClose');
  const checkInCancel = document.getElementById('checkInModalCancel');
  const checkInBackdrop = document.getElementById('checkInModal');
  const checkInForm = document.getElementById('checkInForm');

  [checkInClose, checkInCancel].forEach(btn => {
    if (btn) btn.addEventListener('click', closeCheckInModal);
  });

  if (checkInBackdrop) {
    checkInBackdrop.addEventListener('click', (e) => {
      if (e.target === checkInBackdrop) closeCheckInModal();
    });
  }

  if (checkInForm) {
    checkInForm.addEventListener('submit', handleCheckInSubmit);
  }

  // Check-out Modal Close & Form
  const checkOutClose = document.getElementById('checkOutModalClose');
  const checkOutCancel = document.getElementById('checkOutModalCancel');
  const checkOutBackdrop = document.getElementById('checkOutModal');
  const checkOutForm = document.getElementById('checkOutForm');
  const surchargeInput = document.getElementById('inputCheckOutSurcharge');

  [checkOutClose, checkOutCancel].forEach(btn => {
    if (btn) btn.addEventListener('click', closeCheckOutModal);
  });

  if (checkOutBackdrop) {
    checkOutBackdrop.addEventListener('click', (e) => {
      if (e.target === checkOutBackdrop) closeCheckOutModal();
    });
  }

  if (surchargeInput) {
    surchargeInput.addEventListener('input', updateCheckOutCalculation);
  }

  if (checkOutForm) {
    checkOutForm.addEventListener('submit', handleCheckOutSubmit);
  }

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCheckInModal();
      closeCheckOutModal();
    }
  });
}

/**
 * Switch Active Tab
 */
function switchTab(tabName) {
  state.currentTab = tabName;

  const tabArrivals = document.getElementById('tabArrivals');
  const tabDepartures = document.getElementById('tabDepartures');
  const tabAll = document.getElementById('tabAll');

  [tabArrivals, tabDepartures, tabAll].forEach(btn => {
    if (btn) {
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });

  if (tabName === 'arrivals' && tabArrivals) {
    tabArrivals.classList.add('active');
    tabArrivals.setAttribute('aria-selected', 'true');
  } else if (tabName === 'departures' && tabDepartures) {
    tabDepartures.classList.add('active');
    tabDepartures.setAttribute('aria-selected', 'true');
  } else if (tabName === 'all' && tabAll) {
    tabAll.classList.add('active');
    tabAll.setAttribute('aria-selected', 'true');
  }

  loadOperationsTable();
}

/**
 * Refresh All Front Desk Data (KPIs, Cleaning Banner, Operations Table)
 */
async function refreshFrontDesk() {
  await Promise.all([
    loadKPIs(),
    loadCleaningRooms(),
    loadOperationsTable()
  ]);
  initLucideIcons();
}

/**
 * Load Front Desk KPIs & Tab Badges
 */
async function loadKPIs() {
  const stats = await checkinService.getFrontDeskStats();

  const elArrivals = document.getElementById('kpiArrivalsPending');
  if (elArrivals) elArrivals.textContent = stats.arrivalsPending;

  const elDepartures = document.getElementById('kpiDeparturesPending');
  if (elDepartures) elDepartures.textContent = stats.departuresPending;

  const elInHouse = document.getElementById('kpiInHouseGuests');
  if (elInHouse) elInHouse.textContent = stats.inHouseGuests;

  const elCleaning = document.getElementById('kpiRoomsCleaning');
  if (elCleaning) elCleaning.textContent = stats.roomsCleaning;

  // Badges on tabs
  const badgeArr = document.getElementById('badgeArrivals');
  if (badgeArr) badgeArr.textContent = stats.arrivalsPending;

  const badgeDep = document.getElementById('badgeDepartures');
  if (badgeDep) badgeDep.textContent = stats.departuresPending;

  const badgeAll = document.getElementById('badgeAll');
  if (badgeAll) badgeAll.textContent = stats.arrivalsPending + stats.departuresPending;
}

/**
 * Load Cleaning Rooms Alert Banner
 */
async function loadCleaningRooms() {
  const banner = document.getElementById('cleaningAlertBanner');
  const listContainer = document.getElementById('cleaningRoomsListContainer');
  const countEl = document.getElementById('cleaningCountNum');
  if (!banner || !listContainer) return;

  const cleaningRooms = await checkinService.getCleaningRooms();

  if (cleaningRooms.length === 0) {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'flex';
  if (countEl) countEl.textContent = cleaningRooms.length;

  listContainer.innerHTML = cleaningRooms.map(r => `
    <div class="cleaning-room-pill" data-room-id="${escapeHTML(r.id)}">
      <i data-lucide="bed-double" style="width: 14px; height: 14px;"></i>
      <span>P.${escapeHTML(r.roomNumber)}</span>
      <button type="button" class="btn-mark-cleaned" data-room-id="${escapeHTML(r.id)}" title="Buồng phòng đã dọn xong">
        Đã dọn xong
      </button>
    </div>
  `).join('');

  // Bind mark cleaned buttons
  const markBtns = listContainer.querySelectorAll('.btn-mark-cleaned');
  markBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const roomId = btn.dataset.roomId;
      try {
        await checkinService.markRoomCleaned(roomId);
        toast.show(`Phòng đã sẵn sàng đón khách!`, 'success');
        await refreshFrontDesk();
      } catch (err) {
        toast.show(err.message, 'error');
      }
    });
  });
}

/**
 * Load & Render Front Desk Operations Table
 */
async function loadOperationsTable() {
  const tbody = document.getElementById('frontDeskTableTbody');
  const countDisplay = document.getElementById('frontDeskCountDisplay');
  if (!tbody) return;

  let items = [];

  if (state.currentTab === 'arrivals') {
    items = await checkinService.getArrivals({ search: state.searchKeyword });
  } else if (state.currentTab === 'departures') {
    items = await checkinService.getDepartures({ search: state.searchKeyword });
  } else {
    items = await checkinService.getAllActivities({ search: state.searchKeyword });
  }

  if (countDisplay) {
    countDisplay.innerHTML = `Hiển thị <strong>${items.length}</strong> lượt giao dịch cần xử lý`;
  }

  if (items.length === 0) {
    let emptyMsg = "Hiện không có lượt khách nào cần xử lý trong mục này";
    if (state.currentTab === 'arrivals') emptyMsg = "Không có khách nào đang chờ Check-in!";
    if (state.currentTab === 'departures') emptyMsg = "Không có khách nào đang chờ Check-out!";

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty-state">
          <i data-lucide="check-circle-2" style="width: 44px; height: 44px; color: var(--status-available);"></i>
          <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-top: 0.5rem;">${emptyMsg}</h4>
          <p style="font-size: 0.813rem; color: var(--text-muted);">
            Tất cả hoạt động quầy lễ tân đã được xử lý hoàn tất hoặc không khớp từ khóa tìm kiếm.
          </p>
        </td>
      </tr>
    `;
    initLucideIcons();
    return;
  }

  tbody.innerHTML = items.map(item => {
    const isArrival = item.status === 'confirmed' || item.status === 'pending';
    const isDeparture = item.status === 'checked_in';
    const inDate = formatDate(item.checkInDate);
    const outDate = formatDate(item.checkOutDate);
    const nights = item.nights || calculateNights(item.checkInDate, item.checkOutDate) || 1;
    const formattedAmount = formatCurrency(item.totalAmount);
    const statusBadge = getBookingStatusBadge(item.status);
    const paymentBadge = getPaymentStatusBadge(item.paymentStatus);
    const initials = getInitials(item.customerName);

    // Action button based on guest state
    let actionBtnHTML = '';
    if (isArrival) {
      actionBtnHTML = `
        <button type="button" class="btn-action-checkin btn-trigger-checkin" data-booking-id="${escapeHTML(item.id)}">
          <i data-lucide="key" style="width: 14px; height: 14px;"></i>
          Nhận phòng (Check-in)
        </button>
      `;
    } else if (isDeparture) {
      actionBtnHTML = `
        <button type="button" class="btn-action-checkout btn-trigger-checkout" data-booking-id="${escapeHTML(item.id)}">
          <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
          Trả phòng (Check-out)
        </button>
      `;
    } else {
      actionBtnHTML = `<span class="text-muted" style="font-size: 0.78rem;">Đã hoàn tất</span>`;
    }

    return `
      <tr data-booking-id="${escapeHTML(item.id)}">
        <!-- 1. Room info -->
        <td>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <span class="room-badge" style="font-size: 0.95rem; padding: 0.35rem 0.65rem;">
              <i data-lucide="door-closed" style="width: 16px; height: 16px;"></i>
              P.${escapeHTML(item.roomNumber)}
            </span>
            <div>
              <div class="font-bold" style="font-size: 0.844rem; color: var(--text-main);">${escapeHTML(item.roomType)}</div>
              <div class="text-muted" style="font-size: 0.75rem;">${formatCurrency(item.roomPrice || (item.totalAmount / nights))}/đêm</div>
            </div>
          </div>
        </td>

        <!-- 2. Booking ID -->
        <td>
          <code style="font-weight: 700; color: var(--color-primary); background-color: var(--bg-surface-subtle); padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.813rem;">
            ${escapeHTML(item.id)}
          </code>
        </td>

        <!-- 3. Customer -->
        <td>
          <div class="customer-cell">
            <div class="customer-avatar">${initials}</div>
            <div class="customer-meta">
              <span class="customer-name">${escapeHTML(item.customerName)}</span>
              <span class="customer-phone">${escapeHTML(item.customerPhone)}</span>
            </div>
          </div>
        </td>

        <!-- 4. Schedule -->
        <td>
          <div class="stay-period">
            <span class="stay-dates">${inDate} &rarr; ${outDate}</span>
            <span class="stay-nights-badge">${nights} đêm</span>
          </div>
        </td>

        <!-- 5. Payment info -->
        <td>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <span class="font-bold" style="color: var(--color-primary); font-size: 0.875rem;">${formattedAmount}</span>
            <div>${paymentBadge}</div>
          </div>
        </td>

        <!-- 6. Current status -->
        <td>
          ${statusBadge}
        </td>

        <!-- 7. 1-Touch Action -->
        <td class="text-right">
          ${actionBtnHTML}
        </td>
      </tr>
    `;
  }).join('');

  bindTableOperations(tbody);
  initLucideIcons();
}

/**
 * Bind 1-Touch Action Buttons
 */
function bindTableOperations(tbody) {
  // Check-in trigger
  const checkInBtns = tbody.querySelectorAll('.btn-trigger-checkin');
  checkInBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.bookingId;
      const bookings = await checkinService.getArrivals();
      const all = await checkinService.getAllActivities();
      const booking = all.find(b => b.id === id);
      if (booking) openCheckInModal(booking);
    });
  });

  // Check-out trigger
  const checkOutBtns = tbody.querySelectorAll('.btn-trigger-checkout');
  checkOutBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.bookingId;
      const all = await checkinService.getAllActivities();
      const booking = all.find(b => b.id === id);
      if (booking) openCheckOutModal(booking);
    });
  });
}

/**
 * Open Check-in Modal
 */
function openCheckInModal(booking) {
  state.activeBooking = booking;
  const modal = document.getElementById('checkInModal');
  if (!modal) return;

  const inDate = formatDate(booking.checkInDate);
  const outDate = formatDate(booking.checkOutDate);

  document.getElementById('modalCheckInCode').textContent = booking.id;
  document.getElementById('modalCheckInCustName').textContent = `${booking.customerName} (${booking.customerPhone})`;
  document.getElementById('modalCheckInRoom').textContent = `Phòng ${booking.roomNumber} - ${booking.roomType}`;
  document.getElementById('modalCheckInDates').textContent = `${inDate} \u2192 ${outDate}`;

  const idCardInput = document.getElementById('inputCheckInIdCard');
  if (idCardInput) idCardInput.value = booking.customerIdCard || '';

  const notesInput = document.getElementById('inputCheckInNotes');
  if (notesInput) notesInput.value = '';

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Close Check-in Modal
 */
function closeCheckInModal() {
  const modal = document.getElementById('checkInModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.activeBooking = null;
}

/**
 * Handle Check-in Form Submit
 */
async function handleCheckInSubmit(e) {
  e.preventDefault();
  if (!state.activeBooking) return;

  const idCard = document.getElementById('inputCheckInIdCard')?.value.trim();
  const notes = document.getElementById('inputCheckInNotes')?.value.trim();

  try {
    const updated = await checkinService.processCheckIn(state.activeBooking.id, { idCard, notes });
    toast.show(`Check-in thành công! Khách đã nhận Phòng ${updated.roomNumber}.`, 'success');
    closeCheckInModal();
    await refreshFrontDesk();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}

/**
 * Open Check-out Modal
 */
function openCheckOutModal(booking) {
  state.activeBooking = booking;
  const modal = document.getElementById('checkOutModal');
  if (!modal) return;

  document.getElementById('modalCheckOutCode').textContent = booking.id;
  document.getElementById('modalCheckOutCustName').textContent = `${booking.customerName} (${booking.customerPhone})`;
  document.getElementById('modalCheckOutRoom').textContent = `Phòng ${booking.roomNumber} - ${booking.roomType}`;
  document.getElementById('modalCheckOutRoomCharge').textContent = formatCurrency(booking.totalAmount);

  // Paid amount calculation
  let paidAmount = booking.totalAmount;
  if (booking.paymentStatus === 'unpaid') paidAmount = 0;
  if (booking.paymentStatus === 'partial') paidAmount = Math.round(booking.totalAmount * 0.5);

  document.getElementById('modalCheckOutPaidAmount').textContent = formatCurrency(paidAmount);

  // Reset surcharge
  const surchargeInput = document.getElementById('inputCheckOutSurcharge');
  if (surchargeInput) surchargeInput.value = 0;

  const notesInput = document.getElementById('inputCheckOutNotes');
  if (notesInput) notesInput.value = '';

  updateCheckOutCalculation();

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Update Check-out Settlement calculation in Modal
 */
function updateCheckOutCalculation() {
  if (!state.activeBooking) return;

  const surcharge = Number(document.getElementById('inputCheckOutSurcharge')?.value) || 0;
  const totalCharge = state.activeBooking.totalAmount;

  let paidAmount = totalCharge;
  if (state.activeBooking.paymentStatus === 'unpaid') paidAmount = 0;
  if (state.activeBooking.paymentStatus === 'partial') paidAmount = Math.round(totalCharge * 0.5);

  const balanceDue = Math.max(0, (totalCharge + surcharge) - paidAmount);

  const balanceEl = document.getElementById('modalCheckOutBalanceDue');
  const labelEl = document.getElementById('balanceDueStatusLabel');

  if (balanceEl) balanceEl.textContent = formatCurrency(balanceDue);

  if (labelEl) {
    if (balanceDue === 0) {
      labelEl.textContent = 'Đã thanh toán đủ:';
      if (balanceEl) balanceEl.style.color = 'var(--status-available)';
    } else {
      labelEl.textContent = 'Số tiền còn phải thu:';
      if (balanceEl) balanceEl.style.color = 'var(--status-maintenance)';
    }
  }
}

/**
 * Close Check-out Modal
 */
function closeCheckOutModal() {
  const modal = document.getElementById('checkOutModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.activeBooking = null;
}

/**
 * Handle Check-out Form Submit
 */
async function handleCheckOutSubmit(e) {
  e.preventDefault();
  if (!state.activeBooking) return;

  const surcharge = Number(document.getElementById('inputCheckOutSurcharge')?.value) || 0;
  const paymentMethod = document.getElementById('selectCheckOutPaymentMethod')?.value || 'Tiền mặt';
  const notes = document.getElementById('inputCheckOutNotes')?.value.trim();

  try {
    const updated = await checkinService.processCheckOut(state.activeBooking.id, {
      surcharge,
      paymentMethod,
      notes
    });

    toast.show(`Trả phòng thành công! Phòng ${updated.roomNumber} đã chuyển sang trạng thái Đang dọn dẹp.`, 'success');
    closeCheckOutModal();
    await refreshFrontDesk();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}
