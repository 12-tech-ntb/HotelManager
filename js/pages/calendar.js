/**
 * HOTEL MANAGEMENT SYSTEM - ROOM CALENDAR / TIMELINE CONTROLLER
 * Full Gantt-style matrix, date navigation, 7/14 day views, booking bars, detail & quick-booking modals
 */

import { roomService } from '../services/roomService.js';
import { bookingService } from '../services/bookingService.js';
import { formatCurrency, formatDate, calculateNights, getBookingStatusBadge, getPaymentStatusBadge, escapeHTML } from '../core/utils.js';
import { toast } from '../core/toast.js';
import { initLucideIcons } from '../main.js';

// Calendar Page State
const state = {
  startDate: "2026-11-20", // Default window framed around active bookings
  daysCount: 7,            // 7 or 14
  filterRoomType: "all",
  filterFloor: "all",
  allRooms: [],
  allBookings: [],
  activeBookingDetail: null,
  quickBookTarget: null    // { room, checkInDate }
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    initControls();
    await loadCalendarData();
  } catch (err) {
    console.error('Error initializing room calendar:', err);
  }
});

/**
 * Initialize event listeners & interactive controls
 */
function initControls() {
  // Navigation: Prev / Next / Today
  const btnPrev = document.getElementById('btnCalPrev');
  const btnNext = document.getElementById('btnCalNext');
  const btnToday = document.getElementById('btnCalToday');

  if (btnPrev) {
    btnPrev.addEventListener('click', () => shiftDays(-state.daysCount));
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => shiftDays(state.daysCount));
  }
  if (btnToday) {
    btnToday.addEventListener('click', () => {
      state.startDate = "2026-11-20"; // Reset to active operational frame
      renderTimeline();
    });
  }

  // View Mode: 7 Days vs 14 Days
  const btn7 = document.getElementById('btnView7Days');
  const btn14 = document.getElementById('btnView14Days');

  if (btn7 && btn14) {
    btn7.addEventListener('click', () => {
      state.daysCount = 7;
      btn7.classList.add('active');
      btn14.classList.remove('active');
      renderTimeline();
    });

    btn14.addEventListener('click', () => {
      state.daysCount = 14;
      btn14.classList.add('active');
      btn7.classList.remove('active');
      renderTimeline();
    });
  }

  // Filters: Room Type & Floor
  const typeFilter = document.getElementById('filterCalRoomType');
  const floorFilter = document.getElementById('filterCalFloor');

  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      state.filterRoomType = e.target.value;
      renderTimeline();
    });
  }

  if (floorFilter) {
    floorFilter.addEventListener('change', (e) => {
      state.filterFloor = e.target.value;
      renderTimeline();
    });
  }

  // Quick Detail Modal Close
  const detailClose = document.getElementById('calDetailCloseBtn');
  const detailDismiss = document.getElementById('calDetailDismissBtn');
  const detailBackdrop = document.getElementById('calendarBookingDetailModal');

  [detailClose, detailDismiss].forEach(btn => {
    if (btn) btn.addEventListener('click', closeDetailModal);
  });

  if (detailBackdrop) {
    detailBackdrop.addEventListener('click', (e) => {
      if (e.target === detailBackdrop) closeDetailModal();
    });
  }

  // Quick Booking Modal Close & Form
  const quickBookClose = document.getElementById('quickBookModalClose');
  const quickBookCancel = document.getElementById('quickBookModalCancel');
  const quickBookBackdrop = document.getElementById('calendarQuickBookModal');
  const quickBookForm = document.getElementById('quickBookForm');

  [quickBookClose, quickBookCancel].forEach(btn => {
    if (btn) btn.addEventListener('click', closeQuickBookModal);
  });

  if (quickBookBackdrop) {
    quickBookBackdrop.addEventListener('click', (e) => {
      if (e.target === quickBookBackdrop) closeQuickBookModal();
    });
  }

  if (quickBookForm) {
    quickBookForm.addEventListener('submit', handleQuickBookSubmit);
  }

  // Date inputs change in Quick Book Modal -> recalculate total
  const qCheckIn = document.getElementById('quickBookCheckIn');
  const qCheckOut = document.getElementById('quickBookCheckOut');

  [qCheckIn, qCheckOut].forEach(inp => {
    if (inp) {
      inp.addEventListener('change', updateQuickBookCalculation);
    }
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailModal();
      closeQuickBookModal();
    }
  });
}

