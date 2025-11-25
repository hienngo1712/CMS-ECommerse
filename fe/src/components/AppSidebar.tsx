import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";

import { useLocation, useNavigate } from "react-router-dom";
import React, { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
const { Sider } = Layout;

const AppSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useContext(ThemeContext);
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
      key: "users",
      icon: <UserOutlined />,
      label: "Users",
    },
  ];
  const handleClick = (e: any) => {
    navigate(`/${e.key}`);
  };
  const selectedKey = location.pathname.split("/")[1] || "dashboard";
  return (
    <Sider trigger={null} collapsible>
      <div className="text-xl font-bold text-blue-600 text-center py-5">
        ADMIN PANEL
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
