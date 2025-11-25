import React from "react";
import type { CategoriesResponse } from "./Types";
import { Tag } from "antd";

type Props = {
  categories: CategoriesResponse[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
};

const TableCategories = ({
  categories,
  page,
  pageSize,
  isLoading,
  onDelete,
  onEdit,
  onPageChange,
}: Props) => {
  const columns = [
    {
      title: "Tên danh mục",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
    },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      key: "isActive",
      render: (active: boolean) =>
        active ? (
          <Tag color="green">Hoạt động</Tag>
        ) : (
          <Tag color="red">Tắt</Tag>
        ),
    },
    {
      title: "Hành động",
      dataIndex: "actions",
      key: "actions",
      render: (text: string) => <b>{text}</b>,
    },
  ];
  return <div>TableCategories</div>;
};

export default TableCategories;
