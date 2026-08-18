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

// Factory mặc định tạo 1 màu "Đen" với 1 size M, price 199000, stock 10.
const seedVariant = async () => {
  const product = await createProduct();
  return product.colors[0].variants[0];
};

const address = {
  fullname: "Nguyễn Văn A",
  phone: "0901234567",
  street: "12 Lê Lợi",
  city: "Hà Nội",
};

const createOrder = (body) => request(app).post("/api/orders").send(body);

// Tiêu chí 1
test("POST /api/orders tính totalAmount từ giá trong DB, bỏ qua giá client gửi", async () => {
  const variant = await seedVariant();

  const res = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 2, price: 1 }],
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.totalAmount, 199000 * 2);
  assert.equal(res.body.items[0].price, 199000);
});

// Tiêu chí 2
test("đặt hàng thành công thì stock giảm đúng số lượng", async () => {
  const variant = await seedVariant();

  await createOrder({ address, items: [{ variantId: variant.id, quantity: 3 }] });

  const row = await prisma.productColorVariants.findUnique({ where: { id: variant.id } });
  assert.equal(row.stock, 7);
});

// Tiêu chí 3
test("đặt quá tồn kho trả 400, không tạo đơn và không đổi stock", async () => {
  const variant = await seedVariant();

  const res = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 11 }],
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Không đủ tồn kho");
  assert.equal(await prisma.order.count(), 0);
  const row = await prisma.productColorVariants.findUnique({ where: { id: variant.id } });
  assert.equal(row.stock, 10);
});

// Tiêu chí 4
test("variantId không tồn tại trả 400 và không tạo gì", async () => {
  const res = await createOrder({
    address,
    items: [{ variantId: 999999, quantity: 1 }],
  });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details, ["variantId 999999 không tồn tại"]);
  assert.equal(await prisma.order.count(), 0);
  assert.equal(await prisma.address.count(), 0);
});

test("một dòng hỏng thì cả đơn bị từ chối, không tạo đơn một phần", async () => {
  const variant = await seedVariant();

  const res = await createOrder({
    address,
    items: [
      { variantId: variant.id, quantity: 1 },
      { variantId: 999999, quantity: 1 },
    ],
  });

  assert.equal(res.status, 400);
  assert.equal(await prisma.order.count(), 0);
  const row = await prisma.productColorVariants.findUnique({ where: { id: variant.id } });
  assert.equal(row.stock, 10);
});

test("cùng một variantId hai dòng bị từ chối", async () => {
  const variant = await seedVariant();

  const res = await createOrder({
    address,
    items: [
      { variantId: variant.id, quantity: 1 },
      { variantId: variant.id, quantity: 2 },
    ],
  });

  assert.equal(res.status, 400);
  assert.match(res.body.details.join(" "), /lặp lại/);
});

test("thiếu address hoặc items trả 400", async () => {
  const variant = await seedVariant();

  const thieuAddress = await createOrder({
    items: [{ variantId: variant.id, quantity: 1 }],
  });
  const thieuItems = await createOrder({ address, items: [] });

  assert.equal(thieuAddress.status, 400);
  assert.equal(thieuItems.status, 400);
});

test("userId không tồn tại trả 400", async () => {
  const variant = await seedVariant();

  const res = await createOrder({
    address,
    userId: 999999,
    items: [{ variantId: variant.id, quantity: 1 }],
  });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details, ["userId không tồn tại"]);
});

test("đơn không có userId vẫn tạo được (khách vãng lai)", async () => {
  const variant = await seedVariant();

  const res = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 1 }],
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.userId, null);
});

// Tiêu chí 5
test("GET /api/orders đòi token còn POST thì không", async () => {
  const variant = await seedVariant();

  const khongToken = await request(app).get("/api/orders");
  assert.equal(khongToken.status, 401);

  const dat = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 1 }],
  });
  assert.equal(dat.status, 201);

  const coToken = await request(app).get("/api/orders").set(auth);
  assert.equal(coToken.status, 200);
  assert.equal(coToken.body.meta.total, 1);
});

