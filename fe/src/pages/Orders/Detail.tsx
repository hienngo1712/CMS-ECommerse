import { useEffect, useState } from "react";
import { App, Button, Descriptions, Drawer, Select, Space, Spin, Table, Tag } from "antd";
import axios from "axios";

import orderService from "../../services/OrderService";
import type { Order, OrderItem, OrderStatus } from "./Types";
import { STATUS_COLOR, STATUS_FLOW, STATUS_KEY } from "./Types";
import { formatDateTime, formatMoney } from "./orderUtils";
import { useT } from "../../i18n";

type Props = {
  open: boolean;
  orderId?: number;
  onClose: () => void;
  onUpdated: () => void;
};

const OrderDetail = ({ open, orderId, onClose, onUpdated }: Props) => {
  const { message } = App.useApp();
  const { t } = useT();
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
        message.error(t("loadFailed"));
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [open, orderId, message, t]);

  const handleSaveStatus = async () => {
    if (!order || !nextStatus) return;

    try {
      setSaving(true);
      const updated = await orderService.updateStatus(order.id, nextStatus);
      setOrder(updated);
      setNextStatus(undefined);
      message.success(t("statusChanged"));
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
        message.error(t("saveFailed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const itemColumns = [
    {
      title: t("product"),
      key: "product",
      render: (_: unknown, item: OrderItem) => item.variant.color.product.name,
    },
    {
      title: t("color"),
      key: "color",
      render: (_: unknown, item: OrderItem) => item.variant.color.color,
    },
    {
      title: t("size"),
      key: "size",
      render: (_: unknown, item: OrderItem) => item.variant.size,
    },
    {
      title: t("quantityShort"),
      key: "quantity",
      render: (_: unknown, item: OrderItem) => item.quantity,
    },
    {
      title: t("unitPrice"),
      key: "price",
      render: (_: unknown, item: OrderItem) => formatMoney(item.price),
    },
    {
      title: t("subtotal"),
      key: "subtotal",
      render: (_: unknown, item: OrderItem) => formatMoney(item.price * item.quantity),
    },
  ];

  // Chỉ chào những trạng thái server chấp nhận từ trạng thái hiện tại.
  const allowedNext = order ? STATUS_FLOW[order.status] : [];

  return (
    <Drawer
      title={order ? t("orderNumber", { id: order.id }) : t("orderDetail")}
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
            <Descriptions.Item label={t("status")}>
              <Tag color={STATUS_COLOR[order.status]}>{t(STATUS_KEY[order.status])}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t("orderDate")}>
              {formatDateTime(order.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label={t("receiver")}>
              {order.address?.fullname ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label={t("phone")}>
              {order.address?.phone ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label={t("address")} span={2}>
              {order.address
                ? `${order.address.street}, ${order.address.city}`
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label={t("orderedBy")} span={2}>
              {order.user ? `${order.user.username} (${order.user.email})` : t("guest")}
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
                  <b>{t("total")}</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  <b>{formatMoney(order.totalAmount)}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />

          <div className="mt-6">
            {allowedNext.length === 0 ? (
              <span className="text-gray-500">{t("finalStatus")}</span>
            ) : (
              <Space>
                <Select
                  placeholder={t("changeStatusTo")}
                  style={{ width: 200 }}
                  value={nextStatus}
                  onChange={setNextStatus}
                  options={allowedNext.map((status) => ({
                    label: t(STATUS_KEY[status]),
                    value: status,
                  }))}
                />
                <Button
                  type="primary"
                  disabled={!nextStatus}
                  loading={saving}
                  onClick={handleSaveStatus}
                >
                  {t("update")}
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
