const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createCategory } = require("./helpers/factory");
const request = require("supertest");
const app = require("../app");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("DELETE /api/categories/:id là soft delete", async () => {
  const category = await createCategory();

  const res = await request(app).delete(`/api/categories/${category.id}`);

  assert.equal(res.status, 200);
  const row = await prisma.category.findUnique({ where: { id: category.id } });
  assert.equal(row.isDeleted, true);
});

test("DELETE danh mục không xóa sản phẩm thuộc danh mục đó", async () => {
  const category = await createCategory();
  await prisma.product.create({
    data: { name: "SP", description: "", categoryId: category.id },
  });

  await request(app).delete(`/api/categories/${category.id}`);

  assert.equal(await prisma.product.count(), 1);
});

test("GET /api/categories bỏ qua danh mục đã xóa mềm", async () => {
  const category = await createCategory();
  await request(app).delete(`/api/categories/${category.id}`);

  const res = await request(app).get("/api/categories");

  assert.equal(res.body.data.length, 0);
  assert.equal(res.body.meta.total, 0);
});

test("GET /api/categories/:id trả 404 với danh mục đã xóa mềm", async () => {
  const category = await createCategory();
  await request(app).delete(`/api/categories/${category.id}`);

  const res = await request(app).get(`/api/categories/${category.id}`);

  assert.equal(res.status, 404);
});

test("DELETE /api/categories/:id trả 404 khi không tồn tại", async () => {
  const res = await request(app).delete("/api/categories/999999");
  assert.equal(res.status, 404);
});

test("PUT /api/categories/:id trả 404 với danh mục đã xóa mềm", async () => {
  const category = await createCategory();
  await request(app).delete(`/api/categories/${category.id}`);

  const res = await request(app)
    .put(`/api/categories/${category.id}`)
    .send({ name: "Tên mới", slug: category.slug, isActive: true });

  assert.equal(res.status, 404);
});

// I-3: slug là unique nhưng danh mục xóa mềm vẫn giữ slug cũ mãi mãi, tạo mới trùng
// slug phải trả 400 rõ ràng thay vì P2002 rơi xuống lỗi chung chung.
test("POST /api/categories trả 400 khi slug trùng với danh mục đã xóa mềm", async () => {
  const category = await createCategory({ slug: "ao" });
  await request(app).delete(`/api/categories/${category.id}`);

  const res = await request(app)
    .post("/api/categories")
    .send({ name: "Áo mới", slug: "ao", isActive: true });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Slug đã tồn tại");
});