// Tiêu chí 6
test("lọc theo status và tìm theo tên, số điện thoại trả đúng tập kết quả", async () => {
  const product = await createProduct({
    colors: {
      create: [
        {
          color: "Đen",
          variants: { create: [{ size: "M", price: 100, stock: 100 }] },
        },
      ],
    },
  });
  const variantId = product.colors[0].variants[0].id;

  const donA = await createOrder({
    address: { ...address, fullname: "Trần Thị B", phone: "0911111111" },
    items: [{ variantId, quantity: 1 }],
  });
  await createOrder({
    address: { ...address, fullname: "Lê Văn C", phone: "0922222222" },
    items: [{ variantId, quantity: 1 }],
  });

  await request(app)
    .put(`/api/orders/${donA.body.id}/status`)
    .set(auth)
    .send({ status: "CONFIRMED" });

  const theoStatus = await request(app).get("/api/orders?status=CONFIRMED").set(auth);
  assert.equal(theoStatus.body.meta.total, 1);
  assert.equal(theoStatus.body.data[0].id, donA.body.id);

  const theoTen = await request(app).get("/api/orders?search=Lê Văn").set(auth);
  assert.equal(theoTen.body.meta.total, 1);
  assert.equal(theoTen.body.data[0].address.fullname, "Lê Văn C");

  const theoSdt = await request(app).get("/api/orders?search=0911111111").set(auth);
  assert.equal(theoSdt.body.meta.total, 1);
  assert.equal(theoSdt.body.data[0].id, donA.body.id);
});

test("GET /api/orders/:id trả kèm items, address và tên sản phẩm", async () => {
  const variant = await seedVariant();
  const created = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 2 }],
  });

  const res = await request(app).get(`/api/orders/${created.body.id}`).set(auth);

  assert.equal(res.status, 200);
  assert.equal(res.body.address.phone, address.phone);
  assert.equal(res.body.items.length, 1);
  assert.ok(res.body.items[0].variant.color.product.name);
});

test("GET /api/orders/:id trả 400 với id không phải số, 404 khi không tồn tại", async () => {
  const sai = await request(app).get("/api/orders/abc").set(auth);
  const khongCo = await request(app).get("/api/orders/999999").set(auth);

  assert.equal(sai.status, 400);
  assert.equal(khongCo.status, 404);
});

// Tiêu chí 7
test("chuyển thẳng từ PENDING sang SHIPPING trả 400", async () => {
  const variant = await seedVariant();
  const created = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 1 }],
  });

  const res = await request(app)
    .put(`/api/orders/${created.body.id}/status`)
    .set(auth)
    .send({ status: "SHIPPING" });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /PENDING/);
});

test("luồng PENDING -> CONFIRMED -> SHIPPING -> DELIVERED chạy được", async () => {
  const variant = await seedVariant();
  const created = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 1 }],
  });

  for (const status of ["CONFIRMED", "SHIPPING", "DELIVERED"]) {
    const res = await request(app)
      .put(`/api/orders/${created.body.id}/status`)
      .set(auth)
      .send({ status });
    assert.equal(res.status, 200, `chuyển sang ${status} phải thành công`);
    assert.equal(res.body.status, status);
  }
});

// Tiêu chí 8
test("huỷ đơn hoàn lại đúng số lượng vào stock", async () => {
  const variant = await seedVariant();
  const created = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 4 }],
  });

  const truocKhiHuy = await prisma.productColorVariants.findUnique({
    where: { id: variant.id },
  });
  assert.equal(truocKhiHuy.stock, 6);

  const res = await request(app)
    .put(`/api/orders/${created.body.id}/status`)
    .set(auth)
    .send({ status: "CANCELED" });

  assert.equal(res.status, 200);
  const sauKhiHuy = await prisma.productColorVariants.findUnique({
    where: { id: variant.id },
  });
  assert.equal(sauKhiHuy.stock, 10);
});

// Tiêu chí 9
test("đơn đã DELIVERED hoặc CANCELED thì không đổi trạng thái được nữa", async () => {
  const variant = await seedVariant();

  const donHuy = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 1 }],
  });
  await request(app)
    .put(`/api/orders/${donHuy.body.id}/status`)
    .set(auth)
    .send({ status: "CANCELED" });

  const doiTiep = await request(app)
    .put(`/api/orders/${donHuy.body.id}/status`)
    .set(auth)
    .send({ status: "CONFIRMED" });

  assert.equal(doiTiep.status, 400);
  assert.match(doiTiep.body.error, /trạng thái cuối/);

  // Huỷ lần hai cũng phải bị chặn, nếu không kho được cộng trả hai lần.
  const huyLai = await request(app)
    .put(`/api/orders/${donHuy.body.id}/status`)
    .set(auth)
    .send({ status: "CANCELED" });

  assert.equal(huyLai.status, 400);
  const row = await prisma.productColorVariants.findUnique({ where: { id: variant.id } });
  assert.equal(row.stock, 10);
});

test("status không nằm trong danh sách trả 400", async () => {
  const variant = await seedVariant();
  const created = await createOrder({
    address,
    items: [{ variantId: variant.id, quantity: 1 }],
  });

  const res = await request(app)
    .put(`/api/orders/${created.body.id}/status`)
    .set(auth)
    .send({ status: "XONG_ROI" });

  assert.equal(res.status, 400);
});

test("PUT status không token trả 401", async () => {
  const res = await request(app).put("/api/orders/1/status").send({ status: "CONFIRMED" });
  assert.equal(res.status, 401);
});
