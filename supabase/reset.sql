-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM - DATABASE RESET SCRIPT
-- ============================================================================
-- CẢNH BÁO NGUY HIỂM:
-- FILE NÀY SẼ XÓA TOÀN BỘ DỮ LIỆU VÀ CẤU TRÚC BẢNG TRONG SCHEMA PUBLIC!
-- CHỈ DÙNG TRONG MÔI TRƯỜNG PHÁT TRIỂN KHI MUỐN CHẠY LẠI SCHEMA TỪ ĐẦU.
-- ============================================================================

-- 1. DROP CÁC BẢNG THEO ĐÚNG THỨ TỰ PHỤ THUỘC KHÓA NGOẠI
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.vouchers CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

-- 2. DROP CÁC HÀM DO SCHEMA TẠO
DROP FUNCTION IF EXISTS public.handle_booking_checkout() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.generate_booking_id() CASCADE;

-- 3. DROP SEQUENCE
DROP SEQUENCE IF EXISTS public.booking_code_seq CASCADE;

-- Lưu ý: KHÔNG drop extension btree_gist để tránh ảnh hưởng đến các đối tượng khác.
