import type { OrderStatus } from "../Orders/Types";

export type LowStockRow = {
  variantId: number;
  product: string;
  color: string;
  size: string;
  stock: number;
}

export type RecentOrderRow = {
  id: number;
  customer: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
}

export type DashboardStats = {
  revenue: { delivered: number; pending: number };
  orders: { total: number; byStatus: Record<OrderStatus, number> };
  catalog: { products: number; categories: number };
  lowStock: LowStockRow[];
  recentOrders: RecentOrderRow[];
}
