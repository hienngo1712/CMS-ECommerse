import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import AppFilters, {
  asText,
  type FilterConfig,
  type FilterValues,
} from "../../components/common/AppFilters.tsx";
import { App, Button, Space } from "antd";
import TableCategories from "./Table.tsx";
import ModalCategories from "./Modal.tsx";
import categoryService from "../../services/CategoryService.ts";
import type { CategoriesResponse, CategoryQuery } from "./Types.ts";
import { useT } from "../../i18n";
import ExportButton from "../../components/common/ExportButton.tsx";
import type { ExcelColumn } from "../../utils/exportExcel.ts";

const CategoriesPage = () => {
  const { isDark } = useContext(ThemeContext);
  const { message } = App.useApp();
  const { t } = useT();

  const categoriesFilter: FilterConfig[] = [
    {
      type: "input",
      name: "search",
      placeholder: t("searchPlaceholder"),
      label: t("search"),
    },
    {
      type: "select",
      name: "isActive",
      placeholder: t("selectStatus"),
      options: [
        { label: t("all"), value: "" },
        { label: t("active"), value: "true" },
        { label: t("inactive"), value: "false" },
      ],
      label: t("status"),
    },
  ];
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState<CategoryQuery>({
    search: "",
    isActive: "",
    page: 1,
    limit: 10,
  });

  const [categories, setCategories] = useState<CategoriesResponse[]>([]);
  // Debounce nằm trong AppFilters, không cần xử lý ở đây
  const [idEditing, setIdEditing] = useState(0);
  const handleGetValueFilter = (values: FilterValues) => {
    setQuery((prev) => ({
      page: 1,
      search: asText(values.search),
      isActive: asText(values.isActive),
      limit: prev.limit,
    }));
  };
  const exportColumns: ExcelColumn<CategoriesResponse>[] = [
    { header: t("categoryName"), value: (row) => row.name, width: 30 },
    { header: t("slug"), value: (row) => row.slug, width: 30 },
    { header: t("status"), value: (row) => (row.isActive ? t("active") : t("off")) },
  ];

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
      console.error(error);
    }
  };
  // button Tạo mới: phải reset idEditing, nếu không modal vẫn ở chế độ sửa
  // của danh mục vừa chỉnh và bấm OK sẽ ghi đè danh mục đó
  const handleCreateCategory = () => {
    setIdEditing(0);
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
  };

  const handleChangePageSizeTable = (newPage: number, newSize: number) => {
    setQuery((prev) => ({
      ...prev,
      page: newPage,
      limit: newSize,
    }));
  };
  // button Edit
  const handleEditCategory = (id: number) => {
    setIsOpen(true);
    setIdEditing(id);
  };
  // button Delete
  const handleDeleteCategory = async (id: number) => {
    await categoryService
      .deleteCategory(id)
      .then(() => {
        fetchCategories();
        message.success(t("deleteSuccess"));
      })
      .catch(() => {
        message.error(t("deleteFailed"));
      });
  };
  useEffect(() => {
    fetchCategories();
    // Liệt kê từng trường là cố ý. fetchCategories ghi meta ngược lại vào query,
    // nên phụ thuộc cả object query sẽ thành vòng lặp vô hạn; còn phụ thuộc
    // chính fetchCategories cũng vậy vì hàm được tạo lại sau mỗi lần render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Space>
          <ExportButton
            fileName="danh-muc"
            sheetName={t("category")}
            columns={exportColumns}
            fetchPage={(page, limit) =>
              categoryService.getCategories({
                search: query.search,
                isActive: query.isActive,
                page,
                limit,
              })
            }
          />
          <Button onClick={handleCreateCategory} type={"primary"}>
            + {t("createCategory")}
          </Button>
        </Space>
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
        onClose={handleCloseModal}
        onSuccess={() => {
          fetchCategories();
        }}
        categoryId={idEditing}
      />
    </div>
  );
};

export default CategoriesPage;
