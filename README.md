# Hotel Management System (Aurora Luxury Hotel)

Hệ thống quản lý vận hành khách sạn nội bộ cho **Aurora Luxury Hotel**, xây dựng bằng **HTML5, CSS3, JavaScript ES6+ thuần (Native ES Modules)** và vận hành dữ liệu thời gian thực trên **Supabase (PostgreSQL + Auth + Realtime)**, triển khai tĩnh trên **Vercel**.

---

## 1. Kiến trúc Hệ thống & Công nghệ

- **Frontend thuần:** HTML5 ngữ nghĩa, CSS3 với Design Tokens (`css/style.css`), JavaScript ES6+ Modules không dùng Framework (không React/Vue/Angular) và không cần bước Build (bundler).
- **Backend-as-a-Service:** **Supabase** (`@supabase/supabase-js@2.48.1` qua ESM CDN):
  - **Authentication:** Bảo vệ toàn bộ 8 trang nghiệp vụ bằng Auth Guard (`requireAuth()`), tự động chuyển hướng về `pages/login.html` khi chưa đăng nhập.
  - **PostgreSQL + RLS:** Lưu trữ bền vững toàn bộ dữ liệu Phòng, Đặt phòng, Khách hàng, Voucher; áp dụng Row Level Security (chỉ role `authenticated` mới có quyền truy cập) và Exclusion Constraint (`btree_gist`) chống trùng lịch đặt phòng ở tầng database.
  - **Supabase Realtime:** Kênh lắng nghe `postgres_changes` (`js/core/realtime.js`) cho bảng `rooms` và `bookings` tự động đồng bộ giao diện (Dashboard, Phòng, Đặt phòng, Lịch phòng, Check-in/Out) giữa nhiều máy trạm mà không cần F5.
- **UI/UX:** Phong cách Modern Hospitality Dashboard, font `Plus Jakarta Sans`, bộ icon `Lucide Icons`, biểu đồ SVG thuần, thiết kế Responsive cho Desktop / Tablet / Mobile.

---

## 2. Cấu trúc Thư mục Dự án

```plaintext
HotelManager/
├── index.html                        # Trang Dashboard tổng quan (6 KPI, Donut & Bar Charts, Recent Bookings)
├── README.md                         # Tài liệu kiến trúc, vận hành & triển khai
│
├── assets/
│   ├── icons/                        # Logo thương hiệu & bộ Favicon đa kích thước
│   └── images/                       # Tài nguyên hình ảnh
│
├── css/
│   ├── style.css                     # Design Tokens (CSS Variables), Reset & Typography
│   ├── layout.css                    # Khung App: Sidebar, Header, Mobile Drawer
│   ├── components.css                # Components dùng chung: Buttons, Badges, Tables, Modals, Toasts
│   └── pages/                        # Stylesheet riêng từng phân hệ
│       ├── bookings.css
│       ├── calendar.css
│       ├── checkin-checkout.css
│       ├── customers.css
│       ├── login.css
│       ├── reports.css
│       ├── rooms.css
│       └── vouchers.css
│
├── js/
│   ├── main.js                       # Entry point: Auth Guard, Sidebar User Profile, Header Date, Mobile Nav
│   ├── core/                         # Hạ tầng lõi dùng chung
│   │   ├── auth.js                   # Đăng nhập, đăng xuất, Auth Guard & dịch lỗi tiếng Việt
│   │   ├── config.js                 # Cấu hình SUPABASE_URL & SUPABASE_PUBLISHABLE_KEY
│   │   ├── realtime.js               # Quản lý kênh Supabase Realtime (rooms, bookings) & cleanup
│   │   ├── state.js                  # In-Memory State Store đồng bộ với Supabase
│   │   ├── supabaseClient.js         # Singleton Supabase Client
│   │   ├── toast.js                  # Hệ thống thông báo Toast
│   │   └── utils.js                  # Format tiền tệ/ngày tháng, onReady, withButtonLoading, escapeHTML
│   │
│   ├── services/                     # Tầng truy cập dữ liệu Supabase (snake_case <-> camelCase Mapper)
│   │   ├── bookingService.js         # Đặt phòng, kiểm tra phòng trống, xác thực & tăng lượt Voucher
│   │   ├── checkinService.js         # Check-in / Check-out, quyết toán & đồng bộ trạng thái phòng
│   │   ├── customerService.js        # CRUD khách hàng & tra cứu lịch sử lưu trú
│   │   ├── reportService.js          # Thống kê KPI, doanh thu theo kỳ, ADR, công suất phòng
│   │   ├── roomService.js            # CRUD phòng, tạo phòng hàng loạt theo tầng, đổi trạng thái nhanh
│   │   └── voucherService.js         # CRUD mã khuyến mãi, bật/tắt trạng thái & đếm lượt sử dụng
│   │
│   └── pages/                        # Controller cho từng trang HTML
│       ├── bookings.js
│       ├── calendar.js
│       ├── checkin-checkout.js
│       ├── customers.js
│       ├── dashboard.js
│       ├── login.js
│       ├── reports.js
│       ├── rooms.js
│       └── vouchers.js
│
├── pages/                            # Các trang chức năng
│   ├── bookings.html                 # Quản lý đặt phòng
│   ├── calendar.html                 # Lịch phòng trực quan (Gantt Timeline 7/14 ngày)
│   ├── checkin-checkout.html         # Bàn lễ tân Check-in / Check-out
│   ├── customers.html                # Quản lý khách hàng & hạng thân thiết
│   ├── login.html                    # Đăng nhập nhân viên
│   ├── reports.html                  # Báo cáo doanh thu & đối soát (xuất CSV)
│   ├── rooms.html                    # Quản lý phòng & thiết lập tầng hàng loạt
│   └── vouchers.html                 # Quản lý mã Voucher & Khuyến mãi
│
└── supabase/                         # SQL Scripts khởi tạo & bảo trì Database
    ├── schema.sql                    # Bảng, Indexes, Triggers, Exclusion Constraint & RLS Policies
    ├── seed.sql                      # Dữ liệu khởi tạo ban đầu
    ├── migration_voucher_used_count.sql # Migration bổ sung cột used_count cho bảng vouchers
    ├── verify.sql                    # Kiểm tra tính toàn vẹn database
    └── reset.sql                     # Làm sạch dữ liệu khi cần reset
```

