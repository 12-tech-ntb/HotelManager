/**
 * HOTEL MANAGEMENT SYSTEM - AUTHENTICATION MODULE
 * Quản lý phiên làm việc, đăng nhập, đăng xuất và Auth Guard cho toàn bộ trang
 */

import { supabase } from './supabaseClient.js';

/**
 * Kiểm tra xem trang hiện tại có đang nằm trong thư mục con /pages/ hay không
 * @returns {boolean}
 */
export function isSubPage() {
  const path = window.location.pathname.replace(/\\/g, '/');
  return path.includes('/pages/');
}

/**
 * Lấy đường dẫn tương đối chính xác tới trang đăng nhập
 * @returns {string}
 */
export function getLoginUrl() {
  return isSubPage() ? 'login.html' : 'pages/login.html';
}

/**
 * Lấy đường dẫn tương đối chính xác tới trang Dashboard chủ (index.html)
 * @returns {string}
 */
export function getHomeUrl() {
  return isSubPage() ? '../index.html' : 'index.html';
}

/**
 * Dịch thông báo lỗi xác thực từ Supabase sang tiếng Việt thân thiện,
 * tránh để lộ thông tin kỹ thuật thừa.
 * @param {Object} error 
 * @returns {string}
 */
export function translateAuthError(error) {
  if (!error) return 'Đã có lỗi xảy ra. Vui lòng thử lại.';

  const msg = (error.message || '').toLowerCase();
  const code = (error.code || error.error || '').toLowerCase();

  if (
    msg.includes('invalid login credentials') || 
    msg.includes('invalid credentials') || 
    code === 'invalid_grant'
  ) {
    return 'Email hoặc mật khẩu không chính xác.';
  }

  if (msg.includes('email not confirmed')) {
    return 'Tài khoản chưa được kích hoạt email.';
  }

  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.';
  }

  if (msg.includes('user not found')) {
    return 'Không tìm thấy tài khoản nhân viên.';
  }

  if (
    msg.includes('failed to fetch') || 
    msg.includes('networkerror') || 
    msg.includes('network request failed')
  ) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
  }

  return 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.';
}

/**
 * Đăng nhập bằng Email và Password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} session & user
 */
export async function signIn(email, password) {
  if (!email || !password) {
    throw new Error('Vui lòng nhập đầy đủ email và mật khẩu.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: password
  });

  if (error) {
    throw new Error(translateAuthError(error));
  }

  return data;
}

/**
 * Đăng xuất khỏi hệ thống và chuyển hướng về trang login
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Lỗi khi đăng xuất:', error.message);
    }
  } catch (err) {
    console.error('Ngoại lệ khi đăng xuất:', err);
  } finally {
    window.location.replace(getLoginUrl());
  }
}

/**
 * Lấy phiên đăng nhập hiện tại
 * @returns {Promise<Object|null>} session hoặc null
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data || !data.session) {
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('Lỗi khi kiểm tra session:', err);
    return null;
  }
}

/**
 * Lắng nghe thay đổi trạng thái xác thực (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
 * @param {Function} callback 
 * @returns {Object} subscription
 */
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Auth Guard bảo vệ các trang quản lý:
 * - Nếu CHƯA đăng nhập: ẩn giao diện lập tức để chống nháy nội dung (FOUC),
 *   sau đó chuyển hướng sang trang login.
 * - Nếu ĐÃ đăng nhập: trả về session hợp lệ để trang tiếp tục hiển thị.
 * @returns {Promise<Object|null>}
 */
export async function requireAuth() {
  const path = window.location.pathname.replace(/\\/g, '/');

  // Trang login không bị guard
  if (path.endsWith('login.html')) {
    return null;
  }

  const session = await getSession();

  if (!session) {
    // Ẩn giao diện ngay lập tức để người dùng không nhìn thấy dữ liệu mẫu cũ trước khi bị redirect
    const layout = document.querySelector('.app-layout');
    if (layout) {
      layout.style.display = 'none';
    }
    document.body.style.display = 'none';

    // Chuyển hướng về trang đăng nhập
    window.location.replace(getLoginUrl());
    return null;
  }

  return session;
}
