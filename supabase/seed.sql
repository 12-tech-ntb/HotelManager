-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM - SEED DATA (SUPABASE / POSTGRESQL)
-- Thứ tự nạp: rooms -> customers -> vouchers -> bookings
-- ============================================================================

-- 1. NẠP DỮ LIỆU PHÒNG NGHỈ (16 phòng trải dài 4 tầng)
INSERT INTO public.rooms (id, room_number, type, floor, price, capacity, status, amenities, image) VALUES
-- Tầng 1
('r101', '101', 'Standard Room', 1, 850000, 2, 'occupied', ARRAY['Wifi', 'TV', 'Điều hòa'], ''),
('r102', '102', 'Standard Room', 1, 850000, 2, 'available', ARRAY['Wifi', 'TV', 'Điều hòa'], ''),
('r103', '103', 'Superior Room', 1, 1250000, 2, 'available', ARRAY['Wifi', 'Smart TV', 'Bồn tắm', 'Minibar'], ''),
('r104', '104', 'Superior Room', 1, 1250000, 2, 'cleaning', ARRAY['Wifi', 'Smart TV', 'Bồn tắm', 'Minibar'], ''),

-- Tầng 2
('r201', '201', 'Standard Room', 2, 850000, 2, 'available', ARRAY['Wifi', 'TV', 'Điều hòa'], ''),
('r202', '202', 'Superior Room', 2, 1250000, 2, 'occupied', ARRAY['Wifi', 'Smart TV', 'Bồn tắm', 'Minibar'], ''),
('r203', '203', 'Deluxe Suite', 2, 1850000, 3, 'available', ARRAY['Wifi', 'Ban công', 'Bồn sục', 'Smart TV'], ''),
('r204', '204', 'Deluxe Suite', 2, 1850000, 3, 'occupied', ARRAY['Wifi', 'Ban công', 'Bồn sục', 'Smart TV'], ''),

-- Tầng 3
('r301', '301', 'Superior Room', 3, 1250000, 2, 'available', ARRAY['Wifi', 'Smart TV', 'Bồn tắm'], ''),
('r302', '302', 'Deluxe Suite', 3, 1850000, 3, 'available', ARRAY['Wifi', 'Ban công', 'Bồn sục'], ''),
('r303', '303', 'Deluxe Suite', 3, 1850000, 3, 'maintenance', ARRAY['Wifi', 'Ban công', 'Bồn sục'], ''),
('r304', '304', 'Executive Suite', 3, 2800000, 4, 'occupied', ARRAY['View biển', 'Phòng khách riêng', 'Minibar cao cấp'], ''),

-- Tầng 4
('r401', '401', 'Deluxe Suite', 4, 1850000, 3, 'available', ARRAY['View thành phố', 'Ban công rộng'], ''),
('r402', '402', 'Executive Suite', 4, 2800000, 4, 'available', ARRAY['View thành phố', 'Phòng ăn riêng'], ''),
('r403', '403', 'Executive Suite', 4, 2800000, 4, 'maintenance', ARRAY['View thành phố', 'Phòng ăn riêng'], ''),
('r404', '404', 'Presidential Suite', 4, 5500000, 6, 'occupied', ARRAY['Penthouse', 'Bể bơi riêng', 'Quản gia 24/7'], '')
ON CONFLICT (id) DO NOTHING;

-- 2. NẠP DỮ LIỆU KHÁCH HÀNG (7 khách hàng)
INSERT INTO public.customers (id, full_name, phone, email, id_card, visits, total_spent, notes) VALUES
('c001', 'Nguyễn Văn An', '0912 345 678', 'an.nguyen@gmail.com', '001200001234', 4, 12450000, ''),
('c002', 'Trần Thị Bích', '0988 765 432', 'bich.tran@yahoo.com', '001200005678', 2, 4800000, ''),
('c003', 'Lê Hoàng Minh', '0903 112 233', 'minh.le@outlook.com', '079200009876', 6, 26500000, ''),
('c004', 'Phạm Hồng Ngọc', '0977 445 566', 'ngoc.pham@gmail.com', '031200003456', 1, 1850000, ''),
('c005', 'Vũ Đình Trọng', '0934 889 900', 'trong.vu@fpt.com.vn', '040200007890', 3, 8750000, ''),
('c006', 'Đặng Thu Thảo', '0918 556 677', 'thao.dang@gmail.com', '052200002345', 5, 16800000, ''),
('c007', 'Hoàng Gia Huy', '0945 223 344', 'huy.hoang@gmail.com', '025200008765', 1, 5500000, '')
ON CONFLICT (id) DO NOTHING;

