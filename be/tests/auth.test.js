const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const { prisma, resetDb } = require("./helpers/db");
const { createUser, authHeader } = require("./helpers/auth");
const { verifyToken } = require("../utils/jwt");
const request = require("supertest");
const app = require("../app");

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

const login = (body) => request(app).post("/api/auth/login").send(body);

// Tiêu chí 1
test("POST /api/auth/login đúng mật khẩu trả token verify được", async () => {
  const user = await createUser({ password: "matkhau123" });

  const res = await login({ username: user.username, password: "matkhau123" });

  assert.equal(res.status, 200);
  const payload = verifyToken(res.body.token);
  assert.equal(payload.id, user.id);
  assert.equal(payload.username, user.username);
});

test("login được bằng email chứ không chỉ username", async () => {
  const user = await createUser({ password: "matkhau123" });

  const res = await login({ username: user.email, password: "matkhau123" });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.id, user.id);
});

// Tiêu chí 2: hai trường hợp sai phải không phân biệt được từ bên ngoài
test("sai mật khẩu và sai username trả cùng status và cùng câu lỗi", async () => {
  const user = await createUser({ password: "matkhau123" });

  const saiMatKhau = await login({
    username: user.username,
    password: "sai-mat-khau",
  });
  const saiUsername = await login({
    username: "khong-ton-tai",
    password: "matkhau123",
  });

  assert.equal(saiMatKhau.status, 401);
  assert.equal(saiUsername.status, 401);
  assert.equal(saiMatKhau.body.error, saiUsername.body.error);
  assert.equal(saiMatKhau.body.error, "Sai tài khoản hoặc mật khẩu");
});

// Tiêu chí 3
test("response đăng nhập không chứa password", async () => {
  const user = await createUser({ password: "matkhau123" });

  const res = await login({ username: user.username, password: "matkhau123" });

  assert.equal(res.body.user.password, undefined);
  assert.ok(
    !JSON.stringify(res.body).includes("$2"),
    "response không được chứa chuỗi hash bcrypt"
  );
});

test("thiếu username hoặc password trả 400 chứ không phải 401", async () => {
  const res = await login({ username: "  ", password: "" });

  assert.equal(res.status, 400);
  assert.deepEqual(res.body.details, [
    "username là bắt buộc",
    "password là bắt buộc",
  ]);
});

test("tài khoản bị khoá trả 403 khi mật khẩu đúng", async () => {
  const user = await createUser({ password: "matkhau123", isActive: false });

  const res = await login({ username: user.username, password: "matkhau123" });

  assert.equal(res.status, 403);
  assert.equal(res.body.error, "Tài khoản đã bị khoá");
});

test("tài khoản đã xoá mềm không đăng nhập được", async () => {
  const user = await createUser({ password: "matkhau123", isDeleted: true });

  const res = await login({ username: user.username, password: "matkhau123" });

  assert.equal(res.status, 401);
});

// Tiêu chí 4
test("GET /api/auth/me không token trả 401", async () => {
  const res = await request(app).get("/api/auth/me");
  assert.equal(res.status, 401);
});

test("GET /api/auth/me với token hợp lệ trả đúng user", async () => {
  const user = await createUser();
  const auth = { Authorization: `Bearer ${(await login({ username: user.username, password: "matkhau123" })).body.token}` };

  const res = await request(app).get("/api/auth/me").set(auth);

  assert.equal(res.status, 200);
  assert.equal(res.body.id, user.id);
  assert.equal(res.body.username, user.username);
  assert.equal(res.body.password, undefined);
});

test("token sai chữ ký trả 401", async () => {
  const res = await request(app)
    .get("/api/auth/me")
    .set({ Authorization: "Bearer khong-phai-jwt" });

  assert.equal(res.status, 401);
});

test("header không có tiền tố Bearer trả 401", async () => {
  const auth = await authHeader();
  const token = auth.Authorization.replace("Bearer ", "");

  const res = await request(app).get("/api/auth/me").set({ Authorization: token });

  assert.equal(res.status, 401);
});

// Tiêu chí 5: đây là lý do requireAuth tra lại DB thay vì chỉ verify chữ ký
test("token còn hợp lệ nhưng user đã bị khoá thì trả 401", async () => {
  const user = await createUser();
  const auth = await authHeader({ username: "se-bi-khoa", email: "khoa@example.com" });

  await prisma.user.update({
    where: { username: "se-bi-khoa" },
    data: { isActive: false },
  });

  const res = await request(app).get("/api/auth/me").set(auth);

  assert.equal(res.status, 401);
  assert.ok(user);
});

// Tiêu chí 6
test("POST /api/products không token trả 401 và không tạo bản ghi", async () => {
  const category = await prisma.category.create({
    data: { name: "Áo", slug: "ao" },
  });

  const res = await request(app)
    .post("/api/products")
    .send({ name: "Áo thun", categoryId: category.id });

  assert.equal(res.status, 401);
  assert.equal(await prisma.product.count(), 0);
});

test("PUT và DELETE products, categories đều đòi token", async () => {
  const paths = [
    ["put", "/api/products/1"],
    ["delete", "/api/products/1"],
    ["put", "/api/categories/1"],
    ["delete", "/api/categories/1"],
    ["post", "/api/categories"],
  ];

  for (const [method, url] of paths) {
    const res = await request(app)[method](url).send({});
    assert.equal(res.status, 401, `${method.toUpperCase()} ${url} phải trả 401`);
  }
});

// Tiêu chí 7
test("GET products và categories không cần token", async () => {
  const products = await request(app).get("/api/products");
  const categories = await request(app).get("/api/categories");

  assert.equal(products.status, 200);
  assert.equal(categories.status, 200);
});

// Tiêu chí 8. Phải chạy ở tiến trình con vì cần nạp module với env đã bỏ
// JWT_SECRET, và cwd phải khác be/ để `dotenv.config()` không tìm thấy be/.env.
//
// Nhắm vào utils/jwt chứ không phải app.js: Prisma Client tự nạp be/.env lúc
// khởi tạo, nên require('./app') trên MÁY NÀY luôn có lại JWT_SECRET và không
// bao giờ ném — test sẽ xanh giả. utils/jwt không đụng Prisma nên kiểm tra
// đúng cái chốt chặn. Máy thật sự không khai JWT_SECRET ở đâu cả thì Prisma
// cũng không nạp được gì và server vẫn chết ngay lúc khởi động.
test("thiếu JWT_SECRET thì nạp utils/jwt ném lỗi ngay", () => {
  const env = { ...process.env };
  delete env.JWT_SECRET;

  const jwtPath = path.join(__dirname, "..", "utils", "jwt.js");
  const result = spawnSync(
    process.execPath,
    ["-e", `require(${JSON.stringify(jwtPath)})`],
    { cwd: os.tmpdir(), env, encoding: "utf8" }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET/);
});
