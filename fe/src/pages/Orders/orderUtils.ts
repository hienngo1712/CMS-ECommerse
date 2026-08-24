import type { Order } from "./Types";

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("vi-VN").format(amount);

export const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Số mặt hàng thực nhận, không phải số dòng: đơn 1 dòng x 3 cái là 3 sản phẩm.
export const getTotalQuantity = (order: Order) =>
  order.items.reduce((sum, item) => sum + item.quantity, 0);

// Trả undefined khi đơn không gắn với ai: chữ "khách vãng lai" phụ thuộc ngôn
// ngữ đang chọn nên để nơi hiển thị tự dịch, hàm này giữ nguyên là hàm thuần.
export const getCustomerName = (order: Order) =>
  order.address?.fullname ?? order.user?.username;
