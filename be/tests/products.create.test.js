const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createCategory } = require("./helpers/factory");
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

const payload = (categoryId) => ({
  name: "Áo thun basic",
  description: "Cotton 100%",
  categoryId,
  colors: [
    {
      color: "Đen",
      colorCode: "#111111",
      images: [
        { imageUrl: "https://example.com/1.jpg" },
        { imageUrl: "https://example.com/2.jpg" },
      ],
      variants: [
        { size: "M", price: "199000", stock: "10" },
        { size: "L", price: 219000, stock: 5 },
      ],
    },
  ],
});

test("POST tạo sản phẩm kèm màu, ảnh, size", async () => {
  const category = await createCategory();

  const res = await request(app).post("/api/products")
    .set(auth).send(payload(category.id));

  assert.equal(res.status, 201);
  assert.equal(res.body.name, "Áo thun basic");
  assert.equal(res.body.colors.length, 1);
  assert.equal(res.body.colors[0].variants.length, 2);
  assert.equal(res.body.colors[0].images.length, 2);
});

test("POST đánh số order cho ảnh theo thứ tự mảng", async () => {
  const category = await createCategory();

  const res = await request(app).post("/api/products")
    .set(auth).send(payload(category.id));

  const orders = res.body.colors[0].images.map((img) => img.order);
  assert.deepEqual(orders, [0, 1]);
});

test("POST ép kiểu price/stock từ chuỗi", async () => {
  const category = await createCategory();

  const res = await request(app).post("/api/products")
    .set(auth).send(payload(category.id));

  const variantM = res.body.colors[0].variants.find((v) => v.size === "M");
  assert.equal(variantM.price, 199000);
  assert.equal(variantM.stock, 10);
});

test("POST trả 400 kèm details khi thiếu name", async () => {
  const category = await createCategory();
  const body = payload(category.id);
  delete body.name;

  const res = await request(app).post("/api/products")
    .set(auth).send(body);

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Dữ liệu không hợp lệ");
  assert.deepEqual(res.body.details, ["name là bắt buộc"]);
});

test("POST trả 400 khi categoryId không tồn tại", async () => {
  const res = await request(app).post("/api/products")
    .set(auth).send(payload(999999));

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details, ["categoryId không tồn tại"]);
});

test("POST trả 400 khi categoryId trỏ tới danh mục đã xóa mềm", async () => {
  const category = await createCategory({ isDeleted: true });

  const res = await request(app).post("/api/products")
    .set(auth).send(payload(category.id));

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details, ["categoryId không tồn tại"]);
});

test("POST không tạo bản ghi nào khi payload sai", async () => {
  const category = await createCategory();
  const body = payload(category.id);
  body.colors[0].variants.push({ size: "M", price: 1, stock: 1 });

  const res = await request(app).post("/api/products")
    .set(auth).send(body);

  assert.equal(res.status, 400);
  assert.equal(await prisma.product.count(), 0);
});