/**
 * Shift timeline by number of days (positive for next, negative for prev)
 */
function shiftDays(offset) {
  const cur = new Date(state.startDate);
  cur.setDate(cur.getDate() + offset);
  state.startDate = cur.toISOString().split('T')[0];
  renderTimeline();
}

/**
 * Load initial rooms and bookings from services
 */
async function loadCalendarData() {
  const [rooms, bookings] = await Promise.all([
    roomService.getAllRooms(),
    bookingService.getAllBookings()
  ]);

  state.allRooms = rooms;
  state.allBookings = bookings;

  await populateFloorFilter();
  renderTimeline();
}

/**
 * Dynamically populate floor options based on existing rooms
 */
async function populateFloorFilter() {
  const floorSelect = document.getElementById('filterCalFloor');
  if (!floorSelect) return;
  const floors = await roomService.getAllFloors();
  const currentVal = state.filterFloor;
  let html = `<option value="all">Tất cả các tầng</option>`;
  floors.forEach(f => {
    html += `<option value="${f}" ${String(currentVal) === String(f) ? 'selected' : ''}>Tầng ${f}</option>`;
  });
  floorSelect.innerHTML = html;
}

/**
 * Generate date window array based on startDate and daysCount
 */
function getDateWindow() {
  const windowDays = [];
  const start = new Date(state.startDate);
  const todayStr = "2026-11-21"; // Operational hotel today

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  for (let i = 0; i < state.daysCount; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    windowDays.push({
      dateStr,
      dayName: dayNames[d.getDay()],
      dayNumber: `${day}/${month}`,
      isToday: dateStr === todayStr
    });
  }

  return windowDays;
}

/**
 * Main Render Coordinator for Gantt Timeline Matrix
 */
function renderTimeline() {
  const windowDays = getDateWindow();

  // 1. Update Period Display Title
  const startObj = windowDays[0];
  const endObj = windowDays[windowDays.length - 1];
  const displayTitle = document.getElementById('calendarPeriodDisplay');
  if (displayTitle) {
    displayTitle.textContent = `${startObj.dayNumber} - ${endObj.dayNumber}/${new Date(state.startDate).getFullYear()}`;
  }

  // 2. Filter Rooms
  let filteredRooms = [...state.allRooms];
  if (state.filterRoomType && state.filterRoomType !== 'all') {
    filteredRooms = filteredRooms.filter(r => r.type === state.filterRoomType);
  }
  if (state.filterFloor && state.filterFloor !== 'all') {
    filteredRooms = filteredRooms.filter(r => String(r.floor) === String(state.filterFloor));
  }

  // Count display
  const countEl = document.getElementById('calRoomsCountDisplay');
  if (countEl) {
    countEl.innerHTML = `Hiển thị <strong>${filteredRooms.length}</strong> / ${state.allRooms.length} phòng`;
  }

  // 3. Render Header Row
  renderHeaderRow(windowDays);

  // 4. Render Table Body (Room rows + Booking bars)
  renderMatrixBody(filteredRooms, windowDays);

  initLucideIcons();
}

/**
 * Render Header Row (Sticky Room Th + Day Ths)
 */
function renderHeaderRow(windowDays) {
  const headerRow = document.getElementById('timelineHeaderRow');
  if (!headerRow) return;

  let html = `
    <th class="timeline-header-cell sticky-header timeline-col-room">
      <div style="font-size: 0.813rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
        Phòng nghỉ & Tầng
      </div>
    </th>
  `;

  windowDays.forEach(d => {
    html += `
      <th class="timeline-header-cell ${d.isToday ? 'is-today' : ''}">
        <div class="header-day-name">${d.dayName}</div>
        <div class="header-day-number">${d.dayNumber}</div>
        ${d.isToday ? `<span class="today-chip">Hôm nay</span>` : ''}
      </th>
    `;
  });

  headerRow.innerHTML = html;
}