-- 3. NẠP DỮ LIỆU MÃ GIẢM GIÁ (3 vouchers)
INSERT INTO public.vouchers (id, code, description, type, value, min_order, active) VALUES
('v01', 'WELCOME10', 'Giảm 10% cho khách hàng mới', 'percentage', 10, 1000000, true),
('v02', 'LUXURY500', 'Giảm 500.000₫ cho phòng Suite', 'fixed', 500000, 3000000, true),
('v03', 'WEEKEND15', 'Ưu đãi cuối tuần giảm 15%', 'percentage', 15, 2000000, true)
ON CONFLICT (id) DO NOTHING;

-- 4. NẠP DỮ LIỆU ĐẶT PHÒNG (7 bookings)
-- Lưu ý: Dùng ON CONFLICT DO NOTHING, tuyệt đối không UPDATE để tránh kích hoạt trigger cộng trùng visits/total_spent.
INSERT INTO public.bookings (
  id, customer_id, customer_name, customer_phone, customer_email, customer_id_card,
  room_id, room_number, room_type, room_price, check_in_date, check_out_date, nights,
  voucher_code, discount_amount, total_amount, status, payment_status, payment_method, created_at
) VALUES
(
  'BK-202611-001', 'c001', 'Nguyễn Văn An', '0912 345 678', 'an.nguyen@gmail.com', '001200001234',
  'r101', '101', 'Standard Room', 850000, '2026-11-21', '2026-11-24', 3,
  NULL, 0, 2550000, 'checked_in', 'paid', 'Tiền mặt', '2026-11-21 09:30:00+07'
),
(
  'BK-202611-002', 'c002', 'Trần Thị Bích', '0988 765 432', 'bich.tran@yahoo.com', '001200005678',
  'r202', '202', 'Superior Room', 1250000, '2026-11-21', '2026-11-23', 2,
  NULL, 0, 2500000, 'checked_in', 'paid', 'Tiền mặt', '2026-11-21 11:15:00+07'
),
(
  'BK-202611-003', 'c003', 'Lê Hoàng Minh', '0903 112 233', 'minh.le@outlook.com', '079200009876',
  'r204', '204', 'Deluxe Suite', 1850000, '2026-11-21', '2026-11-25', 4,
  NULL, 0, 7400000, 'checked_in', 'paid', 'Tiền mặt', '2026-11-21 14:00:00+07'
),
(
  'BK-202611-004', 'c004', 'Phạm Hồng Ngọc', '0977 445 566', 'ngoc.pham@gmail.com', '031200003456',
  'r103', '103', 'Superior Room', 1250000, '2026-11-22', '2026-11-24', 2,
  NULL, 0, 2500000, 'confirmed', 'paid', 'Tiền mặt', '2026-11-21 16:40:00+07'
),
(
  'BK-202611-005', 'c005', 'Vũ Đình Trọng', '0934 889 900', 'trong.vu@fpt.com.vn', '040200007890',
  'r302', '302', 'Deluxe Suite', 1850000, '2026-11-23', '2026-11-26', 3,
  NULL, 0, 5550000, 'confirmed', 'partial', 'Tiền mặt', '2026-11-20 18:20:00+07'
),
(
  'BK-202611-006', 'c006', 'Đặng Thu Thảo', '0918 556 677', 'thao.dang@gmail.com', '052200002345',
  'r304', '304', 'Executive Suite', 2800000, '2026-11-20', '2026-11-23', 3,
  NULL, 0, 8400000, 'checked_in', 'paid', 'Tiền mặt', '2026-11-20 10:00:00+07'
),
(
  'BK-202611-007', 'c007', 'Hoàng Gia Huy', '0945 223 344', 'huy.hoang@gmail.com', '025200008765',
  'r404', '404', 'Presidential Suite', 5500000, '2026-11-21', '2026-11-24', 3,
  NULL, 0, 16500000, 'checked_in', 'paid', 'Tiền mặt', '2026-11-21 13:20:00+07'
)
ON CONFLICT (id) DO NOTHING;

-- Đặt Sequence booking_code_seq tiếp tục từ giá trị lớn nhất hiện có + 1 (false để nextval trả về đúng giá trị này)
-- Đảm bảo booking đầu tiên do người dùng tạo không bị trùng khóa chính với seed (BK-202611-001...007).
SELECT setval(
  'public.booking_code_seq', 
  COALESCE((SELECT MAX((regexp_match(id, '(\d+)$'))[1]::int) FROM public.bookings), 0) + 1, 
  false
);
