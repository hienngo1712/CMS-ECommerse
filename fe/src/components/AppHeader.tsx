import { Avatar, Dropdown, Layout } from "antd";
import {
  BulbOutlined,
  KeyOutlined,
  LogoutOutlined,
  MoonOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../contexts/ThemeContext";
import { AuthContext } from "../contexts/AuthContext";
import ChangePasswordModal from "./ChangePasswordModal";

const { Header } = Layout;

const AppHeader = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

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
      key: "change-password",
      icon: <KeyOutlined />,
      label: "Đổi mật khẩu",
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
    if (key === "change-password") {
      setIsPasswordOpen(true);
      return;
    }
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

      <ChangePasswordModal
        open={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
      />
    </Header>
  );
};

export default AppHeader;
