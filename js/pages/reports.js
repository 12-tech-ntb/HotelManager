/**
 * HOTEL MANAGEMENT SYSTEM - REPORTS PAGE CONTROLLER
 * Renders live KPIs, Room-type Revenue Breakdown, Status Ratio & Detailed Ledger from Supabase
 */

import { reportService } from '../services/reportService.js';
import {
  formatCurrency,
  formatDate,
  getBookingStatusBadge,
  getPaymentStatusBadge,
  escapeHTML,
  onReady
} from '../core/utils.js';
import { toast } from '../core/toast.js';
import { initLucideIcons } from '../main.js';

const state = {
  period: 'month',
  currentReport: null
};

onReady(async () => {
  try {
    initElements();
    await loadReport();
  } catch (err) {
    console.error('[reports.js] Lỗi khởi tạo trang Báo cáo:', err);
    toast.show('Không thể tải trang báo cáo: ' + err.message, 'error');
  }
});

function initElements() {
  const group = document.getElementById('reportPeriodGroup');
  if (group) {
    group.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const nextPeriod = btn.getAttribute('data-period');
        if (!nextPeriod || nextPeriod === state.period) return;

        group.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.period = nextPeriod;
        await loadReport();
      });
    });
  }

  document.getElementById('btnExportReportCsv')?.addEventListener('click', handleExportCSV);
}

async function loadReport() {
  const rangeLabel = document.getElementById('reportRangeLabel');
  if (rangeLabel) rangeLabel.textContent = 'Đang tải dữ liệu...';

  const report = await reportService.getDetailedReport(state.period);
  state.currentReport = report;

  if (rangeLabel) {
    if (report.startDate && report.endDate) {
      rangeLabel.textContent = `Kỳ: ${formatDate(report.startDate)} → ${formatDate(report.endDate)}`;
    } else {
      rangeLabel.textContent = 'Kỳ: Toàn bộ thời gian';
    }
  }

  renderKPIs(report.kpis);
  renderRoomTypeRevenue(report.revenueByRoomType);
  renderStatusBreakdown(report.bookingStatusBreakdown, report.detailedBookings.length);
  renderLedgerTable(report.detailedBookings);
  initLucideIcons();
}

function renderKPIs(kpis) {
  document.getElementById('repTotalRevenue').textContent = formatCurrency(kpis.totalRevenue);
  document.getElementById('repValidBookingsSub').textContent = `Từ ${kpis.validBookingsCount} đơn đặt hợp lệ`;
  document.getElementById('repAvgOccupancy').textContent = `${kpis.avgOccupancyRate}%`;
  document.getElementById('repNightsSoldSub').textContent = `${kpis.totalNightsSold} đêm phòng đã bán (${kpis.totalRooms} phòng)`;
  document.getElementById('repAdr').textContent = formatCurrency(kpis.adr);
  document.getElementById('repCompletedBookings').textContent = kpis.completedBookings;
  document.getElementById('repCustomersSub').textContent = `Hệ thống có ${kpis.totalCustomers} khách hàng`;

  // Update Circular SVG Progress Ring
  const ringEl = document.getElementById('repOccupancyRingProgress');
  if (ringEl) {
    const circumference = 2 * Math.PI * 22; // r = 22 -> ~138.23
    const pct = Math.max(0, Math.min(100, Number(kpis.avgOccupancyRate) || 0));
    ringEl.style.strokeDasharray = `${circumference}`;
    ringEl.style.strokeDashoffset = `${circumference - (pct / 100) * circumference}`;
  }
}

function renderRoomTypeRevenue(items) {
  const container = document.getElementById('roomTypeRevenueContainer');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="text-muted">Chưa có dữ liệu doanh thu theo loại phòng trong kỳ này.</p>';
    return;
  }

  const maxRev = Math.max(...items.map(i => i.revenue), 1);

  container.innerHTML = items.map(item => {
    const widthPct = item.revenue > 0 ? Math.max(4, Math.round((item.revenue / maxRev) * 100)) : 0;
    return `
      <div class="room-type-bar-item">
        <div class="room-type-bar-meta">
          <span class="room-type-bar-name">${escapeHTML(item.roomType)}</span>
          <span class="room-type-bar-amount">${formatCurrency(item.revenue)}</span>
        </div>
        <div class="room-type-bar-track">
          <div class="room-type-bar-fill" style="width: ${widthPct}%;"></div>
        </div>
        <div class="room-type-bar-sub">${item.bookingsCount} đơn đặt &bull; ${item.nightsCount} đêm</div>
      </div>
    `;
  }).join('');
}

