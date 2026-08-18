import { Avatar, Dropdown, Layout } from "antd";
import {
  BulbOutlined,
  LogoutOutlined,
  MoonOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../contexts/ThemeContext";
import { AuthContext } from "../contexts/AuthContext";

const { Header } = Layout;

const AppHeader = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const menuItems = [
    {
      key: "profile",
      label: "Profile",
    },
    {
      key: "settings",
      label: "Settings",
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "logout") {
      logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <Header className="flex justify-between items-center px-6 shadow-sm">
      <div />
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="text-lg cursor-pointer hover:text-blue-500 trasition-color"
        >
          {isDark ? <BulbOutlined /> : <MoonOutlined />}
        </button>
        {user && <span className="font-medium">{user.username}</span>}
        <Dropdown
          menu={{ items: menuItems, onClick: handleMenuClick }}
          placement="bottomRight"
        >
          <Avatar
            size="large"
            icon={<UserOutlined />}
            className="cursor-pointer"
          />
        </Dropdown>
      </div>
    </Header>
  );
};

export default AppHeader;
