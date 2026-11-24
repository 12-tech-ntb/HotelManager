/**
 * HOTEL MANAGEMENT SYSTEM - LOGIN CONTROLLER
 * Xử lý xác thực người dùng, hiển thị loading, kiểm tra session hiện có
 */

import { signIn, getSession, getHomeUrl } from '../core/auth.js';
import { toast } from '../core/toast.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Khởi tạo Lucide Icons
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // 2. Nếu đã có phiên đăng nhập hợp lệ, chuyển thẳng về trang Dashboard
  const session = await getSession();
  if (session) {
    window.location.replace(getHomeUrl());
    return;
  }

  // 3. Khởi tạo sự kiện form đăng nhập
  initLoginForm();
  initPasswordToggle();
});

/**
 * Xử lý sự kiện ẩn / hiện mật khẩu
 */
function initPasswordToggle() {
  const toggleBtn = document.getElementById('btnTogglePassword');
  const passwordInput = document.getElementById('inputPassword');

  if (!toggleBtn || !passwordInput) return;

  toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

    toggleBtn.innerHTML = isPassword
      ? '<i data-lucide="eye-off" style="width: 18px; height: 18px;"></i>'
      : '<i data-lucide="eye" style="width: 18px; height: 18px;"></i>';

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  });
}

/**
 * Xử lý gửi Form Đăng nhập
 */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('inputEmail');
  const passwordInput = document.getElementById('inputPassword');
  const submitBtn = document.getElementById('btnSubmitLogin');
  const btnText = document.getElementById('btnSubmitText');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnArrow = document.getElementById('btnArrowIcon');

  if (!form) return;

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      emailInput.disabled = true;
      passwordInput.disabled = true;
      if (btnText) btnText.textContent = 'Đang xác thực...';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
      if (btnArrow) btnArrow.style.display = 'none';
    } else {
      submitBtn.disabled = false;
      emailInput.disabled = false;
      passwordInput.disabled = false;
      if (btnText) btnText.textContent = 'Đăng nhập hệ thống';
      if (btnSpinner) btnSpinner.style.display = 'none';
      if (btnArrow) btnArrow.style.display = 'inline-block';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email) {
      toast.show('Vui lòng nhập địa chỉ email nhân viên.', 'warning');
      emailInput.focus();
      return;
    }

    if (!password) {
      toast.show('Vui lòng nhập mật khẩu.', 'warning');
      passwordInput.focus();
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      toast.show('Đăng nhập thành công! Đang chuyển hướng...', 'success');

      // Chuyển về Dashboard chủ sau khi đăng nhập thành công
      setTimeout(() => {
        window.location.replace(getHomeUrl());
      }, 500);

    } catch (err) {
      setLoading(false);
      toast.show(err.message, 'error');
      passwordInput.focus();
    }
  });
}
