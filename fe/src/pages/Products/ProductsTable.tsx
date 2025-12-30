import { Table } from "antd";
import type { Product } from "./Type";

type Props = {
  products: Product[];
  loading?: Boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (id: number) => void;
  pagination?: any;
  onChange?: (pagination: any) => void;
};

export default function ProductsTable({
  products,
  loading,
  onEdit,
  onDelete,
  pagination,
  onChange,
}: Props) {
  console.log(products, loading);

  const columns = [
    {
      title: "Ảnh",
      key: "image",
      with: 80,
    },
    {
      title: "Tên sản phẩm",
      key: "name",
      dataIndex: "name",
    },
    {
      title: "Giá",
      key: "price",
    },
    {
      title: "Tổng kho",
      key: "stock",
    },
    {
      title: "Hành động",
      key: "action",
    },
  ];
  return <Table columns={columns} />;
}
