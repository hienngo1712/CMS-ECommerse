import { useContext, useEffect, useState } from "react";
import { App } from "antd";

import AppFilters, { type FilterConfig } from "../../components/common/AppFilters";
import orderService from "../../services/OrderService";
import { ThemeContext } from "../../contexts/ThemeContext";
import OrdersTable from "./Table";
import OrderDetail from "./Detail";
import type { Order, OrderQuery, PaginationMeta } from "./Types";
import { ORDER_STATUSES, STATUS_LABEL } from "./Types";

const ordersFilter: FilterConfig[] = [
  {
    type: "input",
    name: "search",
    placeholder: "Tên hoặc số điện thoại",
    label: "Tìm kiếm",
  },
  {
    type: "select",
    name: "status",
    placeholder: "Chọn trạng thái",
    options: [
      { label: "Tất cả", value: "" },
      ...ORDER_STATUSES.map((status) => ({
        label: STATUS_LABEL[status],
        value: status,
      })),
    ],
    label: "Trạng thái",
  },
];

const OrdersPage = () => {
  const { isDark } = useContext(ThemeContext);
  const { message } = App.useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    pageCount: 0,
  });
  const [query, setQuery] = useState<OrderQuery>({
    page: 1,
    limit: 10,
    search: "",
    status: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | undefined>(undefined);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const res = await orderService.getOrders(query);
      setOrders(res.data);
      setMeta(res.meta);
    } catch (error) {
      console.error(error);
      message.error("Không tải được danh sách đơn hàng");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (values: Record<string, any>) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: values?.search ?? "",
      status: values?.status ?? "",
    }));
  };

  const handlePageChange = (page: number, limit: number) => {
    setQuery((prev) => ({ ...prev, page, limit }));
  };

  const handleView = (id: number) => {
    setViewingId(id);
    setIsOpen(true);
  };

  useEffect(() => {
    fetchOrders();
  }, [query.page, query.limit, query.search, query.status]);

  return (
    <div
      style={{
        padding: 24,
        borderRadius: 8,
        background: isDark ? "#262626" : "#fff",
        boxShadow: isDark
          ? "0 2px 8px rgba(0, 0, 0, 0.6)"
          : "0 2px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="flex items-end justify-between mb-10">
        <AppFilters filters={ordersFilter} onChange={handleFilterChange} />
      </div>

      <OrdersTable
        orders={orders}
        loading={isLoading}
        total={meta.total}
        page={query.page}
        pageSize={query.limit}
        onPageChange={handlePageChange}
        onView={handleView}
      />

      <OrderDetail
        open={isOpen}
        orderId={viewingId}
        onClose={() => setIsOpen(false)}
        onUpdated={fetchOrders}
      />
    </div>
  );
};

export default OrdersPage;
