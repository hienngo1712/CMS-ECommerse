import { useEffect, useState } from "react";
import { App, Button, Descriptions, Drawer, Select, Space, Spin, Table, Tag } from "antd";
import axios from "axios";

import orderService from "../../services/OrderService";
import type { Order, OrderItem, OrderStatus } from "./Types";
import { STATUS_COLOR, STATUS_FLOW, STATUS_LABEL } from "./Types";
import { formatDateTime, formatMoney } from "./orderUtils";

type Props = {
  open: boolean;
  orderId?: number;
  onClose: () => void;
  onUpdated: () => void;
};

const OrderDetail = ({ open, orderId, onClose, onUpdated }: Props) => {
  const { message } = App.useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextStatus, setNextStatus] = useState<OrderStatus | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;

    // Mở nhanh hai đơn liên tiếp thì phản hồi của đơn cũ có thể về sau và ghi
    // đè đơn đang xem. Cờ này bỏ qua kết quả của lần gọi đã cũ.
    let ignore = false;
    setLoading(true);
    setOrder(null);
    setNextStatus(undefined);

    orderService
      .getOrderById(orderId)
      .then((data) => {
        if (ignore) return;
        setOrder(data);
      })
      .catch((error) => {
        if (ignore) return;
        console.error(error);
        message.error("Không tải được chi tiết đơn");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [open, orderId, message]);

  const handleSaveStatus = async () => {
    if (!order || !nextStatus) return;

    try {
      setSaving(true);
      const updated = await orderService.updateStatus(order.id, nextStatus);
      setOrder(updated);
      setNextStatus(undefined);
      message.success("Đã đổi trạng thái đơn");
      onUpdated();
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const serverError = axios.isAxiosError(error)
        ? error.response?.data?.error
        : undefined;

      if (status && status >= 400 && status < 500 && serverError) {
        message.error(String(serverError));
      } else {
        console.error(error);
        message.error("Đổi trạng thái thất bại");
      }
    } finally {
      setSaving(false);
    }
  };

  const itemColumns = [
    {
      title: "Sản phẩm",
      key: "product",
      render: (_: unknown, item: OrderItem) => item.variant.color.product.name,
    },
    {
      title: "Màu",
      key: "color",
      render: (_: unknown, item: OrderItem) => item.variant.color.color,
    },
    {
      title: "Size",
      key: "size",
      render: (_: unknown, item: OrderItem) => item.variant.size,
    },
    {
      title: "SL",
      key: "quantity",
      render: (_: unknown, item: OrderItem) => item.quantity,
    },
    {
      title: "Đơn giá",
      key: "price",
      render: (_: unknown, item: OrderItem) => formatMoney(item.price),
    },
    {
      title: "Thành tiền",
      key: "subtotal",
      render: (_: unknown, item: OrderItem) => formatMoney(item.price * item.quantity),
    },
  ];

  // Chỉ chào những trạng thái server chấp nhận từ trạng thái hiện tại.
  const allowedNext = order ? STATUS_FLOW[order.status] : [];

  return (
    <Drawer
      title={order ? `Đơn hàng #${order.id}` : "Chi tiết đơn hàng"}
      open={open}
      onClose={onClose}
      width={780}
    >
      {loading && (
        <div className="flex justify-center py-10">
          <Spin />
        </div>
      )}

      {!loading && order && (
        <>
          <Descriptions bordered column={2} size="small" className="mb-6">
            <Descriptions.Item label="Trạng thái">
              <Tag color={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày đặt">
              {formatDateTime(order.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="Người nhận">
              {order.address?.fullname ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Điện thoại">
              {order.address?.phone ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={2}>
              {order.address
                ? `${order.address.street}, ${order.address.city}`
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Tài khoản đặt" span={2}>
              {order.user ? `${order.user.username} (${order.user.email})` : "Khách vãng lai"}
            </Descriptions.Item>
          </Descriptions>

          <Table
            columns={itemColumns}
            dataSource={order.items}
            rowKey="id"
            pagination={false}
            size="small"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <b>Tổng tiền</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  <b>{formatMoney(order.totalAmount)}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />

          <div className="mt-6">
            {allowedNext.length === 0 ? (
              <span className="text-gray-500">
                Đơn đã ở trạng thái cuối, không đổi được nữa.
              </span>
            ) : (
              <Space>
                <Select
                  placeholder="Chuyển sang"
                  style={{ width: 200 }}
                  value={nextStatus}
                  onChange={setNextStatus}
                  options={allowedNext.map((status) => ({
                    label: STATUS_LABEL[status],
                    value: status,
                  }))}
                />
                <Button
                  type="primary"
                  disabled={!nextStatus}
                  loading={saving}
                  onClick={handleSaveStatus}
                >
                  Cập nhật
                </Button>
              </Space>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
};

export default OrderDetail;
