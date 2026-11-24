-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM - DATABASE VERIFICATION SCRIPT (SUPABASE / POSTGRESQL)
-- Mục đích: Kiểm tra tính đúng đắn sau khi chạy schema.sql và seed.sql.
-- Chỉ bao gồm các truy vấn SELECT chỉ đọc.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. KIỂM TRA SỐ DÒNG CỦA MỖI BẢNG
-- Kỳ vọng:
--   rooms     : 16 dòng
--   customers :  7 dòng
--   vouchers  :  3 dòng
--   bookings  :  7 dòng
-- ----------------------------------------------------------------------------
SELECT 'rooms' AS table_name, COUNT(*) AS total_rows, 16 AS expected_rows FROM public.rooms
UNION ALL
SELECT 'customers', COUNT(*), 7 FROM public.customers
UNION ALL
SELECT 'vouchers', COUNT(*), 3 FROM public.vouchers
UNION ALL
SELECT 'bookings', COUNT(*), 7 FROM public.bookings;


-- ----------------------------------------------------------------------------
-- 2. KIỂM TRA TRẠNG THÁI ROW LEVEL SECURITY (RLS)
-- Kỳ vọng: Cả 4 bảng đều có rowsecurity = true (tất cả bảng đã bật RLS).
-- ----------------------------------------------------------------------------
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('rooms', 'customers', 'vouchers', 'bookings')
ORDER BY tablename;


-- ----------------------------------------------------------------------------
-- 3. KIỂM TRA QUYỀN TRÊN BẢNG CỦA ROLE anon VÀ authenticated
-- Kỳ vọng:
--   - Role 'anon': KHÔNG có dòng nào (tuyệt đối không cấp quyền truy cập bảng cho anon).
--   - Role 'authenticated': có đầy đủ 4 quyền (SELECT, INSERT, UPDATE, DELETE) trên cả 4 bảng.
-- ----------------------------------------------------------------------------
SELECT grantee, table_name, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND table_name IN ('rooms', 'customers', 'vouchers', 'bookings')
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, table_name, privilege_type;


-- ----------------------------------------------------------------------------
-- 4. KIỂM TRA GIÁ TRỊ TIẾP THEO CỦA SEQUENCE SO VỚI MÃ BOOKING LỚN NHẤT
-- Kỳ vọng:
--   - max_seed_number: 7 (từ BK-202611-007)
--   - next_seq_value : 8 (giá trị sẽ được cấp cho booking mới đầu tiên)
--   - is_safe        : true (đảm bảo không bao giờ bị đụng khóa chính khi insert mới)
-- ----------------------------------------------------------------------------
SELECT 
  COALESCE((SELECT MAX((regexp_match(id, '(\d+)$'))[1]::int) FROM public.bookings), 0) AS max_seed_number,
  (SELECT last_value FROM public.booking_code_seq) AS current_seq_value,
  CASE 
    WHEN (SELECT last_value FROM public.booking_code_seq) > 
         COALESCE((SELECT MAX((regexp_match(id, '(\d+)$'))[1]::int) FROM public.bookings), 0)
    THEN true 
    ELSE false 
  END AS is_safe;
