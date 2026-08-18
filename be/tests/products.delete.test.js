const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createProduct } = require("./helpers/factory");
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

test("DELETE đánh dấu isDeleted thay vì xóa hẳn", async () => {
  const product = await createProduct();

  const res = await request(app).delete(`/api/products/${product.id}`)
    .set(auth);

  assert.equal(res.status, 200);
  assert.equal(res.body.msg, "Product deleted");

  const row = await prisma.product.findUnique({ where: { id: product.id } });
  assert.equal(row.isDeleted, true);
});

test("DELETE giữ nguyên màu và size của sản phẩm", async () => {
  const product = await createProduct();

  const res = await request(app).delete(`/api/products/${product.id}`)
    .set(auth);

  assert.equal(res.status, 200);
  assert.equal(await prisma.productColor.count(), 1);
  assert.equal(await prisma.productColorVariants.count(), 1);
});

test("DELETE trả 404 khi sản phẩm không tồn tại", async () => {
  const res = await request(app).delete("/api/products/999999")
    .set(auth);
  assert.equal(res.status, 404);
});

test("DELETE hai lần thì lần thứ hai trả 404", async () => {
  const product = await createProduct();

  await request(app).delete(`/api/products/${product.id}`)
    .set(auth);
  const res = await request(app).delete(`/api/products/${product.id}`)
    .set(auth);

  assert.equal(res.status, 404);
});

test("DELETE trả 400 khi id không phải số", async () => {
  const res = await request(app).delete("/api/products/abc")
    .set(auth);
  assert.equal(res.status, 400);
});
