/**
 * HOTEL MANAGEMENT SYSTEM - SUPABASE CLIENT (SINGLETON)
 * 
 * - Sử dụng supabase-js được PIN phiên bản cụ thể (2.48.1) từ CDN ESM.
 * - Khởi tạo duy nhất một client (singleton) dùng chung cho toàn bộ ứng dụng.
 * - Cấu hình tự động lưu phiên đăng nhập (persistSession) và tự làm mới token (autoRefreshToken).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// ============================================================================
// HÀM KIỂM TRA KẾT NỐI TẠM THỜI (DÀNH CHO TEST TRÊN CONSOLE - XÓA SAU KHI XONG BƯỚC 2)
// Cách dùng: Sau khi đăng nhập, mở DevTools Console gõ: await window.__checkSupabaseConnection()
// ============================================================================
if (typeof window !== 'undefined') {
  window.__checkSupabaseConnection = async () => {
    console.log('%c[Supabase Check] Đang kiểm tra kết nối tới Supabase...', 'color: #3b82f6;');
    try {
      const { data, count, error } = await supabase
        .from('rooms')
        .select('*', { count: 'exact', head: true });

      // BẮT BUỘC kiểm tra error trước khi dùng count/data vì lỗi 42501 có thể trả về mảng rỗng
      if (error) {
        console.error('[Supabase Check] Thất bại! Mã lỗi:', error.code, 'Chi tiết:', error.message);
        if (error.code === '42501') {
          console.warn('[Supabase Check] Lỗi 42501: Chưa đăng nhập hoặc tài khoản chưa có quyền truy cập bảng rooms!');
        }
        return { success: false, error };
      }

      console.log(
        `%c[Supabase Check] Kết nối thành công! Đã truy vấn bảng rooms. Tổng số phòng: ${count}`,
        'color: #10b981; font-weight: bold;'
      );
      return { success: true, count };
    } catch (err) {
      console.error('[Supabase Check] Lỗi ngoại lệ kết nối:', err);
      return { success: false, error: err };
    }
  };
}
