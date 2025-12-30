import React, { useContext, useEffect, useState } from "react";
import type { FilterConfig } from "../../components/common/AppFilters";
import categoryService from "../../services/CategoryService";
import type { CategoriesResponse } from "../Categories/Types";
import { ThemeContext } from "../../contexts/ThemeContext";
import AppFilters from "../../components/common/AppFilters";
import { Button } from "antd";
import ProductsTable from "./ProductsTable";

type Props = {};

const Products = (props: Props) => {
  const [categories, setCategories] = useState<CategoriesResponse[]>([]);
  const { isModalVisivle, setIsModalVisible } = useState(false);
  const { isDark } = useContext(ThemeContext);
  const fetchCategories = async () => {
    try {
      const res = await categoryService.getCategories({
        isActive: true,
        page: 1,
        limit: 100,
      });
      console.log(res);
      setCategories(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };
  const handleFilterChange = (values: Record<string, any>) => {
    console.log(values);
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
      options: categories.map((c) => ({ label: c.name, value: c.id })),
      label: "Giỏ hàng",
    },
  ];

  useEffect(() => {
    fetchCategories();
  }, []);
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 8,
        background: isDark ? "#262626" : "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          alignItems: "flex-end",
        }}
      >
        <AppFilters filters={productsFilter} onChange={handleFilterChange} />
        <Button
          type="primary"
          onClick={() => {
            setIsModalVisible(true);
          }}
        >
          + Tạo sản phẩm mới
        </Button>
      </div>
      <ProductsTable products={[]} />
    </div>
  );
};

export default Products;
