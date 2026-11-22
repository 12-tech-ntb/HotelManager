---
name: hotel-quality-check
description: "Quy trình kiểm tra chất lượng (QA), kiểm thử tự động, xác minh đường dẫn tài nguyên và kiểm toán giao diện cho dự án Hotel Management System. Sử dụng trước khi hoàn thành bất kỳ tính năng, chỉnh sửa hoặc bàn giao công việc."
---

# Hotel Management System - Quality Check & Verification Guide

Quy chuẩn kiểm tra chất lượng (Quality Assurance), kiểm thử chức năng và xác minh toàn vẹn tài nguyên dành cho Agent trước khi báo cáo hoàn thành công việc trong dự án **Hotel Management System**.

---

## 1. Nguyên tắc Cốt lõi: Bằng chứng trước Kết luận

> [!IMPORTANT]
> **Tuyệt đối không tuyên bố tính năng hoạt động hoặc hoàn thành nếu chưa chạy lệnh kiểm tra thực tế và xác nhận đầu ra (Evidence before assertions).**

- Không suy đoán hoặc giả định rằng code "sẽ chạy đúng".
- Chạy các công cụ kiểm tra (syntax check, link verification, unit logic test) để có kết quả kiểm thử thực tế.
- Báo cáo rõ ràng:
  - Lỗi hoặc vấn đề đã tìm thấy.
  - Nguyên nhân gốc rễ (Root cause).
  - Cách đã khắc phục.
  - Kết quả kiểm thử lại kèm bằng chứng.
- **Không tự ý chỉnh sửa** những phần mã nguồn nằm ngoài phạm vi yêu cầu của nhiệm vụ.

---

## 2. Danh mục Kiểm tra Toàn diện (QA Checklist)

### 2.1. Kiểm tra Cú pháp & Console (Syntax & Runtime Check)

- **Cú pháp JavaScript**:
  Chạy kiểm tra cú pháp trên tất cả file JS mới hoặc đã sửa đổi bằng Node.js:
  ```powershell
  node --check js/main.js
  node --check js/pages/<page-name>.js
  node --check js/services/<service-name>.js
  ```
- **Không có lỗi Console**: Đảm bảo không có exception không được bắt (unhandled exceptions), không gọi hàm chưa định nghĩa, hoặc import sai tên biến.

### 2.2. Kiểm tra Đường dẫn & Tài nguyên (Path & Asset Integrity)

- **Kiểm tra liên kết 404**:
  Xác minh toàn bộ các đường dẫn tương đối trong các thẻ HTML:
  - `<link rel="stylesheet" href="...">`
  - `<link rel="icon" ... href="...">`
  - `<script src="...">` và `<script type="module" src="...">`
  - `<img src="..." onerror="...">`
  - Thẻ điều hướng `<a href="...">` giữa các trang.
- **Quy tắc phân cấp thư mục**:
  - Tại `index.html`: Trỏ trực tiếp `css/...`, `js/...`, `assets/...`, `pages/...`.
  - Tại `pages/*.html`: Bắt buộc phải có tiền tố `../` (ví dụ `../css/...`, `../js/...`, `../assets/...`, `../index.html`).
- **Logo Fallback**: Kiểm tra thẻ ảnh logo luôn có thuộc tính `onerror` để tự động ẩn ảnh vỡ và hiển thị icon SVG dự phòng khi chưa có file ảnh thực tế.

### 2.3. Kiểm tra Chức năng & Tương tác Người dùng (Interactive Controls)

- **Nút bấm & Sự kiện**:
  - Các nút hành động chính (Thêm mới, Sửa, Xóa, Xác nhận, Hủy bỏ) hoạt động mượt mà.
  - Phím tắt (ví dụ `Ctrl + K` cho thanh tìm kiếm) hoạt động đúng như mong đợi.
- **Hộp thoại Modal & Drawer**:
  - Mở đúng modal khi click nút kích hoạt.
  - Đóng modal chuẩn mực qua 3 cách: Nút đóng [X], nút "Hủy / Quay lại", click vùng backdrop bên ngoài, và bấm phím `Escape`.
  - Khôi phục thanh cuộn trang (`body.style.overflow = ''`) khi đóng modal.
- **Bộ lọc & Tìm kiếm**:
  - Thanh tìm kiếm có debouncing (khoảng 200 - 300ms) để không gây lag khi người dùng gõ.
  - Bộ lọc dropdown và filter pills lọc chính xác dữ liệu từ state.
  - Hiển thị số lượng kết quả đếm đồng bộ với bảng/lưới.

### 2.4. Kiểm tra Responsive & Khả năng Hiển thị (Layout & Responsive)

- **Kiểm tra trên 3 kích thước**:
  - **Desktop (>= 1024px)**: Bố cục hoàn chỉnh, bảng dữ liệu hiển thị thông thoáng.
  - **Tablet (768px - 1023px)**: Không bị tràn ngang màn hình, lưới card chia cột phù hợp.
  - **Mobile (< 768px)**:
    - Nút Hamburger mở Sidebar Drawer hoạt động trơn tru.
    - Lớp phủ mờ (Backdrop overlay) hiển thị khi mở Sidebar trên mobile.
    - Các bảng dữ liệu bọc trong container có `overflow-x: auto` để cuộn ngang mượt mà.

### 2.5. Kiểm tra Dữ liệu & Xử lý Ngoại lệ (Edge Cases)

- **Trạng thái rỗng (Empty State)**:
  - Khi không tìm thấy kết quả tìm kiếm hoặc bảng không có dữ liệu, hiển thị khối Empty State trực quan kèm icon và hướng dẫn khắc phục.
- **Validation Dữ liệu Form**:
  - Bắt buộc điền các trường có dấu `*`.
  - Bắt lỗi trùng lặp (ví dụ: không cho tạo 2 phòng trùng số phòng).
  - Kiểm tra ngày tháng logic (ví dụ: ngày trả phòng phải sau ngày nhận phòng).
  - Kiểm tra điều kiện áp dụng Voucher (giá trị đơn tối thiểu, hạn sử dụng).
- **Đồng bộ Trạng thái**:
  - Mọi thao tác Check-in / Check-out phải đồng bộ trạng thái chính xác giữa Đơn đặt phòng và Phòng tương ứng.