---

## 3. Sơ đồ Bảng Supabase (`public` schema)

| Bảng | Mô tả & Trường chính | Ràng buộc & Tự động hóa |
| :--- | :--- | :--- |
| **`rooms`** | `id`, `room_number` (UNIQUE), `type`, `floor`, `price`, `capacity`, `status` (`available`/`occupied`/`cleaning`/`maintenance`), `amenities[]`, `image` | Trigger `set_updated_at()`, RLS cho `authenticated` |
| **`customers`** | `id`, `full_name`, `phone`, `email`, `id_card`, `visits`, `total_spent`, `notes` | Unique index chuẩn hóa số điện thoại (`regexp_replace`), Trigger `set_updated_at()` |
| **`vouchers`** | `id`, `code` (UNIQUE), `description`, `type` (`percentage`/`fixed`), `value`, `min_order`, `active`, `used_count` | `CHECK (type <> 'percentage' OR value <= 100)`, `used_count >= 0` |
| **`bookings`** | `id` (`BK-YYYYMM-NNN`), `customer_id`, `room_id`, `check_in_date`, `check_out_date`, `nights`, `voucher_code` (snapshot), `discount_amount`, `total_amount`, `surcharge`, `final_total`, `status`, `payment_status` | Exclusion Constraint `btree_gist` chống trùng lịch phòng `[check_in_date, check_out_date)`, Trigger `handle_booking_checkout()` tự cộng `visits` & `total_spent` cho khách |

> **Kích hoạt Realtime trên Supabase Dashboard:** Vào **Database -> Replication -> Source (`supabase_realtime`)** và bật Realtime cho 2 bảng **`rooms`** và **`bookings`** để các máy trạm nhận cập nhật tức thì.

---

## 4. Hướng dẫn Vận hành cho Quản lý Khách sạn

1. **Đăng nhập hệ thống:** Truy cập trang web, đăng nhập bằng tài khoản nhân viên được cấp (tạo trong **Supabase Authentication -> Users**). Tài khoản hiện tại hiển thị ở góc dưới Sidebar kèm nút Đăng xuất ở cả Sidebar và Header.
2. **Thiết lập & Quản lý Phòng (`Quản lý phòng`):**
   - Dùng **"Thiết lập Tầng & Tạo phòng hàng loạt"** để khởi tạo nhanh sơ đồ tầng/phòng khi đưa vào vận hành.
   - Chuyển nhanh trạng thái phòng (*Trống*, *Đang có khách*, *Đang dọn dẹp*, *Đang bảo trì*) ngay trên thẻ phòng hoặc bảng.
