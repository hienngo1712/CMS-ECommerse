import { useContext } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import AppFilters, {type FilterConfig} from "../../components/common/AppFilters.tsx";
import {Button} from "antd";

type Props = {};

const categoriesFilter: FilterConfig[] = [
    {
        type: "input",
        name: "search",
        placeholder: "Nhập chữ vào",
        label: "Tìm kiếm",
    },
    {
        type: "select",
        name: "isActive",
        placeholder: "Lựa chọn",
        options: [
            {
                label: "Tất cả",
                value: 0,
            },
            {
                label: "Hoạt động",
                value: 1,
            },
            {
                label: "Không hoạt động",
                value: 2,
            },
        ],
        label: "Trạng thái",
    },
];

const CategoriesPage = (props: Props) => {
  const { isDark } = useContext(ThemeContext);
  const handleGetValueFilter = () =>{}
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 8,
        background: isDark ? "#262626" : "#fff",
        boxShadow: isDark ? "0 2px 8px rgba(0, 0, 0, 0.6)" : "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className={"flex items-end justify-between"}><AppFilters filters={categoriesFilter} onChange={handleGetValueFilter} />
        <Button type={"primary"}>+ Tạo danh mục mới </Button>
      </div>
    </div>
  );
};

export default CategoriesPage;
