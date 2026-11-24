-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM - DATABASE SCHEMA (SUPABASE / POSTGRESQL)
-- ============================================================================

-- Kích hoạt extension hỗ trợ exclusion constraint trên daterange + text
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- 0. HÀM DÙNG CHUNG (TRIGGER UPDATED_AT & SINH MÃ BOOKING)
-- ============================================================================

-- Hàm tự động cập nhật thời gian updated_at khi có UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Sequence và hàm tự động sinh mã Booking dạng 'BK-YYYYMM-NNN'
CREATE SEQUENCE IF NOT EXISTS public.booking_code_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.generate_booking_id()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  prefix TEXT;
  seq_val BIGINT;
BEGIN
  prefix := 'BK-' || to_char(now(), 'YYYYMM') || '-';
  seq_val := nextval('public.booking_code_seq');
  RETURN prefix || lpad(seq_val::text, 3, '0');
END;
$$;

-- ============================================================================
-- 1. BẢNG PHÒNG NGHỈ (rooms)
-- ============================================================================
CREATE TABLE public.rooms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  floor INTEGER NOT NULL CHECK (floor > 0),
  price BIGINT NOT NULL CHECK (price >= 0),
  capacity INTEGER NOT NULL DEFAULT 2 CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'available' 
    CHECK (status IN ('available', 'occupied', 'cleaning', 'maintenance')),
  amenities TEXT[] DEFAULT '{}',
  image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger cập nhật updated_at
CREATE TRIGGER trg_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes phục vụ tìm kiếm & lọc nhanh
CREATE INDEX idx_rooms_status ON public.rooms(status);
CREATE INDEX idx_rooms_floor ON public.rooms(floor);
CREATE INDEX idx_rooms_type ON public.rooms(type);

-- ============================================================================
-- 2. BẢNG KHÁCH HÀNG (customers)
-- ============================================================================
CREATE TABLE public.customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  id_card TEXT DEFAULT '',
  visits INTEGER DEFAULT 0 CHECK (visits >= 0),
  total_spent BIGINT DEFAULT 0 CHECK (total_spent >= 0),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ràng buộc số điện thoại duy nhất sau khi loại bỏ khoảng trắng
CREATE UNIQUE INDEX idx_customers_normalized_phone 
  ON public.customers (regexp_replace(phone, '\s', '', 'g'));

-- Trigger cập nhật updated_at
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_customers_email ON public.customers(email);

-- ============================================================================
-- 3. BẢNG MÃ GIẢM GIÁ (vouchers)
-- ============================================================================
CREATE TABLE public.vouchers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value BIGINT NOT NULL CHECK (value > 0),
  min_order BIGINT DEFAULT 0 CHECK (min_order >= 0),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Voucher phần trăm không được vượt quá 100%
  CONSTRAINT chk_voucher_percentage CHECK (type <> 'percentage' OR value <= 100)
);

-- Trigger cập nhật updated_at
CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. BẢNG ĐẶT PHÒNG (bookings) & CHỐNG TRÙNG LỊCH BẰNG EXCLUSION CONSTRAINT
-- ============================================================================
CREATE TABLE public.bookings (
  id TEXT PRIMARY KEY DEFAULT public.generate_booking_id(),
  customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  customer_id_card TEXT DEFAULT '',
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL,
  room_price BIGINT NOT NULL CHECK (room_price >= 0),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER NOT NULL CHECK (nights > 0),
  voucher_code TEXT, -- Snapshot mã voucher (không FK tới vouchers để độc lập lịch sử)
  discount_amount BIGINT DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'confirmed' 
    CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' 
    CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
  payment_method TEXT DEFAULT 'Tiền mặt',
  special_requests TEXT DEFAULT '',
  check_in_notes TEXT DEFAULT '',
  check_out_notes TEXT DEFAULT '',
  cancel_reason TEXT DEFAULT '',
  surcharge BIGINT DEFAULT 0,
  final_total BIGINT,
  actual_check_in_time TIMESTAMPTZ,
  actual_check_out_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ngày trả phòng phải sau ngày nhận phòng
  CONSTRAINT chk_booking_dates CHECK (check_out_date > check_in_date),

  -- Số đêm lưu trú phải đúng bằng khoảng cách ngày
  CONSTRAINT chk_booking_nights CHECK (nights = (check_out_date - check_in_date)),

  -- CHỐNG TRÙNG LỊCH ĐẶT PHÒNG Ở TẦNG DATABASE:
  -- Sử dụng khoảng ngày nửa mở '[)': khách trước check-out ngày X thì khách sau có thể check-in ngày X.
  -- Ràng buộc chỉ kích hoạt đối với các đơn chưa hủy (status <> 'cancelled').
  CONSTRAINT exclude_overlapping_room_bookings
    EXCLUDE USING gist (
      room_id WITH =,
      daterange(check_in_date, check_out_date, '[)') WITH &&
    ) WHERE (status NOT IN ('cancelled'))
);

-- Trigger cập nhật updated_at
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes hỗ trợ tra cứu lịch & báo cáo
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_room_id ON public.bookings(room_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_dates ON public.bookings(check_in_date, check_out_date);

-- ============================================================================
-- 5. TRIGGER TÍNH LŨY visits & total_spent CHO CUSTOMERS KHI CHECK-OUT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_booking_checkout()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Chỉ kích hoạt khi trạng thái chuyển sang 'checked_out' từ một trạng thái khác
  IF NEW.status = 'checked_out' AND (OLD.status IS DISTINCT FROM 'checked_out') THEN
    UPDATE public.customers
    SET 
      visits = coalesce(visits, 0) + 1,
      total_spent = coalesce(total_spent, 0) + coalesce(NEW.final_total, NEW.total_amount, 0),
      updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_checkout_customer_stats
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_checkout();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Bật RLS trên toàn bộ 4 bảng
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- LƯU Ý BẢO MẬT QUAN TRỌNG:
-- Trên Supabase Dashboard -> Authentication -> Sign In / Providers:
-- bắt buộc phải TẮT tùy chọn "Allow new users to sign up" để người ngoài không thể tự đăng ký tài khoản.
-- Chỉ quản trị viên mới tạo tài khoản nhân viên từ Authentication -> Users -> Add user.

CREATE POLICY "Allow authenticated full access on rooms" 
  ON public.rooms 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on customers" 
  ON public.customers 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on vouchers" 
  ON public.vouchers 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on bookings" 
  ON public.bookings 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- ============================================================================
-- 7. GRANT QUYỀN CHO ROLE authenticated
-- ============================================================================
-- Project Supabase mới không tự cấp quyền cho role authenticated trên bảng/sequence mới.
-- Chỉ cấp quyền cho role authenticated, TUYỆT ĐỐI KHÔNG cấp cho anon.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_booking_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_booking_id() TO authenticated;
