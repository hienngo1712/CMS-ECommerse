import type { TKey } from "../../i18n";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPING",
  "DELIVERED",
  "CANCELED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Khoá dịch, không phải chữ hiển thị: nơi dùng gọi t(STATUS_KEY[status]).
// Dùng chung cho cả bảng lẫn màn chi tiết, để một trạng thái luôn hiện cùng
// một kiểu ở mọi nơi.
export const STATUS_KEY: Record<OrderStatus, TKey> = {
  PENDING: "statusPending",
  CONFIRMED: "statusConfirmed",
  SHIPPING: "statusShipping",
  DELIVERED: "statusDelivered",
  CANCELED: "statusCanceled",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "gold",
  CONFIRMED: "blue",
  SHIPPING: "cyan",
  DELIVERED: "green",
  CANCELED: "red",
};

// Phải khớp với STATUS_FLOW ở be/validators/orders.js. Lệch nhau thì UI sẽ chào
// mời một lựa chọn mà server chắc chắn từ chối.
export const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["SHIPPING", "CANCELED"],
  SHIPPING: ["DELIVERED", "CANCELED"],
  DELIVERED: [],
  CANCELED: [],
};

export type OrderAddress = {
  id: number;
  fullname: string;
  phone: string;
  street: string;
  city: string;
}

export type OrderItem = {
  id: number;
  quantity: number;
  price: number;
  variant: {
    id: number;
    size: string;
    color: {
      id: number;
      color: string;
      product: { id: number; name: string };
    };
  };
}

export type Order = {
  id: number;
  userId: number | null;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  address: OrderAddress | null;
  user: { id: number; username: string; email: string } | null;
  items: OrderItem[];
}

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export type OrderQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export type OrderListResponse = {
  data: Order[];
  meta: PaginationMeta;
}
