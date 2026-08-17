const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("không cho 2 màu trùng tên trong cùng một sản phẩm", async () => {
  const category = await prisma.category.create({ data: { name: "Áo", slug: "ao" } });
  const product = await prisma.product.create({
    data: { name: "Áo thun", description: "", categoryId: category.id },
  });

  await prisma.productColor.create({ data: { productId: product.id, color: "Đen" } });

  await assert.rejects(
    () => prisma.productColor.create({ data: { productId: product.id, color: "Đen" } }),
    (err) => err.code === "P2002"
  );
});

test("không cho 2 size trùng nhau trong cùng một màu", async () => {
  const category = await prisma.category.create({ data: { name: "Áo", slug: "ao-2" } });
  const product = await prisma.product.create({
    data: { name: "Áo thun", description: "", categoryId: category.id },
  });
  const color = await prisma.productColor.create({
    data: { productId: product.id, color: "Đen" },
  });

  await prisma.productColorVariants.create({
    data: { colorId: color.id, size: "M", price: 100, stock: 1 },
  });

  await assert.rejects(
    () => prisma.productColorVariants.create({
      data: { colorId: color.id, size: "M", price: 200, stock: 2 },
    }),
    (err) => err.code === "P2002"
  );
});

test("không cho 2 danh mục trùng slug", async () => {
  await prisma.category.create({ data: { name: "Áo", slug: "ao" } });

  await assert.rejects(
    () => prisma.category.create({ data: { name: "Áo khoác", slug: "ao" } }),
    (err) => err.code === "P2002"
  );
});

test("User có cột isActive", async () => {
  const user = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@example.com",
      password: "x",
      role: "ADMIN",
      isActive: true,
      isDeleted: false,
    },
  });
  assert.equal(user.isActive, true);
});
