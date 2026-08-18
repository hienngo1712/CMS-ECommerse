import type {
  Order,
  OrderListResponse,
  OrderQuery,
  OrderStatus,
} from "../pages/Orders/Types";
import axiosInstance from "../utils/axiosInstance";

const orderService = {
  getOrders: async (params: OrderQuery) => {
    const res = await axiosInstance.get<OrderListResponse>("/orders", { params });
    return res.data;
  },

  getOrderById: async (id: number) => {
    const res = await axiosInstance.get<Order>(`/orders/${id}`);
    return res.data;
  },

  updateStatus: async (id: number, status: OrderStatus) => {
    const res = await axiosInstance.put<Order>(`/orders/${id}/status`, { status });
    return res.data;
  },
};

export default orderService;
