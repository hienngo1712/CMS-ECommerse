import { Table } from "antd";
import type { Product } from "./Type";
import TableActions from "../../components/common/TableAction";

type Props = {
  products: Product[];
  loading?: boolean;
  onEdit?: (product: Product) => void;
  onDelete?: (id: number) => void;
  pagination?: any;
  onChange?: (pagination: any) => void;
};

const getVariants = (record: Product) =>
  (record.colors || []).flatMap((c) => c.variants || []);

export default function ProductsTable({
  products,
  loading,
  onEdit,
  onDelete,
  pagination,
  onChange,
}: Props) {
  const columns = [
    {
      title: "Ảnh",
      key: "image",
      width: 80,
      render: (_: unknown, record: Product) => {
        const imageUrl = record.colors?.[0]?.images?.[0]?.imageUrl;
        return imageUrl ? (
          <img
            src={imageUrl}
            alt={record.name}
            style={{
              width: 48,
              height: 48,
              objectFit: "cover",
              borderRadius: 4,
            }}
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
    },
    {
      title: "Giá",
      key: "price",
      render: (_: unknown, record: Product) => {
        const prices = getVariants(record).map((v) => v.price);
        if (!prices.length) return "-";
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return min === max
          ? min.toLocaleString("vi-VN")
          : `${min.toLocaleString("vi-VN")} - ${max.toLocaleString("vi-VN")}`;
      },
    },
    {
      title: "Tổng kho",
      key: "stock",
      render: (_: unknown, record: Product) =>
        getVariants(record).reduce((sum, v) => sum + v.stock, 0),
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: unknown, record: Product) => (
        <TableActions
          showEdit
          showDelete
          onEdit={() => onEdit?.(record)}
          onDelete={() => onDelete?.(record.id)}
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
      pagination={pagination}
      onChange={onChange}
    />
  );
}
