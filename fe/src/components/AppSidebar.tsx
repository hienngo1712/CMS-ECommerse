import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { useLocation, useNavigate } from "react-router-dom";
import React, { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import { AuthContext } from "../contexts/AuthContext";
const { Sider } = Layout;

const AppSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useContext(ThemeContext);
  const { user } = useContext(AuthContext);
  const items = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "Dashboard",
    },
    {
      key: "products",
      icon: <ShoppingOutlined />,
      label: "Products",
    },
    {
      key: "category",
      icon: <ShoppingCartOutlined />,
      label: "Category",
    },
    {
      key: "orders",
      icon: <FileTextOutlined />,
      label: "Orders",
    },
    // API trả 403 cho tài khoản không phải admin, nên hiện mục này với họ chỉ
    // là mời bấm vào một trang báo lỗi.
    ...(user?.role === "admin"
      ? [
          {
            key: "users",
            icon: <UserOutlined />,
            label: "Users",
          },
        ]
      : []),
  ];
  const handleClick = ({ key }: { key: string }) => {
    navigate(`/${key}`);
  };
  const selectedKey = location.pathname.split("/")[1] || "dashboard";
  return (
    <Sider trigger={null} collapsible>
      <div className="text-xl font-bold text-blue-600 text-center py-5">
        CMS Ecommerce
      </div>
      <Menu
        theme={isDark ? "dark" : "light"}
        selectedKeys={[selectedKey]}
        items={items}
        className="h-screen"
        onClick={handleClick}
      />
    </Sider>
  );
};

export default AppSidebar;
