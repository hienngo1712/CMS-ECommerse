import { useContext, useEffect, useState } from "react";
import { App } from "antd";

import AppFilters, {
  asText,
  type FilterConfig,
  type FilterValues,
} from "../../components/common/AppFilters";
import orderService from "../../services/OrderService";
import { ThemeContext } from "../../contexts/ThemeContext";
import OrdersTable from "./Table";
import OrderDetail from "./Detail";
import type { Order, OrderQuery, PaginationMeta } from "./Types";
import { ORDER_STATUSES, STATUS_KEY } from "./Types";
import { useT } from "../../i18n";

const OrdersPage = () => {
  const { isDark } = useContext(ThemeContext);
  const { message } = App.useApp();
  const { t } = useT();

  const ordersFilter: FilterConfig[] = [
    {
      type: "input",
      name: "search",
      placeholder: t("searchOrderPlaceholder"),
      label: t("search"),
    },
    {
      type: "select",
      name: "status",
      placeholder: t("selectStatus"),
      options: [
        { label: t("all"), value: "" },
        ...ORDER_STATUSES.map((status) => ({
          label: t(STATUS_KEY[status]),
          value: status,
        })),
      ],
      label: t("status"),
    },
  ];
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
      message.error(t("loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (values: FilterValues) => {
    setQuery((prev) => ({
      ...prev,
      page: 1,
      search: asText(values.search),
      status: asText(values.status),
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
    // fetchOrders được tạo lại sau mỗi lần render nên đưa vào deps sẽ khiến
    // effect chạy lại vô hạn. Liệt kê từng trường của query là cố ý.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
