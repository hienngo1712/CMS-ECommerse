import axios from "axios"

const TOKEN_KEY = "cms_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
  headers:{
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 nghĩa là token hết hạn hoặc tài khoản bị khoá giữa chừng: xoá token và
// đưa về trang đăng nhập. Dùng window.location chứ không dùng navigate vì
// interceptor nằm ngoài cây React, không gọi được hook ở đây.
// Bỏ qua khi đang ở /login, nếu không thì nhập sai mật khẩu sẽ tự tải lại trang
// và người dùng không kịp đọc thông báo lỗi.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const isUnauthorized = error?.response?.status === 401;
    if (isUnauthorized && window.location.pathname !== "/login") {
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
