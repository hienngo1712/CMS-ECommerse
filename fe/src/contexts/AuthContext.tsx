import React, { useEffect, useState } from "react";

import authService from "../services/AuthService";
import type { AuthUser } from "../pages/Login/Types";
import { clearToken, getToken, setToken } from "../utils/axiosInstance";

type AuthContextType = {
  user: AuthUser | null;
  // Lúc mới tải trang chưa biết token còn hạn hay không. Phải phân biệt
  // "chưa biết" với "chắc chắn chưa đăng nhập", nếu không RequireAuth sẽ đá
  // người dùng về /login ngay trước khi /auth/me kịp trả lời.
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    // Token trong localStorage có thể đã hết hạn hoặc tài khoản đã bị khoá,
    // nên phải hỏi lại server chứ không tin luôn là còn đăng nhập.
    authService
      .getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authService.login({ username, password });
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
