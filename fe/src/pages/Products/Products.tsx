import { useContext, useEffect, useState } from "react";
import { Button, message } from "antd";

import AppFilters, { type FilterConfig } from "../../components/common/AppFilters";
import categoryService from "../../services/CategoryService";
import productService from "../../services/ProductService";
import type { CategoriesResponse } from "../Categories/Types";
import type { PaginationMeta, Product, ProductQuery } from "./Type";
import { ThemeContext } from "../../contexts/ThemeContext";
import ProductsTable from "./ProductsTable";
import ModalProducts from "./Modal";

const Products = () => {
  const { isDark } = useContext(ThemeContext);
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
      message.error("Không tải được danh sách sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (values: Record<string, any>) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: values?.search ?? "",
      categoryId: values?.categoryId ?? "",
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
      message.success("Xóa sản phẩm thành công");
      fetchProducts();
    } catch (error) {
      console.error(error);
      message.error("Xóa sản phẩm thất bại");
    }
  };

  const productsFilter: FilterConfig[] = [
    {
      type: "input",
      name: "search",
      placeholder: "Tìm kiếm sản phẩm",
      label: "Tìm kiếm",
    },
    {
      type: "select",
      name: "categoryId",
      placeholder: "Chọn danh mục",
      options: [
        { label: "Tất cả", value: "" },
        ...categories.map((c) => ({ label: c.name, value: c.id })),
      ],
      label: "Danh mục",
    },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
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
          + Tạo sản phẩm mới
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
