-- ============================================================================
-- MIGRATION: Bổ sung cột used_count cho bảng vouchers
-- Chạy file này trong Supabase SQL Editor nếu database của bạn đã khởi tạo trước đó.
-- ============================================================================

ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0);

-- Đồng bộ lại số lượt sử dụng thực tế từ lịch sử bảng bookings (tính các đơn không bị hủy)
UPDATE public.vouchers v
SET used_count = COALESCE((
  SELECT COUNT(*)::INTEGER
  FROM public.bookings b
  WHERE UPPER(b.voucher_code) = UPPER(v.code)
    AND b.status <> 'cancelled'
), 0);
