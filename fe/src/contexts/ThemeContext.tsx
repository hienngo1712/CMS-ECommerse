import { ConfigProvider } from "antd";
import React, { useEffect, useState } from "react";
type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
};
export const ThemeContext = React.createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
});

//tạo ra provider để bọc components nằm trong provider

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved ? JSON.parse(saved) : false;
  });
  //useEffect dùng để query và set dữ liệu
  useEffect(() => {
    const html = document.querySelector("html");
    if (isDark) {
      html?.classList.add("dark");
    } else {
      html?.classList.remove("dark");
    }
    localStorage.setItem("theme", JSON.stringify(isDark));
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <ConfigProvider
        theme={{
          token: {
            colorText: isDark ? "#f7f7f7" : "#141414",
            fontSize: 14,
          },
          components: {
            Layout: {
              headerBg: isDark ? "#1f1f1f" : "#fff",
              siderBg: isDark ? "#141414" : "#f7f7f7",
              bodyBg: isDark ? "#1e1e1e" : "#f0f2f5",
            },
            Menu: {
              darkItemBg: isDark ? "#141414" : "#f7f7f7",
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};
