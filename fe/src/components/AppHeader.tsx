import { Avatar, Dropdown, Layout, Menu } from "antd";
import { BulbOutlined, MoonOutlined, UserOutlined } from "@ant-design/icons";
import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";

const { Header } = Layout;
type Props = {};

const AppHeader = (props: Props) => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const menu = (
    <Menu
      items={[
        {
          key: "profile",
          label: "Profile",
        },
        {
          key: "settings",
          label: "Settings",
        },
      ]}
    ></Menu>
  );
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
        <Dropdown overlay={menu} placement="bottomRight">
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
