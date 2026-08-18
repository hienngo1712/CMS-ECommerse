import { Button, Table, Tag } from "antd";

import type { Order } from "./Types";
import { STATUS_COLOR, STATUS_LABEL } from "./Types";
import { formatDateTime, formatMoney, getCustomerName, getTotalQuantity } from "./orderUtils";

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
  const columns = [
    {
      title: "Mã đơn",
      key: "id",
      width: 90,
      render: (_: unknown, record: Order) => <b>#{record.id}</b>,
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_: unknown, record: Order) => getCustomerName(record),
    },
    {
      title: "Điện thoại",
      key: "phone",
      render: (_: unknown, record: Order) => record.address?.phone ?? "-",
    },
    {
      title: "Số lượng",
      key: "quantity",
      width: 100,
      render: (_: unknown, record: Order) => getTotalQuantity(record),
    },
    {
      title: "Tổng tiền",
      key: "total",
      render: (_: unknown, record: Order) => formatMoney(record.totalAmount),
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_: unknown, record: Order) => (
        <Tag color={STATUS_COLOR[record.status]}>{STATUS_LABEL[record.status]}</Tag>
      ),
    },
    {
      title: "Ngày đặt",
      key: "createdAt",
      render: (_: unknown, record: Order) => formatDateTime(record.createdAt),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 110,
      render: (_: unknown, record: Order) => (
        <Button type="link" onClick={() => onView(record.id)}>
          Xem
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
