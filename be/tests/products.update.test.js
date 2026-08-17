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

// Tạo sản phẩm 1 màu "Đen" với 2 size M, L.
const seedProduct = async () => {
  const category = await createCategory();
  return createProduct({
    categoryId: category.id,
    colors: {
      create: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: { create: [{ imageUrl: "https://example.com/1.jpg", order: 0 }] },
          variants: {
            create: [
              { size: "M", price: 100, stock: 1 },
              { size: "L", price: 200, stock: 2 },
            ],
          },
        },
      ],
    },
  });
};

test("PUT cập nhật trường phẳng và trả về sản phẩm mới", async () => {
  const product = await seedProduct();

  const res = await request(app)
    .put(`/api/products/${product.id}`)
    .send({ name: "Tên mới", description: "mô tả mới", categoryId: product.categoryId });

  assert.equal(res.status, 200);
  assert.equal(res.body.name, "Tên mới");
  assert.equal(res.body.description, "mô tả mới");
});

test("PUT không gửi colors thì giữ nguyên màu và size", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({ name: "Tên mới", categoryId: product.categoryId });

  assert.equal(await prisma.productColor.count(), 1);
  assert.equal(await prisma.productColorVariants.count(), 2);
});

test("PUT cập nhật giá của size đã có, không tạo bản ghi mới", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [{ imageUrl: "https://example.com/1.jpg" }],
          variants: [
            { size: "M", price: 150, stock: 9 },
            { size: "L", price: 200, stock: 2 },
          ],
        },
      ],
    });

  const variants = await prisma.productColorVariants.findMany({ orderBy: { size: "asc" } });
  assert.equal(variants.length, 2);
  const variantM = variants.find((v) => v.size === "M");
  assert.equal(variantM.price, 150);
  assert.equal(variantM.stock, 9);
});

test("PUT xóa size không còn trong payload", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [],
          variants: [{ size: "M", price: 100, stock: 1 }],
        },
      ],
    });

  const variants = await prisma.productColorVariants.findMany();
  assert.deepEqual(variants.map((v) => v.size), ["M"]);
});

test("PUT thêm màu mới", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [],
          variants: [{ size: "M", price: 100, stock: 1 }, { size: "L", price: 200, stock: 2 }],
        },
        {
          color: "Trắng",
          colorCode: "#ffffff",
          images: [{ imageUrl: "https://example.com/w.jpg" }],
          variants: [{ size: "S", price: 90, stock: 3 }],
        },
      ],
    });

  const colors = await prisma.productColor.findMany({ orderBy: { id: "asc" } });
  assert.deepEqual(colors.map((c) => c.color), ["Đen", "Trắng"]);
});

test("PUT xóa màu không còn trong payload, kể cả màu không có variant", async () => {
  const product = await seedProduct();
  const color = await prisma.productColor.findFirst();
  await prisma.productColorVariants.deleteMany({ where: { colorId: color.id } });

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Trắng",
          colorCode: "#ffffff",
          images: [],
          variants: [{ size: "S", price: 90, stock: 3 }],
        },
      ],
    });

  const colors = await prisma.productColor.findMany();
  assert.deepEqual(colors.map((c) => c.color), ["Trắng"]);
});

test("PUT ghi lại ảnh theo đúng thứ tự mới", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [
            { imageUrl: "https://example.com/b.jpg" },
            { imageUrl: "https://example.com/a.jpg" },
          ],
          variants: [{ size: "M", price: 100, stock: 1 }],
        },
      ],
    });

  const images = await prisma.productColorImage.findMany({ orderBy: { order: "asc" } });
  assert.deepEqual(images.map((i) => i.imageUrl), [
    "https://example.com/b.jpg",
    "https://example.com/a.jpg",
  ]);
});

test("PUT cập nhật colorCode của màu đã có", async () => {
  const product = await seedProduct();

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#123456",
          images: [],
          variants: [{ size: "M", price: 100, stock: 1 }],
        },
      ],
    });

  const color = await prisma.productColor.findFirst();
  assert.equal(color.colorCode, "#123456");
});

