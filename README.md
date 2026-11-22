# Hotel Management System (Aurora Luxury Hotel)

Website quản lý hoạt động nội bộ của khách sạn Aurora Luxury Hotel, phục vụ người quản lý và nhân viên quầy lễ tân để theo dõi phòng, đặt phòng, khách hàng, voucher, check-in/check-out và doanh thu.

---

## 1. Công nghệ sử dụng
- **Ngôn ngữ & Nền tảng:** HTML5, CSS3, JavaScript ES6+ thuần (Native ES6 Modules).
- **Bộ icon:** Lucide Icons (CDN chính thức).
- **Phông chữ:** Google Fonts (`Plus Jakarta Sans`).
- **Kiến trúc:** Service / Repository Pattern tách rời UI và Data Layer, sẵn sàng tích hợp với **Supabase & PostgreSQL** ở giai đoạn sau mà không cần viết lại giao diện.
- **Không dùng:** React, Vue, Angular, Node.js backend hay thư viện bên ngoài nặng.

---

## 2. Hướng dẫn Chạy Dự án (Local Development)

Do dự án sử dụng **Native JavaScript ES6 Modules** (`import` / `export`), trình duyệt yêu cầu các file phải được phục vụ qua giao thức **HTTP/HTTPS** (không mở trực tiếp bằng đường dẫn file cục bộ `file:///...` để tránh lỗi CORS).

### Cách 1: Sử dụng Python HTTP Server (Khuyên dùng)
Nếu máy bạn đã cài Python 3, mở Terminal tại thư mục gốc của dự án (`HotelManager`):
```bash
python -m http.server 3000
```
Sau đó truy cập trình duyệt tại:
```
http://localhost:3000
```

### Cách 2: Sử dụng VS Code Live Server
1. Cài đặt tiện ích mở rộng **Live Server** trên Visual Studio Code.
2. Click chuột phải vào file `index.html`.
3. Chọn **Open with Live Server** (hoặc ấn `Alt + L, Alt + O`).

---

## 3. Cấu trúc Thư mục Dự án

```plaintext
HotelManager/
├── index.html                   # Trang Dashboard tổng quan
├── README.md                    # Tài liệu hướng dẫn & mô tả kiến trúc
│
├── assets/
│   ├── icons/                   # Favicon & icons hệ thống
│   │   └── favicon/
│   └── images/                  # Thư mục chứa hình ảnh
│
├── css/
│   ├── style.css                # CSS Design Tokens, Reset & Typography
│   ├── layout.css               # Bố cục App: Sidebar, Header, Mobile Drawer, Responsive
│   └── components.css           # UI Components: Buttons, Badges, KPI Cards, Tables, Charts
│
├── js/
│   ├── main.js                  # Entry point: Xử lý Mobile menu, Search shortcut, Lucide icons
│   │
│   ├── core/                    # Các tiện ích cốt lõi dùng chung
│   │   ├── utils.js             # Hàm tiện ích format tiền tệ (VND), ngày tháng, escape HTML
│   │   ├── state.js             # In-memory Reactive State Store
│   │   └── toast.js             # Hệ thống thông báo Toast notification
│   │
│   ├── data/
│   │   └── mock-data.js         # Dữ liệu mẫu chuẩn cấu trúc thực thể khách sạn
│   │
│   ├── services/                # Tầng nghiệp vụ xử lý dữ liệu (Sẵn sàng gắn Supabase Client)
│   │   ├── roomService.js       # Thống kê và quản lý phòng
│   │   ├── bookingService.js    # Quản lý đặt phòng và khách lưu trú
│   │   └── reportService.js     # Tổng hợp KPI, doanh thu và dữ liệu biểu đồ
│   │
│   └── pages/                   # Logic riêng của từng trang
│       └── dashboard.js         # Xử lý render KPI, biểu đồ SVG thuần và bảng đặt phòng
│
└── pages/                       # Danh mục các trang con chức năng
    ├── rooms.html               # Quản lý phòng
    ├── bookings.html            # Quản lý đặt phòng
    ├── calendar.html            # Lịch phòng trực quan (Timeline view)
    ├── checkin-checkout.html    # Bàn Lễ tân Check-in & Check-out
    ├── customers.html           # Quản lý khách hàng
    ├── vouchers.html            # Quản lý mã Voucher & Khuyến mãi
    └── reports.html             # Báo cáo thống kê doanh thu
```

---

## 4. Tình trạng Triển khai

| STT | Phân hệ / Tính năng | Trạng thái hiện tại |
| :---: | :--- | :--- |
| **1** | **Khung giao diện nền tảng & Design System** | ✅ Hoàn thành (Biến CSS, Layout, Responsive Desktop / Tablet / Mobile) |
| **2** | **Trang Dashboard Tổng quan (`index.html`)** | ✅ Hoàn thành (6 KPI Cards, Biểu đồ SVG thuần, Bảng đặt phòng gần đây) |
| **3** | **Điều hướng Sidebar 8 mục & Mobile Drawer** | ✅ Hoàn thành (Đầy đủ liên kết, không lỗi 404) |
| **4** | **Kiến trúc dữ liệu & Service Layer** | ✅ Hoàn thành (`js/data/mock-data.js`, `js/services/`, `js/core/`) |
| **5** | **Quản lý phòng (`rooms.html`)** | ✅ Hoàn thành (Lưới thẻ, Bảng dữ liệu, Lọc & Tìm kiếm, Modal Thêm/Sửa, Xóa & Đổi trạng thái nhanh) |
| **6** | **Thương hiệu & Favicon** | ✅ Hoàn thành (Logo Sidebar có ảnh + fallback onerror, đầy đủ thẻ Favicon cho tab trình duyệt) |
| **7** | **Quản lý đặt phòng (`bookings.html`)** | ✅ Hoàn thành (Mini KPI, Lọc & Tìm kiếm, Modal Tạo đặt phòng tính tiền tự động + Voucher, Xem chi tiết, Xác nhận & Hủy đơn) |
| **8** | **Bàn Lễ tân Check-in / Out (`checkin-checkout.html`)** | ✅ Hoàn thành (4 Front Desk KPIs, 3 Tabs nghiệp vụ, 1-touch Check-in, Check-out quyết toán thanh toán & Đồng bộ buồng phòng) |
| **9** | **Lịch phòng trực quan (`calendar.html`)** | ✅ Hoàn thành (Gantt Matrix Timeline, Sticky cột phòng, Thanh booking trực quan, Xem 7/14 ngày, Modal xem nhanh & Đặt phòng nhanh 1 chạm từ ô trống) |
| **10** | **Quản lý khách hàng & Voucher** | ⏳ Khung điều hướng hoàn tất, giao diện chi tiết ở bước tiếp theo |
| **11** | **Báo cáo chi tiết (`reports.html`)** | ⏳ Khung điều hướng hoàn tất, giao diện chi tiết ở Giai đoạn 4 |
| **12** | **Tích hợp Supabase & PostgreSQL** | ⏳ Sẵn sàng kiến trúc, sẽ tích hợp sau khi hoàn thiện frontend thuần |
