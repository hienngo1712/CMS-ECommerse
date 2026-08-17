import { Table } from "antd";
import type { Product } from "./Type";
import TableActions from "../../components/common/TableAction";
import { formatPriceRange, getFirstImageUrl, getTotalStock } from "./productUtils";

type Props = {
  products: Product[];
  loading?: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
};

export default function ProductsTable({
  products,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
}: Props) {
  const columns = [
    {
      title: "Ảnh",
      key: "image",
      width: 80,
      render: (_: unknown, record: Product) => {
        const imageUrl = getFirstImageUrl(record);
        return imageUrl ? (
          <img
            src={imageUrl}
            alt={record.name}
            style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }}
          />
        ) : (
          "-"
        );
      },
    },
    {
      title: "Tên sản phẩm",
      key: "name",
      dataIndex: "name",
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: "Danh mục",
      key: "category",
      render: (_: unknown, record: Product) => record.category?.name ?? "-",
    },
    {
      title: "Giá",
      key: "price",
      render: (_: unknown, record: Product) => formatPriceRange(record),
    },
    {
      title: "Tổng kho",
      key: "stock",
      render: (_: unknown, record: Product) => getTotalStock(record),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: unknown, record: Product) => (
        <TableActions
          showEdit
          showDelete
          onEdit={() => onEdit(record)}
          onDelete={() => onDelete(record.id)}
        />
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={products}
      loading={loading}
      rowKey="id"
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        onChange: onPageChange,
      }}
    />
  );
}
