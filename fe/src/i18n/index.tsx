import React, { useContext, useEffect, useState } from "react";
import enUS from "antd/locale/en_US";
import viVN from "antd/locale/vi_VN";
import type { Locale } from "antd/es/locale";

import en from "./en.json";
import vi from "./vi.json";

export type Lang = "vi" | "en";

// Khoá dịch = đúng những khoá có trong vi.json. Gõ sai một chữ là lỗi lúc
// biên dịch chứ không phải một ô trống phát hiện được trên trình duyệt.
export type TKey = keyof typeof vi;

// Hai dòng này bắt hai file phải phủ nhau: thêm khoá vào một bên mà quên bên
// kia thì `tsc -b` báo lỗi ngay, và CI đang chạy `tsc -b` trong `npm run build`.
const VI: Record<keyof typeof en, string> = vi;
const EN: Record<keyof typeof vi, string> = en;

const DICTIONARIES: Record<Lang, Record<TKey, string>> = { vi: VI, en: EN };

// antd tự dịch phần chữ của chính nó (phân trang, ô chọn, bảng rỗng...).
const ANTD_LOCALES: Record<Lang, Locale> = { vi: viVN, en: enUS };

const STORAGE_KEY = "lang";

type Params = Record<string, string | number>;

// Thay {name} bằng params.name. Không tìm thấy tham số thì giữ nguyên chỗ
// trống để nhìn là biết thiếu, thay vì in ra "undefined".
const interpolate = (text: string, params?: Params) =>
  params
    ? text.replace(/\{(\w+)\}/g, (whole, key: string) =>
        key in params ? String(params[key]) : whole
      )
    : text;

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  antdLocale: Locale;
  t: (key: TKey, params?: Params) => string;
};

// eslint-disable-next-line react-refresh/only-export-components
export const I18nContext = React.createContext<I18nContextType>({
  lang: "vi",
  setLang: () => {},
  antdLocale: viVN,
  t: (key) => VI[key],
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLang] = useState<Lang>(() =>
    localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "vi"
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    // Cho trình duyệt và trình đọc màn hình biết trang đang là tiếng gì.
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TKey, params?: Params) =>
    interpolate(DICTIONARIES[lang][key], params);

  return (
    <I18nContext.Provider
      value={{ lang, setLang, antdLocale: ANTD_LOCALES[lang], t }}
    >
      {children}
    </I18nContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useT = () => useContext(I18nContext);
