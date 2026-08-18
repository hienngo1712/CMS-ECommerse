const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createCategory, createProduct } = require("./helpers/factory");
const { authHeader } = require("./helpers/auth");
const request = require("supertest");
const app = require("../app");

let auth;

beforeEach(async () => {
  await resetDb();
  auth = await authHeader();
});

after(async () => {
  await prisma.$disconnect();
});

const getStats = () => request(app).get("/api/dashboard/stats").set(auth);

// Tạo đơn thẳng bằng Prisma để đặt được trạng thái tuỳ ý mà không phải đi qua
// luồng chuyển trạng thái của API.
const seedOrder = async ({ status, totalAmount, fullname = "Khách" }) =>
  prisma.order.create({
    data: {
      status,
      totalAmount,
      address: {
        create: { fullname, phone: "0900000000", street: "1 A", city: "HN" },
      },
    },
  });

// Tiêu chí 1
test("GET /api/dashboard/stats không token trả 401", async () => {
  const res = await request(app).get("/api/dashboard/stats");
  assert.equal(res.status, 401);
});

// Tiêu chí 2 và 3
test("revenue tách đơn đã giao khỏi đơn chưa giao, bỏ đơn đã huỷ", async () => {
  await seedOrder({ status: "DELIVERED", totalAmount: 1000 });
  await seedOrder({ status: "DELIVERED", totalAmount: 500 });
  await seedOrder({ status: "PENDING", totalAmount: 200 });
  await seedOrder({ status: "CONFIRMED", totalAmount: 30 });
  await seedOrder({ status: "SHIPPING", totalAmount: 70 });
  await seedOrder({ status: "CANCELED", totalAmount: 999999 });

  const res = await getStats();

  assert.equal(res.status, 200);
  assert.equal(res.body.revenue.delivered, 1500);
  assert.equal(res.body.revenue.pending, 300);
});

// Tiêu chí 4
test("byStatus có đủ 5 khoá với giá trị 0 khi chưa có đơn nào", async () => {
  const res = await getStats();

  assert.deepEqual(res.body.orders.byStatus, {
    PENDING: 0,
    CONFIRMED: 0,
    SHIPPING: 0,
    DELIVERED: 0,
    CANCELED: 0,
  });
  assert.equal(res.body.orders.total, 0);
  assert.equal(res.body.revenue.delivered, 0);
  assert.equal(res.body.revenue.pending, 0);
});

test("byStatus đếm đúng số đơn từng trạng thái", async () => {
  await seedOrder({ status: "PENDING", totalAmount: 1 });
  await seedOrder({ status: "PENDING", totalAmount: 1 });
  await seedOrder({ status: "CANCELED", totalAmount: 1 });

  const res = await getStats();

  assert.equal(res.body.orders.byStatus.PENDING, 2);
  assert.equal(res.body.orders.byStatus.CANCELED, 1);
  assert.equal(res.body.orders.byStatus.DELIVERED, 0);
  assert.equal(res.body.orders.total, 3);
});

// Tiêu chí 5
test("catalog bỏ qua sản phẩm và danh mục đã xoá mềm", async () => {
  const category = await createCategory();
  await createCategory();
  const product = await createProduct({ categoryId: category.id });
  await createProduct({ categoryId: category.id });

  await prisma.category.update({
    where: { id: category.id },
    data: { isDeleted: true },
  });
  await prisma.product.update({
    where: { id: product.id },
    data: { isDeleted: true },
  });

  const res = await getStats();

  assert.equal(res.body.catalog.categories, 1);
  assert.equal(res.body.catalog.products, 1);
});

// Tiêu chí 6
test("lowStock chỉ lấy variant còn <= 5 và bỏ sản phẩm đã xoá mềm", async () => {
  await createProduct({
    colors: {
      create: [
        {
          color: "Đen",
          variants: {
            create: [
              { size: "S", price: 10, stock: 2 },
              { size: "M", price: 10, stock: 5 },
              { size: "L", price: 10, stock: 6 },
            ],
          },
        },
      ],
    },
  });

  const daXoa = await createProduct({
    colors: {
      create: [
        {
          color: "Trắng",
          variants: { create: [{ size: "M", price: 10, stock: 1 }] },
        },
      ],
    },
  });
  await prisma.product.update({
    where: { id: daXoa.id },
    data: { isDeleted: true },
  });

  const res = await getStats();

  const sizes = res.body.lowStock.map((row) => row.size);
  assert.deepEqual(sizes.sort(), ["M", "S"]);
  assert.ok(
    res.body.lowStock.every((row) => row.stock <= 5),
    "mọi dòng phải có stock <= 5"
  );
  assert.ok(res.body.lowStock[0].product, "phải kèm tên sản phẩm");
});

test("lowStock sắp xếp ít hàng nhất lên trước", async () => {
  await createProduct({
    colors: {
      create: [
        {
          color: "Đen",
          variants: {
            create: [
              { size: "S", price: 10, stock: 4 },
              { size: "M", price: 10, stock: 1 },
            ],
          },
        },
      ],
    },
  });

  const res = await getStats();

  assert.deepEqual(
    res.body.lowStock.map((row) => row.stock),
    [1, 4]
  );
});

// Tiêu chí 7
test("recentOrders trả tối đa 5 đơn, mới nhất trước", async () => {
  for (let i = 1; i <= 7; i += 1) {
    await seedOrder({ status: "PENDING", totalAmount: i, fullname: `Khách ${i}` });
  }

  const res = await getStats();

  assert.equal(res.body.recentOrders.length, 5);
  assert.equal(res.body.recentOrders[0].customer, "Khách 7");
  assert.equal(res.body.recentOrders[4].customer, "Khách 3");
});

test("recentOrders dùng tên trên địa chỉ giao", async () => {
  await seedOrder({ status: "PENDING", totalAmount: 10, fullname: "Vũ Thị D" });

  const res = await getStats();

  assert.equal(res.body.recentOrders[0].customer, "Vũ Thị D");
});
