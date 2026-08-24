import { useContext, useEffect, useState } from "react";
import { App, Button } from "antd";

import AppFilters, {
  asText,
  type FilterConfig,
  type FilterValues,
} from "../../components/common/AppFilters";
import categoryService from "../../services/CategoryService";
import productService from "../../services/ProductService";
import type { CategoriesResponse } from "../Categories/Types";
import type { PaginationMeta, Product, ProductQuery } from "./Type";
import { ThemeContext } from "../../contexts/ThemeContext";
import ProductsTable from "./ProductsTable";
import ModalProducts from "./Modal";
import { useT } from "../../i18n";

const Products = () => {
  const { isDark } = useContext(ThemeContext);
  const { message } = App.useApp();
  const { t } = useT();
  const [categories, setCategories] = useState<CategoriesResponse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    pageCount: 0,
  });
  const [query, setQuery] = useState<ProductQuery>({
    page: 1,
    limit: 10,
    search: "",
    categoryId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  const fetchCategories = async () => {
    try {
      const res = await categoryService.getCategories({
        isActive: true,
        page: 1,
        limit: 100,
      });
      setCategories(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await productService.getProducts(query);
      setProducts(res.data);
      setMeta(res.meta);
    } catch (error) {
      console.error(error);
      message.error(t("loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (values: FilterValues) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: asText(values.search),
      categoryId: asText(values.categoryId),
    }));
  };

  const handlePageChange = (page: number, limit: number) => {
    setQuery((prev) => ({ ...prev, page, limit }));
  };

  const handleCreate = () => {
    setEditingId(undefined);
    setIsOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await productService.deleteProduct(id);
      message.success(t("deleteSuccess"));
      fetchProducts();
    } catch (error) {
      console.error(error);
      message.error(t("deleteFailed"));
    }
  };

  const productsFilter: FilterConfig[] = [
    {
      type: "input",
      name: "search",
      placeholder: t("searchPlaceholder"),
      label: t("search"),
    },
    {
      type: "select",
      name: "categoryId",
      placeholder: t("selectCategory"),
      options: [
        { label: t("all"), value: "" },
        ...categories.map((c) => ({ label: c.name, value: c.id })),
      ],
      label: t("category"),
    },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
    // fetchProducts được tạo lại sau mỗi lần render nên đưa vào deps sẽ khiến
    // effect chạy lại vô hạn. Liệt kê từng trường của query là cố ý.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.page, query.limit, query.search, query.categoryId]);

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
      <div className="flex items-end justify-between mb-10">
        <AppFilters filters={productsFilter} onChange={handleFilterChange} />
        <Button type="primary" onClick={handleCreate}>
          + {t("createProduct")}
        </Button>
      </div>

      <ProductsTable
        products={products}
        loading={isLoading}
        total={meta.total}
        page={query.page}
        pageSize={query.limit}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ModalProducts
        open={isOpen}
        productId={editingId}
        categories={categories}
        onClose={() => setIsOpen(false)}
        onSuccess={fetchProducts}
      />
    </div>
  );
};

export default Products;