3. **Đặt phòng & Lịch phòng (`Đặt phòng`, `Lịch phòng`):**
   - Hệ thống tự động kiểm tra phòng trống theo khoảng ngày nhận - trả và ngăn đặt trùng lịch.
   - Nhập mã **Voucher** hợp lệ để tự động tính chiết khấu; số lượt sử dụng (`used_count`) của voucher tự động tăng khi tạo đơn thành công.
   - Trên **Lịch phòng (Gantt Timeline)**, bấm trực tiếp vào ô ngày trống của bất kỳ phòng nào để đặt phòng nhanh 1 chạm.
4. **Quy trình Lễ tân (`Check-in / Out`):**
   - Tab **Chờ Check-in:** Xác nhận CMND/CCCD và nhận phòng -> đơn chuyển sang `checked_in`, phòng tự động chuyển sang `occupied`.
   - Tab **Chờ Check-out:** Nhập phụ phí phát sinh (nếu có), chọn phương thức thanh toán và quyết toán -> đơn chuyển sang `checked_out`, phòng tự động chuyển sang `cleaning` và hệ thống tự cộng dồn chi tiêu cho khách hàng.
   - Khi buồng phòng dọn xong, bấm **"Hoàn tất dọn dẹp"** để đưa phòng về trạng thái `available`.
5. **Khuyến mãi (`Mã Voucher`) & Đối soát (`Báo cáo doanh thu`):**
   - Tạo, sửa, bật/tắt nhanh hoặc xóa mã Voucher; sao chép mã chỉ với 1 click.
   - Xem báo cáo theo kỳ (**Hôm nay / 7 ngày qua / Tháng này / Quý này / Tất cả**) với các chỉ số thực tế: Tổng doanh thu, Công suất phòng (%), ADR, Lượt hoàn tất và xuất **Bảng kê CSV** để lưu trữ kế toán.

---

## 5. Quy trình Thiết lập Supabase & Deploy Vercel

### A. Thiết lập Database Supabase
1. Mở **SQL Editor** trên Supabase Dashboard và chạy lần lượt:
   - `supabase/schema.sql` (khởi tạo toàn bộ bảng, ràng buộc, trigger và RLS).
   - `supabase/seed.sql` (nạp dữ liệu mẫu ban đầu nếu cần).
   - *(Nếu database đã tạo trước đó)*: chạy `supabase/migration_voucher_used_count.sql` để bổ sung cột `used_count` cho bảng `vouchers`.
   - `supabase/verify.sql` để kiểm tra lại toàn bộ bảng, RLS và sequence.
2. Vào **Authentication -> Sign In / Providers**, tắt **"Allow new users to sign up"** để bảo mật hệ thống nội bộ; sau đó tạo tài khoản nhân viên tại **Authentication -> Users -> Add user**.
3. Bật **Database -> Replication** cho bảng `rooms` và `bookings`.
4. Kiểm tra `js/core/config.js` đã điền đúng `SUPABASE_URL` và `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`). *(Tuyệt đối không đưa `sb_secret_...` hay mật khẩu DB vào mã nguồn).*

### B. Deploy lên Vercel
Dự án là Static Web thuần (Native ES6 Modules), không cần build step:
1. Đẩy mã nguồn lên GitHub Repository.
2. Đăng nhập [Vercel](https://vercel.com), chọn **Add New -> Project** và kết nối tới repository `HotelManager`.
3. Tại mục **Build & Output Settings**:
   - **Framework Preset:** `Other`
   - **Build Command:** để trống
   - **Output Directory:** `.` (mặc định gốc dự án)
4. Bấm **Deploy**. Mọi đường dẫn tương đối (`./`, `../`) đều hoạt động đồng bộ trên cả `localhost` và tên miền `.vercel.app`.
5. Sau khi có domain `.vercel.app`, vào **Supabase Dashboard -> Authentication -> URL Configuration**, thêm domain Vercel vào **Site URL** và **Redirect URLs** để đảm bảo luồng Auth hoạt động ổn định.
