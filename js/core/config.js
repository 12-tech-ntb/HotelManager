/**
 * HOTEL MANAGEMENT SYSTEM - SUPABASE CONFIGURATION
 * 
 * LƯU Ý BẢO MẬT QUAN TRỌNG:
 * - SUPABASE_PUBLISHABLE_KEY (hoặc anon key) an toàn khi đặt ở frontend vì toàn bộ
 *   quyền đọc/ghi đã được kiểm soát nghiêm ngặt bởi Row Level Security (RLS) ở database.
 * - Chỉ những nhân viên đã đăng nhập thành công (role 'authenticated') mới có quyền truy cập dữ liệu.
 * - TUYỆT ĐỐI KHÔNG lưu Secret key (service_role key / sb_secret_...) hay mật khẩu Database vào đây.
 */

// URL dự án Supabase
export const SUPABASE_URL = 'https://einuegzkpmbghxonxzuy.supabase.co';

// Publishable Key (sb_publishable_... hoặc anon key do Supabase cấp)
// Bạn hãy thay thế chuỗi bên dưới bằng key thật lấy từ Supabase Dashboard -> Project Settings -> API
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Vp1lfZmUhSALItanQdwj9Q_7QR-2ZMT';