/**
 * Render Matrix Rows (Room info + Days track + Booking bars)
 */
function renderMatrixBody(rooms, windowDays) {
  const tbody = document.getElementById('timelineTbody');
  if (!tbody) return;

  if (rooms.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${windowDays.length + 1}" class="table-empty-state" style="padding: 3rem;">
          <i data-lucide="filter-x" style="width: 40px; height: 40px; color: var(--text-muted);"></i>
          <span style="font-weight: 600;">Không có phòng nào khớp với bộ lọc hiện tại</span>
        </td>
      </tr>
    `;
    return;
  }

  const windowStartDate = windowDays[0].dateStr;
  const windowEndDate = windowDays[windowDays.length - 1].dateStr;

  tbody.innerHTML = rooms.map(room => {
    const isMaintenance = room.status === 'maintenance';

    // 1. Sticky Room cell
    let statusColor = 'var(--status-available)';
    if (room.status === 'occupied') statusColor = 'var(--status-occupied)';
    if (room.status === 'cleaning') statusColor = 'var(--status-cleaning)';
    if (room.status === 'maintenance') statusColor = 'var(--status-maintenance)';

    const roomCellHTML = `
      <td class="timeline-col-room room-matrix-cell">
        <div class="room-matrix-info">
          <div class="room-matrix-number">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor};"></span>
            Phòng ${escapeHTML(room.roomNumber)}
          </div>
          <div class="room-matrix-type">${escapeHTML(room.type)}</div>
        </div>
        <span class="floor-chip" style="font-size: 0.68rem; padding: 0.15rem 0.45rem; background: var(--bg-surface-subtle); color: var(--text-secondary); border: 1px solid var(--border-color);">
          T.${escapeHTML(room.floor)}
        </span>
      </td>
    `;

    // 2. Day slots grid for empty cell clicking
    let daySlotsHTML = '';
    windowDays.forEach(d => {
      daySlotsHTML += `
        <div 
          class="day-slot ${d.isToday ? 'is-today' : ''}" 
          data-room-id="${escapeHTML(room.id)}" 
          data-date="${escapeHTML(d.dateStr)}"
          title="Nhấp để đặt nhanh Phòng ${escapeHTML(room.roomNumber)} ngày ${escapeHTML(d.dateStr)}"
        ></div>
      `;
    });

    // 3. Find and compute overlapping booking bars for this room
    let bookingBarsHTML = '';

    if (!isMaintenance) {
      const roomBookings = state.allBookings.filter(b => 
        b.roomId === room.id && 
        b.status !== 'cancelled' &&
        b.checkInDate <= windowEndDate &&
        b.checkOutDate >= windowStartDate
      );

      roomBookings.forEach(b => {
        // Compute column offset and span
        // Day 0 corresponds to windowStartDate
        const startDiff = calculateDayDifference(windowStartDate, b.checkInDate);
        const endDiff = calculateDayDifference(windowStartDate, b.checkOutDate);

        // Clamp to window: [0, state.daysCount]
        const colStart = Math.max(0, startDiff);
        const colEnd = Math.min(state.daysCount, endDiff);

        if (colEnd > colStart) {
          const leftPercent = (colStart / state.daysCount) * 100;
          const widthPercent = ((colEnd - colStart) / state.daysCount) * 100;
          const nights = b.nights || calculateNights(b.checkInDate, b.checkOutDate) || 1;

          let statusClass = 'confirmed';
          if (b.status === 'checked_in') statusClass = 'checked_in';
          if (b.status === 'pending') statusClass = 'pending';

          bookingBarsHTML += `
            <div 
              class="booking-bar ${statusClass}" 
              data-booking-id="${escapeHTML(b.id)}"
              style="left: calc(${leftPercent}% + 2px); width: calc(${widthPercent}% - 4px);"
              title="Đơn ${escapeHTML(b.id)}: ${escapeHTML(b.customerName)} (${formatDate(b.checkInDate)} - ${formatDate(b.checkOutDate)})"
            >
              <div class="booking-bar-guest">
                <i data-lucide="user" style="width: 12px; height: 12px; flex-shrink: 0;"></i>
                <span>${escapeHTML(b.customerName)}</span>
              </div>
              <span class="booking-bar-nights">${nights}đ</span>
            </div>
          `;
        }
      });
    }

    // Maintenance overlay banner
    const maintenanceOverlayHTML = isMaintenance ? `
      <div class="maintenance-overlay-banner">
        <i data-lucide="wrench" style="width: 14px; height: 14px;"></i>
        <span>Phòng đang bảo trì sửa chữa</span>
      </div>
    ` : '';

    return `
      <tr class="matrix-row">
        ${roomCellHTML}
        <td class="timeline-days-wrapper ${isMaintenance ? 'is-maintenance' : ''}" colspan="${windowDays.length}">
          <div class="day-slots-grid" style="grid-template-columns: repeat(${windowDays.length}, 1fr);">
            ${daySlotsHTML}
          </div>
          <div class="booking-bars-layer">
            ${bookingBarsHTML}
          </div>
          ${maintenanceOverlayHTML}
        </td>
      </tr>
    `;
  }).join('');

  bindTimelineInteractions(tbody);
}

/**
 * Calculate difference in days between two ISO date strings (target - base)
 */
function calculateDayDifference(baseDateStr, targetDateStr) {
  const base = new Date(baseDateStr);
  const target = new Date(targetDateStr);
  const diffTime = target.getTime() - base.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Bind Click handlers for Booking Bars & Empty Day Slots
 */
function bindTimelineInteractions(tbody) {
  // 1. Click on Booking Bar -> Open Quick Detail Modal
  const bars = tbody.querySelectorAll('.booking-bar');
  bars.forEach(bar => {
    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookingId = bar.dataset.bookingId;
      const booking = state.allBookings.find(b => b.id === bookingId);
      if (booking) openDetailModal(booking);
    });
  });

  // 2. Click on Day Slot -> Open Quick Booking Modal
  const slots = tbody.querySelectorAll('.day-slot');
  slots.forEach(slot => {
    slot.addEventListener('click', () => {
      const roomId = slot.dataset.roomId;
      const dateStr = slot.dataset.date;
      const room = state.allRooms.find(r => r.id === roomId);

      if (room) {
        if (room.status === 'maintenance') {
          toast.show(`Phòng ${room.roomNumber} đang bảo trì, không thể tạo đặt phòng!`, 'warning');
          return;
        }
        openQuickBookModal(room, dateStr);
      }
    });
  });
}

/**
 * Open Quick Booking Detail Modal
 */
function openDetailModal(booking) {
  state.activeBookingDetail = booking;
  const modal = document.getElementById('calendarBookingDetailModal');
  if (!modal) return;

  const nights = booking.nights || calculateNights(booking.checkInDate, booking.checkOutDate) || 1;

  document.getElementById('calDetailBookingId').textContent = `Đơn đặt phòng ${booking.id}`;
  document.getElementById('calDetailCreatedAt').textContent = `Khởi tạo: ${booking.createdAt || 'N/A'}`;
  
  const statusCont = document.getElementById('calDetailStatusBadge');
  if (statusCont) statusCont.innerHTML = getBookingStatusBadge(booking.status);

  document.getElementById('calDetailCustName').textContent = booking.customerName;
  document.getElementById('calDetailCustPhone').textContent = booking.customerPhone;
  document.getElementById('calDetailRoom').textContent = `Phòng ${booking.roomNumber} (${booking.roomType})`;
  document.getElementById('calDetailDates').textContent = `${formatDate(booking.checkInDate)} \u2192 ${formatDate(booking.checkOutDate)} (${nights} đêm)`;
  document.getElementById('calDetailPayment').innerHTML = getPaymentStatusBadge(booking.paymentStatus);
  document.getElementById('calDetailTotal').textContent = formatCurrency(booking.totalAmount);

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Close Quick Detail Modal
 */
function closeDetailModal() {
  const modal = document.getElementById('calendarBookingDetailModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.activeBookingDetail = null;
}

/**
 * Open Quick Booking Modal with pre-filled room and check-in date
 */
function openQuickBookModal(room, checkInDateStr) {
  state.quickBookTarget = { room, checkInDate: checkInDateStr };
  const modal = document.getElementById('calendarQuickBookModal');
  const form = document.getElementById('quickBookForm');
  if (!modal || !form) return;

  form.reset();

  // Pre-fill room details
  document.getElementById('quickBookRoomTitle').textContent = `Phòng ${room.roomNumber}`;
  document.getElementById('quickBookRoomSub').textContent = `${room.type} - Tầng ${room.floor} (Sức chứa: ${room.capacity} khách)`;
  document.getElementById('quickBookRoomPrice').textContent = `${formatCurrency(room.price)}/đêm`;

  // Pre-fill dates: CheckIn = selected date, CheckOut = next day
  const inDate = new Date(checkInDateStr);
  const outDate = new Date(inDate);
  outDate.setDate(inDate.getDate() + 1);

  const checkOutDateStr = outDate.toISOString().split('T')[0];

  document.getElementById('quickBookCheckIn').value = checkInDateStr;
  document.getElementById('quickBookCheckOut').value = checkOutDateStr;

  updateQuickBookCalculation();

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  initLucideIcons();
}

/**
 * Update Quick Booking calculation in modal
 */
function updateQuickBookCalculation() {
  if (!state.quickBookTarget) return;

  const inVal = document.getElementById('quickBookCheckIn')?.value;
  const outVal = document.getElementById('quickBookCheckOut')?.value;
  const nights = calculateNights(inVal, outVal);

  const nightsText = document.getElementById('quickBookNightsText');
  const totalAmountEl = document.getElementById('quickBookCalculatedTotal');

  if (nights <= 0) {
    if (nightsText) nightsText.textContent = 'Ngày trả phòng phải sau ngày nhận ít nhất 1 đêm!';
    if (totalAmountEl) totalAmountEl.textContent = '0 ₫';
    return;
  }

  if (nightsText) {
    nightsText.textContent = `Thời gian lưu trú: ${nights} đêm (${formatDate(inVal)} \u2192 ${formatDate(outVal)})`;
  }

  const room = state.quickBookTarget.room;
  const total = room.price * nights;

  if (totalAmountEl) totalAmountEl.textContent = formatCurrency(total);
}

/**
 * Close Quick Booking Modal
 */
function closeQuickBookModal() {
  const modal = document.getElementById('calendarQuickBookModal');
  if (modal) modal.classList.remove('active');
  document.body.style.overflow = '';
  state.quickBookTarget = null;
}

/**
 * Handle Quick Booking Submit
 */
async function handleQuickBookSubmit(e) {
  e.preventDefault();
  if (!state.quickBookTarget) return;

  const room = state.quickBookTarget.room;
  const checkIn = document.getElementById('quickBookCheckIn').value;
  const checkOut = document.getElementById('quickBookCheckOut').value;
  const custName = document.getElementById('quickBookCustName').value.trim();
  const custPhone = document.getElementById('quickBookCustPhone').value.trim();
  const paymentStatus = document.getElementById('quickBookPaymentStatus').value;
  const initialStatus = document.getElementById('quickBookInitialStatus').value;

  const nights = calculateNights(checkIn, checkOut);
  if (nights <= 0) {
    toast.show('Ngày trả phòng phải sau ngày nhận phòng!', 'warning');
    return;
  }

  if (!custName || !custPhone) {
    toast.show('Vui lòng nhập tên và số điện thoại của khách!', 'warning');
    return;
  }

  const totalAmount = room.price * nights;

  const bookingPayload = {
    customerName: custName,
    customerPhone: custPhone,
    roomId: room.id,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    nights,
    totalAmount,
    status: initialStatus,
    paymentStatus
  };

  try {
    const created = await bookingService.createBooking(bookingPayload);
    toast.show(`Đặt phòng thành công! Mã đơn: ${created.id}`, 'success');
    closeQuickBookModal();
    // Refresh calendar data
    await loadCalendarData();
  } catch (err) {
    toast.show(err.message, 'error');
  }
}
