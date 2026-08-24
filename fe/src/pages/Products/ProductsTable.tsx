import { Table } from "antd";
import type { Product } from "./Type";
import TableActions from "../../components/common/TableAction";
import { formatPriceRange, getFirstImageUrl, getTotalStock } from "./productUtils";
import { useT } from "../../i18n";

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
  const { t } = useT();

  const columns = [
    {
      title: t("image"),
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
      title: t("productName"),
      key: "name",
      dataIndex: "name",
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: t("category"),
      key: "category",
      render: (_: unknown, record: Product) => record.category?.name ?? "-",
    },
    {
      title: t("price"),
      key: "price",
      render: (_: unknown, record: Product) => formatPriceRange(record),
    },
    {
      title: t("totalStock"),
      key: "stock",
      render: (_: unknown, record: Product) => getTotalStock(record),
    },
    {
      title: t("action"),
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
