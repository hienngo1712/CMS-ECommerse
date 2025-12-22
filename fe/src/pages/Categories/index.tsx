import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import AppFilters, {
  type FilterConfig,
} from "../../components/common/AppFilters.tsx";
import { Button } from "antd";
import TableCategories from "./Table.tsx";
import ModalCategories from "./Modal.tsx";
import categoryService from "../../services/CategoryService.ts";
import type { CategoriesResponse, CategoryQuery } from "./Types.ts";

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
        value: "true",
      },
      {
        label: "Không hoạt động",
        value: "false",
      },
    ],
    label: "Trạng thái",
  },
];

const CategoriesPage = (props: Props) => {
  const { isDark } = useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState<CategoryQuery>({
    search: "",
    isActive: "",
    page: 1,
    limit: 10,
  });

  const [categories, setCategories] = useState<CategoriesResponse[]>([]);
  const handleGetValueFilter = (values: Record<string, any>) => {
    console.log(values);
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: values?.search,
      isActive: values?.isActive,
    }));
  };
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await categoryService.getCategories(query);
      console.log("Check res.data", res.data);

      setCategories(res.data);
      setQuery((prev) => ({
        ...prev,
        page: res.meta.page,
        limit: res.meta.limit,
        meta: res.meta,
      }));
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.log(error);
    }
  };
  const handleToggleModal = () => {
    setIsOpen(!isOpen);
  };
  console.log("Categories", categories);
  console.log("Query", query);

  const handleChangePageSizeTable = (newPage: number, newSize: number) => {
    console.log(newPage, newSize);
    setQuery((prev) => ({
      ...prev,
      page: newPage,
      limit: newSize,
    }));
  };
  useEffect(() => {
    fetchCategories();
  }, [query.page, query.limit, query.search, query.isActive]);
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 8,
        background: isDark ? "#262626" : "#fff",
        boxShadow: isDark
          ? "0 2px 8px rgba(0, 0, 0, 0.6)"
          : "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className={"flex items-end justify-between mb-10"}>
        <AppFilters
          filters={categoriesFilter}
          onChange={handleGetValueFilter}
        />
        <Button onClick={handleToggleModal} type={"primary"}>
          + Tạo danh mục mới{" "}
        </Button>
      </div>
      <TableCategories
        loading={isLoading}
        page={query.page}
        pageSize={query.limit}
        total={query?.meta?.total ?? 0}
        categories={categories || []}
        onPageChange={handleChangePageSizeTable}
        onDelete={() => {}}
        onEdit={() => {}}
      />
      <ModalCategories
        open={isOpen}
        onClose={handleToggleModal}
        onSuccess={() => {
          fetchCategories();
        }}
      />
    </div>
  );
};

export default CategoriesPage;
