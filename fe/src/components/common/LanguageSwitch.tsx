import { Select } from "antd";

import { useT } from "../../i18n";

// Tên ngôn ngữ luôn viết bằng chính ngôn ngữ đó, nên không nằm trong từ điển.
const OPTIONS = [
  { value: "vi" as const, label: "Tiếng Việt" },
  { value: "en" as const, label: "English" },
];

const LanguageSwitch = () => {
  const { lang, setLang, t } = useT();

  return (
    <Select
      size="small"
      value={lang}
      onChange={setLang}
      options={OPTIONS}
      style={{ width: 110 }}
      title={t("language")}
    />
  );
};

export default LanguageSwitch;
