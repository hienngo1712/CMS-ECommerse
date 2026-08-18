import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spin } from "antd";

import { AuthContext } from "../contexts/AuthContext";

const RequireAuth = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  // Còn đang hỏi /auth/me thì chưa kết luận được, chờ đã.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    // Nhớ trang đang muốn vào để đăng nhập xong quay lại đúng chỗ đó.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
