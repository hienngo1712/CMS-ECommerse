import { describe, expect, it } from "vitest";

import { formatDateTime, getCustomerName, getTotalQuantity } from "./orderUtils";
import type { Order } from "./Types";

const baseOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 1,
  userId: null,
  status: "PENDING",
  totalAmount: 0,
  createdAt: "2026-08-18T03:00:00.000Z",
  updatedAt: "2026-08-18T03:00:00.000Z",
  address: null,
  user: null,
  items: [],
  ...overrides,
});

describe("getTotalQuantity", () => {
  it("cộng số lượng chứ không đếm số dòng", () => {
    const order = baseOrder({
      items: [
        { id: 1, quantity: 3, price: 100 } as Order["items"][number],
        { id: 2, quantity: 2, price: 100 } as Order["items"][number],
      ],
    });

    expect(getTotalQuantity(order)).toBe(5);
  });

  it("đơn rỗng trả 0", () => {
    expect(getTotalQuantity(baseOrder())).toBe(0);
  });
});

describe("getCustomerName", () => {
  it("ưu tiên tên trên địa chỉ giao", () => {
    const order = baseOrder({
      address: { id: 1, fullname: "Trần B", phone: "", street: "", city: "" },
      user: { id: 1, username: "admin", email: "a@b.c" },
    });

    expect(getCustomerName(order)).toBe("Trần B");
  });

  it("không có địa chỉ thì lấy username", () => {
    const order = baseOrder({
      user: { id: 1, username: "admin", email: "a@b.c" },
    });

    expect(getCustomerName(order)).toBe("admin");
  });

  it("không có gì thì là khách vãng lai", () => {
    expect(getCustomerName(baseOrder())).toBe("Khách vãng lai");
  });
});

describe("formatDateTime", () => {
  it("chuỗi ngày hỏng trả dấu gạch thay vì Invalid Date", () => {
    expect(formatDateTime("khong-phai-ngay")).toBe("-");
  });
});
