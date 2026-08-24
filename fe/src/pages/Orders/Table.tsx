import { Button, Table, Tag } from "antd";

import type { Order } from "./Types";
import { STATUS_COLOR, STATUS_KEY } from "./Types";
import { formatDateTime, formatMoney, getCustomerName, getTotalQuantity } from "./orderUtils";
import { useT } from "../../i18n";

type Props = {
  orders: Order[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onView: (id: number) => void;
};

const OrdersTable = ({
  orders,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onView,
}: Props) => {
  const { t } = useT();

  const columns = [
    {
      title: t("orderId"),
      key: "id",
      width: 90,
      render: (_: unknown, record: Order) => <b>#{record.id}</b>,
    },
    {
      title: t("customer"),
      key: "customer",
      render: (_: unknown, record: Order) => getCustomerName(record) ?? t("guest"),
    },
    {
      title: t("phone"),
      key: "phone",
      render: (_: unknown, record: Order) => record.address?.phone ?? "-",
    },
    {
      title: t("quantity"),
      key: "quantity",
      width: 100,
      render: (_: unknown, record: Order) => getTotalQuantity(record),
    },
    {
      title: t("total"),
      key: "total",
      render: (_: unknown, record: Order) => formatMoney(record.totalAmount),
    },
    {
      title: t("status"),
      key: "status",
      render: (_: unknown, record: Order) => (
        <Tag color={STATUS_COLOR[record.status]}>{t(STATUS_KEY[record.status])}</Tag>
      ),
    },
    {
      title: t("orderDate"),
      key: "createdAt",
      render: (_: unknown, record: Order) => formatDateTime(record.createdAt),
    },
    {
      title: t("action"),
      key: "actions",
      width: 110,
      render: (_: unknown, record: Order) => (
        <Button type="link" onClick={() => onView(record.id)}>
          {t("view")}
        </Button>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={orders}
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
};

export default OrdersTable;