function renderStatusBreakdown(items, totalOrders) {
  const container = document.getElementById('statusBreakdownContainer');
  const badge = document.getElementById('repTotalOrdersBadge');
  if (badge) badge.textContent = `${totalOrders} đơn`;
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="status-breakdown-row">
      <div class="status-breakdown-left">
        <span class="status-dot" style="background-color: ${item.color};"></span>
        <span>${escapeHTML(item.label)}</span>
      </div>
      <div class="status-breakdown-right">
        ${item.count} đơn (${item.percent}%)
      </div>
    </div>
  `).join('');
}

function renderLedgerTable(bookings) {
  const tbody = document.getElementById('reportLedgerTbody');
  const countLabel = document.getElementById('reportLedgerCount');
  if (countLabel) countLabel.textContent = `${bookings.length} bản ghi`;
  if (!tbody) return;

  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty-state">
          <i data-lucide="file-spreadsheet" style="width: 32px; height: 32px;"></i>
          <span>Không có giao dịch đặt phòng nào trong kỳ báo cáo đã chọn.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const netAmount = b.finalTotal !== null && b.finalTotal !== undefined ? b.finalTotal : b.totalAmount;
    const discountStr = b.discountAmount > 0 ? `-${formatCurrency(b.discountAmount)}` : '0 ₫';
    const surchargeStr = b.surcharge > 0 ? `+${formatCurrency(b.surcharge)}` : '0 ₫';

    return `
      <tr>
        <td><code>${escapeHTML(b.id)}</code></td>
        <td>
          <div style="font-weight: 600; color: var(--text-main);">${escapeHTML(b.customerName)}</div>
          <div class="text-muted" style="font-size: 0.78rem;">${escapeHTML(b.customerPhone)}</div>
        </td>
        <td>
          <span class="room-badge">P.${escapeHTML(b.roomNumber)}</span>
          <div class="text-muted" style="font-size: 0.75rem;">${escapeHTML(b.roomType)}</div>
        </td>
        <td style="font-size: 0.82rem;">
          <div>${formatDate(b.checkInDate)} &rarr; ${formatDate(b.checkOutDate)}</div>
          <div class="text-muted">${b.nights} đêm</div>
        </td>
        <td style="font-size: 0.8rem;">
          <div style="color: var(--status-available);">Giảm: ${discountStr}</div>
          <div style="color: var(--status-cleaning);">Phụ phí: ${surchargeStr}</div>
        </td>
        <td class="font-bold" style="color: var(--color-primary);">
          ${formatCurrency(netAmount)}
        </td>
        <td>${getPaymentStatusBadge(b.paymentStatus)}</td>
        <td>${getBookingStatusBadge(b.status)}</td>
      </tr>
    `;
  }).join('');
}

function handleExportCSV() {
  const bookings = state.currentReport?.detailedBookings || [];
  if (bookings.length === 0) {
    toast.show('Không có dữ liệu để xuất CSV trong kỳ này.', 'warning');
    return;
  }

  const headers = ['MaDon', 'KhachHang', 'SDT', 'Phong', 'LoaiPhong', 'NhanPhong', 'TraPhong', 'SoDem', 'GiamGia', 'PhuPhi', 'ThucThu', 'TrangThaiDon', 'ThanhToan'];
  const rows = bookings.map(b => {
    const netAmount = b.finalTotal !== null && b.finalTotal !== undefined ? b.finalTotal : b.totalAmount;
    return [
      b.id,
      `"${(b.customerName || '').replace(/"/g, '""')}"`,
      b.customerPhone,
      b.roomNumber,
      `"${(b.roomType || '').replace(/"/g, '""')}"`,
      b.checkInDate,
      b.checkOutDate,
      b.nights,
      b.discountAmount,
      b.surcharge,
      netAmount,
      b.status,
      b.paymentStatus
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bao-cao-doanh-thu-${state.period}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.show('Đã xuất file bảng kê CSV thành công!', 'success');
}
