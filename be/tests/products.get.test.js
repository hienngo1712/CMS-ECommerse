const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createCategory, createProduct } = require("./helpers/factory");
const request = require("supertest");
const app = require("../app");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("GET /api/products trả envelope meta", async () => {
  await createProduct();

  const res = await request(app).get("/api/products");

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.deepEqual(res.body.meta, { total: 1, page: 1, limit: 10, pageCount: 1 });
});

test("GET /api/products trả kèm category, images và variants", async () => {
  await createProduct();

  const res = await request(app).get("/api/products");
  const product = res.body.data[0];

  assert.ok(product.category.name);
  assert.equal(product.colors[0].images[0].order, 0);
  assert.equal(product.colors[0].variants[0].size, "M");
});

test("GET /api/products bỏ qua sản phẩm đã xóa mềm", async () => {
  const product = await createProduct();
  await prisma.product.update({
    where: { id: product.id },
    data: { isDeleted: true },
  });

  const res = await request(app).get("/api/products");

  assert.equal(res.body.data.length, 0);
  assert.equal(res.body.meta.total, 0);
});

test("GET /api/products lọc theo categoryId dạng chuỗi từ query string", async () => {
  const categoryA = await createCategory();
  const categoryB = await createCategory();
  await createProduct({ categoryId: categoryA.id });
  await createProduct({ categoryId: categoryB.id });

  const res = await request(app).get(`/api/products?categoryId=${categoryA.id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].categoryId, categoryA.id);
});

test("GET /api/products search không phân biệt hoa thường", async () => {
  await createProduct({ name: "Áo Thun Trắng" });
  await createProduct({ name: "Quần jean" });

  const res = await request(app).get("/api/products?search=thun");

  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].name, "Áo Thun Trắng");
});

test("GET /api/products lọc isActive", async () => {
  await createProduct({ isActive: true });
  await createProduct({ isActive: false });

  const res = await request(app).get("/api/products?isActive=false");

  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].isActive, false);
});

test("GET /api/products phân trang", async () => {
  await createProduct();
  await createProduct();
  await createProduct();

  const res = await request(app).get("/api/products?page=2&limit=2");

  assert.equal(res.body.data.length, 1);
  assert.deepEqual(res.body.meta, { total: 3, page: 2, limit: 2, pageCount: 2 });
});

test("GET /api/products chặn limit vượt 100", async () => {
  await createProduct();

  const res = await request(app).get("/api/products?limit=9999");

  assert.equal(res.body.meta.limit, 100);
});

test("GET /api/products/:id trả chi tiết", async () => {
  const product = await createProduct();

  const res = await request(app).get(`/api/products/${product.id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.id, product.id);
  assert.equal(res.body.colors[0].variants[0].size, "M");
});

test("GET /api/products/:id trả 404 khi không tồn tại", async () => {
  const res = await request(app).get("/api/products/999999");

  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Product not found");
});

test("GET /api/products/:id trả 404 với sản phẩm đã xóa mềm", async () => {
  const product = await createProduct();
  await prisma.product.update({
    where: { id: product.id },
    data: { isDeleted: true },
  });

  const res = await request(app).get(`/api/products/${product.id}`);

  assert.equal(res.status, 404);
});

test("GET /api/products/:id trả 400 khi id không phải số", async () => {
  const res = await request(app).get("/api/products/abc");

  assert.equal(res.status, 400);
});
