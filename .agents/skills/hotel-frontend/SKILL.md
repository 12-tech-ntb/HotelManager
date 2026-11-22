---
name: hotel-frontend
description: "Hướng dẫn tiêu chuẩn phát triển giao diện (UI/UX) và lập trình frontend cho dự án Hotel Management System. Sử dụng khi thiết kế, xây dựng, chỉnh sửa hoặc tối ưu hóa các trang HTML, CSS, JavaScript ES6+ thuần trong dự án."
---

# Hotel Management System - Frontend Development Standards

Bộ hướng dẫn tiêu chuẩn dành cho Agent khi tham gia thiết kế, phát triển và tối ưu hóa giao diện người dùng (UI/UX) cho dự án **Hotel Management System**.

---

## 1. Công nghệ & Nền tảng Kỹ thuật

- **Ngôn ngữ thuần túy**: Chỉ sử dụng **HTML5**, **CSS3** và **JavaScript ES6+** thuần (Native ES6 Modules với `import` / `export`).
- **Nghiêm cấm Framework**: Tuyệt đối **không sử dụng React, Vue, Angular, Svelte** hoặc bất kỳ framework frontend nào khác.
- **Không tự ý thêm Backend**: Không tự ý thêm server Node.js, Express, Python hay backend ngoài phạm vi giai đoạn hiện tại.
- **Không dùng localStorage làm Database**: Không lưu trữ dữ liệu chính thức vào `localStorage`. Tuân thủ mô hình In-Memory State Store (`js/core/state.js`) và tầng Service (`js/services/`) để chuẩn bị tích hợp Supabase & PostgreSQL sau này.

---

## 2. Tiêu chuẩn HTML & Cấu trúc Mã nguồn

- **Semantic HTML**: Viết cấu trúc trang rõ ràng, đúng ngữ nghĩa với `<header>`, `<nav>`, `<aside>`, `<main>`, `<section>`, `<article>`, `<footer>`.
- **Phân tách file rõ ràng**: 
  - Tuyệt đối không viết toàn bộ mã nguồn trong một file duy nhất.
  - Tách biệt rõ ràng: HTML đặt trong thư mục gốc hoặc `pages/`, stylesheet đặt trong `css/`, mã kịch bản đặt trong `js/`.
  - Mỗi trang con chỉ nạp CSS và JS chuyên biệt của trang đó (`css/pages/<page>.css`, `js/pages/<page>.js`), kết hợp với các file dùng chung (`css/style.css`, `css/layout.css`, `css/components.css`, `js/main.js`).
- **Đường dẫn tương đối chính xác**:
  - Tại trang chủ (`index.html`): Đường dẫn tài nguyên trỏ `css/...`, `js/...`, `assets/...`, `pages/...`.
  - Tại các trang con (`pages/*.html`): Đường dẫn phải có tiền tố `../` (ví dụ: `../css/...`, `../js/...`, `../assets/...`, `../index.html`).

---

## 3. Hệ thống CSS & Design Tokens

- **CSS Variables thống nhất**: Mọi màu sắc, phông chữ, khoảng cách, bo góc và đổ bóng phải tham chiếu từ biến toàn cục trong `css/style.css`:
  - **Màu thương hiệu**: `--color-primary` (`#0f172a`), `--color-primary-light` (`#1e293b`), `--color-accent` (`#0d9488`), `--color-accent-light` (`#ccfbf1`).
  - **Trạng thái phòng**:
    - Phòng trống (Available): `--status-available` (`#16a34a`), `--status-available-bg` (`#dcfce7`).
    - Đang sử dụng (Occupied): `--status-occupied` (`#2563eb`), `--status-occupied-bg` (`#dbeafe`).
    - Đang dọn dẹp (Cleaning): `--status-cleaning` (`#d97706`), `--status-cleaning-bg` (`#fef3c7`).
    - Bảo trì (Maintenance): `--status-maintenance` (`#e11d48`), `--status-maintenance-bg` (`#ffe4e6`).
- **Typography & Font**:
  - Sử dụng Google Fonts: phông chữ `Plus Jakarta Sans`.
  - Đảm bảo độ tương phản cao, số liệu tài chính rõ ràng, dễ đọc.
- **Tái sử dụng Component từ `css/components.css`**:
  - Buttons (`.btn`, `.btn-primary`, `.btn-outline`, `.btn-sm`, `.btn-group`).
  - Badges (`.badge`, `.badge-dot`, `.badge-available`, `.badge-occupied`, v.v.).
  - Data Tables (`.table-card`, `.data-table`, `.table-responsive`).
  - Modals (`.modal-backdrop`, `.modal-dialog`, `.modal-header`, `.modal-body`, `.modal-footer`).
  - Forms (`.form-group`, `.form-label`, `.form-control`, `.form-select`, `.form-row`).
  - Toasts (`toast.show(message, type)`).

---

## 4. Trải nghiệm UI/UX & Tính Thẩm mỹ

- **Phong cách Modern Hospitality Dashboard**:
  - Hiện đại, tối giản, chuyên nghiệp và thanh lịch, phù hợp cho quản lý khách sạn cao cấp.
  - Không lạm dụng màu sắc sặc sỡ hoặc hiệu ứng chuyển động không cần thiết.
- **Nhất quán giao diện (UI Consistency)**:
  - Sidebar bên trái với 8 mục chức năng cố định, hiển thị logo `assets/icons/logo.png` kèm fallback an toàn.
  - Header phía trên đồng bộ thanh tìm kiếm, ngày tháng thực tế và thông tin người dùng.
  - Bộ Favicon đầy đủ trên tab trình duyệt cho toàn bộ các trang.
- **Thiết kế Responsive đa thiết bị**:
  - **Desktop (>= 1024px)**: Sidebar cố định (260px), bảng và lưới hiển thị đầy đủ thông tin.
  - **Tablet (768px - 1023px)**: Bố cục tự động co dãn, lưới phòng tự chia cột thích ứng.
  - **Mobile (< 768px)**: Sidebar chuyển thành Drawer có backdrop làm mờ; bảng dữ liệu có thanh cuộn ngang `overflow-x: auto`; nút bấm to rõ, dễ chạm.

---

## 5. Quy chuẩn JavaScript & Kiến trúc Dự án

- **Native ES6 Modules**:
  - Khai báo `<script type="module" src="...">`.
  - Tách logic thành các module độc lập: `core/`, `data/`, `services/`, `pages/`.
- **Sử dụng Lucide Icons**:
  - Dùng thuộc tính `data-lucide="..."`.
  - Gọi `lucide.createIcons()` sau khi nạp DOM hoặc render lại markup mới.
- **Không tự ý thay đổi phạm vi nghiệp vụ**:
  - **Không tự ý thêm chức năng phân quyền nhân viên** (RBAC, vai trò nhân viên).
  - Không tự ý thay đổi schema cơ sở dữ liệu đã thống nhất trong `js/data/mock-data.js`.
