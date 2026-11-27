/**
 * HOTEL MANAGEMENT SYSTEM - DASHBOARD PAGE CONTROLLER
 * Renders the 6 KPI cards, Pure SVG Room Occupancy Donut, Pure SVG Weekly Revenue Bar Chart,
 * and Recent Bookings table.
 */

import { reportService } from '../services/reportService.js';
import { bookingService } from '../services/bookingService.js';
import { formatCurrency, formatDate, getBookingStatusBadge, getInitials, escapeHTML, onReady } from '../core/utils.js';
import { subscribeHotelRealtime } from '../core/realtime.js';
import { initLucideIcons } from '../main.js';

onReady(async () => {
  try {
    await renderDashboard();
    subscribeHotelRealtime({
      tables: ['rooms', 'bookings'],
      onAnyChange: () => renderDashboard()
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
  }
});

/**
 * Main dashboard coordinator
 */
async function renderDashboard() {
  await Promise.all([
    renderKPICards(),
    renderRoomDonutChart(),
    renderRevenueBarChart(),
    renderRecentBookings()
  ]);

  // Refresh lucide icons for newly injected markup
  initLucideIcons();
}

/**
 * Render the 6 KPI metric cards
 */
async function renderKPICards() {
  const kpis = await reportService.getDashboardKPIs();

  // 1. Tổng số phòng
  const elTotal = document.getElementById('kpiTotalRooms');
  if (elTotal) elTotal.textContent = kpis.totalRooms;

  // 2. Phòng đang trống
  const elAvail = document.getElementById('kpiAvailableRooms');
  if (elAvail) elAvail.textContent = kpis.availableRooms;

  // 3. Phòng đang sử dụng
  const elOccupied = document.getElementById('kpiOccupiedRooms');
  if (elOccupied) elOccupied.textContent = kpis.occupiedRooms;

  // 4. Phòng đang bảo trì
  const elMaint = document.getElementById('kpiMaintenanceRooms');
  if (elMaint) elMaint.textContent = kpis.maintenanceRooms;

  // 5. Đặt phòng hôm nay
  const elToday = document.getElementById('kpiTodayBookings');
  if (elToday) elToday.textContent = kpis.todayBookings;

  // 6. Doanh thu tháng
  const elRev = document.getElementById('kpiMonthlyRevenue');
  if (elRev) elRev.textContent = formatCurrency(kpis.monthlyRevenue);

  // Growth percentage
  const elGrowth = document.getElementById('kpiRevenueGrowth');
  if (elGrowth) elGrowth.textContent = `+${kpis.revenueGrowth}%`;
}

/**
 * Render Pure SVG Room Status Donut Chart
 */
async function renderRoomDonutChart() {
  const container = document.getElementById('roomDonutChartContainer');
  const legendList = document.getElementById('roomDonutLegend');
  if (!container || !legendList) return;

  const distribution = await reportService.getRoomStatusDistribution();
  const total = distribution.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    container.innerHTML = '<p class="text-muted text-center">Chưa có dữ liệu phòng</p>';
    return;
  }

  // SVG Donut calculation
  const size = 160;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  let circlesHTML = '';

  distribution.forEach(item => {
    if (item.count === 0) return;
    const ratio = item.count / total;
    const dashLength = ratio * circumference;
    const dashOffset = -currentOffset;

    circlesHTML += `
      <circle 
        cx="${size / 2}" 
        cy="${size / 2}" 
        r="${radius}" 
        fill="transparent" 
        stroke="${item.color}" 
        stroke-width="${strokeWidth}" 
        stroke-dasharray="${dashLength} ${circumference - dashLength}" 
        stroke-dashoffset="${dashOffset}"
        stroke-linecap="round"
        style="transition: all 0.5s ease;"
      />
    `;

    currentOffset += dashLength;
  });

  const occupancyRate = Math.round((distribution.find(d => d.status === 'occupied')?.count || 0) / total * 100);

  container.innerHTML = `
    <div class="donut-svg-container">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
        <!-- Background track -->
        <circle 
          cx="${size / 2}" 
          cy="${size / 2}" 
          r="${radius}" 
          fill="transparent" 
          stroke="#f1f5f9" 
          stroke-width="${strokeWidth}"
        />
        ${circlesHTML}
      </svg>
      <div class="donut-center-text">
        <div class="donut-center-value">${occupancyRate}%</div>
        <div class="donut-center-label">Lấp đầy</div>
      </div>
    </div>
  `;

  // Render Legend
  legendList.innerHTML = distribution.map(item => `
    <div class="donut-legend-item">
      <div class="legend-info">
        <span class="legend-color-dot" style="background-color: ${item.color};"></span>
        <span>${escapeHTML(item.label)}</span>
      </div>
      <span class="legend-count">${item.count} phòng</span>
    </div>
  `).join('');
}

/**
 * Render Pure SVG Weekly Revenue Bar Chart (No external charting library needed)
 */
async function renderRevenueBarChart() {
  const container = document.getElementById('revenueBarChartContainer');
  if (!container) return;

  const weeklyData = await reportService.getWeeklyRevenue();
  if (!weeklyData || weeklyData.length === 0) return;

  const maxAmount = Math.max(...weeklyData.map(d => d.amount));
  const svgWidth = 650;
  const svgHeight = 220;
  const paddingBottom = 35;
  const paddingTop = 25;
  const paddingLeft = 10;
  const paddingRight = 10;
  const chartHeight = svgHeight - paddingBottom - paddingTop;
  const availableWidth = svgWidth - paddingLeft - paddingRight;

  const barWidth = 42;
  const spacing = (availableWidth - (weeklyData.length * barWidth)) / (weeklyData.length - 1);

  let barsHTML = '';
  let gridHTML = '';

  // 3 horizontal guide lines
  for (let i = 1; i <= 3; i++) {
    const y = paddingTop + (chartHeight * (i / 3));
    gridHTML += `
      <line x1="${paddingLeft}" y1="${y}" x2="${svgWidth - paddingRight}" y2="${y}" class="chart-grid-line" />
    `;
  }

  weeklyData.forEach((item, index) => {
    const x = paddingLeft + index * (barWidth + spacing);
    const barHeight = Math.max(8, (item.amount / maxAmount) * chartHeight);
    const y = paddingTop + chartHeight - barHeight;
    const formattedVal = (item.amount / 1000000).toFixed(1) + ' tr';

    barsHTML += `
      <g class="bar-group">
        <title>${item.day} (${item.date}): ${formatCurrency(item.amount)}</title>
        <!-- Bar Rect -->
        <rect 
          x="${x}" 
          y="${y}" 
          width="${barWidth}" 
          height="${barHeight}" 
          class="chart-bar"
        />
        <!-- Top Amount Label -->
        <text 
          x="${x + barWidth / 2}" 
          y="${y - 8}" 
          class="chart-label font-semibold"
          style="font-size: 10.5px; fill: #475569;"
        >
          ${formattedVal}
        </text>
        <!-- Bottom Day Label -->
        <text 
          x="${x + barWidth / 2}" 
          y="${svgHeight - 12}" 
          class="chart-label font-semibold"
        >
          ${item.day}
        </text>
      </g>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="chart-svg" preserveAspectRatio="xMidYMid meet">
      ${gridHTML}
      ${barsHTML}
    </svg>
  `;
}

/**
 * Render Recent Bookings Table
 */
async function renderRecentBookings() {
  const tbody = document.getElementById('recentBookingsTbody');
  if (!tbody) return;

  const bookings = await bookingService.getRecentBookings(6);

  if (!bookings || bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty-state">
          <i data-lucide="calendar-x" style="width: 32px; height: 32px;"></i>
          <span>Chưa có đặt phòng nào gần đây</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const initials = getInitials(b.customerName);
    const statusBadge = getBookingStatusBadge(b.status);
    const formattedAmount = formatCurrency(b.totalAmount);
    const inDate = formatDate(b.checkInDate);
    const outDate = formatDate(b.checkOutDate);

    return `
      <tr>
        <td class="font-semibold text-secondary">
          <code>${escapeHTML(b.id)}</code>
        </td>
        <td>
          <div class="customer-cell">
            <div class="customer-avatar">${initials}</div>
            <div class="customer-meta">
              <span class="customer-name">${escapeHTML(b.customerName)}</span>
              <span class="customer-phone">${escapeHTML(b.customerPhone)}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="room-badge">
            <i data-lucide="door-closed" style="width: 14px; height: 14px;"></i>
            P.${escapeHTML(b.roomNumber)}
          </span>
          <div class="text-muted" style="font-size: 0.75rem; margin-top: 0.2rem;">
            ${escapeHTML(b.roomType)}
          </div>
        </td>
        <td>
          <div style="font-size: 0.813rem; font-weight: 500;">
            ${inDate} &rarr; ${outDate}
          </div>
        </td>
        <td class="font-bold" style="color: var(--color-primary);">
          ${formattedAmount}
        </td>
        <td>
          ${statusBadge}
        </td>
        <td class="text-right">
          <a href="pages/bookings.html" class="btn btn-outline btn-sm" title="Xem chi tiết đơn đặt phòng">
            <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
            Chi tiết
          </a>
        </td>
      </tr>
    `;
  }).join('');
}