test("PUT trả 409 khi xóa màu có variant đã nằm trong đơn hàng", async () => {
  const product = await seedProduct();
  const variant = await prisma.productColorVariants.findFirst({ where: { size: "M" } });
  const order = await prisma.order.create({ data: { totalAmount: 100 } });
  await prisma.orderItem.create({
    data: { orderId: order.id, productVariantId: variant.id, quantity: 1, price: 100 },
  });

  const res = await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Trắng",
          colorCode: "#ffffff",
          images: [],
          variants: [{ size: "S", price: 90, stock: 3 }],
        },
      ],
    });

  assert.equal(res.status, 409);
  assert.deepEqual(res.body.details, [{ color: "Đen", variants: ["M"] }]);
});

test("PUT trả 409 thì rollback toàn bộ, không đổi tên sản phẩm", async () => {
  const product = await seedProduct();
  const variant = await prisma.productColorVariants.findFirst({ where: { size: "M" } });
  const order = await prisma.order.create({ data: { totalAmount: 100 } });
  await prisma.orderItem.create({
    data: { orderId: order.id, productVariantId: variant.id, quantity: 1, price: 100 },
  });

  await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: "Tên đáng lẽ không được lưu",
      categoryId: product.categoryId,
      colors: [
        { color: "Trắng", colorCode: "#ffffff", images: [], variants: [{ size: "S", price: 90, stock: 3 }] },
      ],
    });

  const fresh = await prisma.product.findUnique({ where: { id: product.id } });
  assert.equal(fresh.name, product.name);
});

test("PUT trả 404 khi sản phẩm không tồn tại", async () => {
  const category = await createCategory();

  const res = await request(app)
    .put("/api/products/999999")
    .send({ name: "X", categoryId: category.id });

  assert.equal(res.status, 404);
  assert.equal(res.body.error, "Product not found");
});

test("PUT trả 400 khi payload sai", async () => {
  const product = await seedProduct();

  const res = await request(app)
    .put(`/api/products/${product.id}`)
    .send({ name: "", categoryId: product.categoryId });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details, ["name là bắt buộc"]);
});

// Bug 3 (dangerous half): thêm size mới vào màu ĐÃ có trong DB. Trước khi sửa,
// existingVariantMap.get("S") trả về undefined nhưng code vẫn gọi
// tx.productColorVariants.update({ where: { id: undefined.id } }) -> TypeError -> 500.
test("PUT thêm size mới cho màu đã có, không đụng tới các size cũ", async () => {
  const product = await seedProduct();

  const res = await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [{ imageUrl: "https://example.com/1.jpg" }],
          variants: [
            { size: "M", price: 100, stock: 1 },
            { size: "L", price: 200, stock: 2 },
            { size: "S", price: 50, stock: 5 },
          ],
        },
      ],
    });

  assert.equal(res.status, 200);

  const variants = await prisma.productColorVariants.findMany({ orderBy: { size: "asc" } });
  assert.deepEqual(variants.map((v) => v.size).sort(), ["L", "M", "S"]);

  const variantS = variants.find((v) => v.size === "S");
  assert.equal(variantS.price, 50);
  assert.equal(variantS.stock, 5);

  const variantM = variants.find((v) => v.size === "M");
  assert.equal(variantM.price, 100);
  assert.equal(variantM.stock, 1);
});

// Bug 4: gửi một màu ĐÃ TỒN TẠI trong payload với variants rỗng phải GIỮ LẠI màu đó
// (chỉ xóa hết size của nó), không được xóa cả màu. Bản lỗi cũ đặt
// remainingColorMap.delete(incomingColor.color) bên trong vòng lặp variants, nên khi
// variants rỗng, vòng lặp đó không chạy lần nào -> "Đen" không bị xóa khỏi
// remainingColorMap -> bị coi là màu client đã bỏ đi -> bị xóa toàn bộ ở cuối.
test("PUT gửi màu đã có với variants rỗng thì giữ lại màu, chỉ xóa hết size", async () => {
  const product = await seedProduct();

  const res = await request(app)
    .put(`/api/products/${product.id}`)
    .send({
      name: product.name,
      categoryId: product.categoryId,
      colors: [
        {
          color: "Đen",
          colorCode: "#000000",
          images: [],
          variants: [],
        },
      ],
    });

  assert.equal(res.status, 200);

  const colors = await prisma.productColor.findMany();
  assert.equal(colors.length, 1);
  assert.equal(colors[0].color, "Đen");

  const variants = await prisma.productColorVariants.findMany({
    where: { colorId: colors[0].id },
  });
  assert.equal(variants.length, 0);
});
