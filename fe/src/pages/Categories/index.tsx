import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import AppFilters, {
  type FilterConfig,
} from "../../components/common/AppFilters.tsx";
import { Button, message } from "antd";
import TableCategories from "./Table.tsx";
import ModalCategories from "./Modal.tsx";
import categoryService from "../../services/CategoryService.ts";
import type { CategoriesResponse, CategoryQuery } from "./Types.ts";
// import { useDebounce } from "use-debounce";

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
  // const debounceSearch = useDebounce(query.search, 400); //chỗ này là nguyên nhân khiến API bị call liên tục
  const [idEditing, setIdEditing] = useState(0);
  const handleGetValueFilter = (values: Record<string, any>) => {
    console.log(values);
    setQuery((prev) => ({
      page: 1,
      search: values?.search,
      isActive: values?.isActive,
      limit: prev.limit,
    }));
  };
  // fetch data
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await categoryService.getCategories(query);

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
  // Open modal
  const handleToggleModal = () => {
    setIsOpen(!isOpen);
  };

  const handleChangePageSizeTable = (newPage: number, newSize: number) => {
    console.log(newPage, newSize);
    setQuery((prev) => ({
      ...prev,
      page: newPage,
      limit: newSize,
    }));
  };
  // button Edit
  const handleEditCategory = (id: number) => {
    setIsOpen(true);
    console.log(id);
    setIdEditing(id);
  };
  // button Delete
  const handleDeleteCategory = async (id: number) => {
    await categoryService
      .deleteCategory(id)
      .then(() => {
        fetchCategories();
        message.success("Xóa danh mục thành công");
      })
      .catch((error) => {
        message.error("Xóa danh mục thất bại");
      });
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
        onDelete={handleDeleteCategory}
        onEdit={handleEditCategory}
      />
      <ModalCategories
        open={isOpen}
        onClose={handleToggleModal}
        onSuccess={() => {
          fetchCategories();
        }}
        categoryId={idEditing}
      />
    </div>
  );
};

export default CategoriesPage;
