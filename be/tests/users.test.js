const { test, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const { createUser, authHeader } = require("./helpers/auth");
const request = require("supertest");
const app = require("../app");

let auth;
let adminId;

beforeEach(async () => {
  await resetDb();
  const admin = await createUser({ username: "septo", email: "sep@example.com" });
  adminId = admin.id;
  auth = { Authorization: (await authHeader({ username: "septo2", email: "sep2@example.com" })).Authorization };
});

after(async () => {
  await prisma.$disconnect();
});

// Token của chính admin có id = adminId, dùng cho các test tự thao tác lên mình.
const authOfSelf = async () => {
  const { signToken } = require("../utils/jwt");
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  return { Authorization: `Bearer ${signToken(admin)}` };
};

const payload = (overrides = {}) => ({
  username: "nhanvien1",
  email: "nv1@example.com",
  password: "matkhau123",
  ...overrides,
});

// Tiêu chí 1
test("mọi route users trả 401 khi không có token", async () => {
  const calls = [
    request(app).get("/api/users"),
    request(app).get("/api/users/1"),
    request(app).post("/api/users").send(payload()),
    request(app).put("/api/users/1").send(payload()),
    request(app).delete("/api/users/1"),
  ];

  for (const call of calls) {
    const res = await call;
    assert.equal(res.status, 401);
  }
});

// Tiêu chí 2
test("tài khoản staff bị chặn 403 ở mọi route users", async () => {
  const staffAuth = await authHeader({
    username: "nhanvien",
    email: "nv@example.com",
    role: "staff",
  });

  const danhSach = await request(app).get("/api/users").set(staffAuth);
  const tao = await request(app).post("/api/users").set(staffAuth).send(payload());

  assert.equal(danhSach.status, 403);
  assert.equal(tao.status, 403);
  assert.equal(await prisma.user.count({ where: { username: "nhanvien1" } }), 0);
});

// Tiêu chí 3 và 4
test("POST tạo user, không trả password, và mật khẩu được băm", async () => {
  const res = await request(app).post("/api/users").set(auth).send(payload());

  assert.equal(res.status, 201);
  assert.equal(res.body.username, "nhanvien1");
  assert.equal(res.body.password, undefined);
  assert.ok(!JSON.stringify(res.body).includes("$2"), "không được lộ hash");

  const row = await prisma.user.findUnique({ where: { username: "nhanvien1" } });
  assert.notEqual(row.password, "matkhau123");
  assert.match(row.password, /^\$2[aby]\$/);
});

test("user vừa tạo đăng nhập được ngay", async () => {
  await request(app).post("/api/users").set(auth).send(payload());

  const res = await request(app)
    .post("/api/auth/login")
    .send({ username: "nhanvien1", password: "matkhau123" });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.username, "nhanvien1");
});

test("role mặc định là staff khi không truyền", async () => {
  const res = await request(app).post("/api/users").set(auth).send(payload());
  assert.equal(res.body.role, "staff");
});

test("password ngắn hơn 8 ký tự bị từ chối", async () => {
  const res = await request(app)
    .post("/api/users")
    .set(auth)
    .send(payload({ password: "1234567" }));

  assert.equal(res.status, 400);
  assert.match(res.body.error, /8 ký tự/);
});

test("email sai định dạng bị từ chối", async () => {
  const res = await request(app)
    .post("/api/users")
    .set(auth)
    .send(payload({ email: "khong-phai-email" }));

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "email không hợp lệ");
});

// Tiêu chí 5
test("PUT không gửi password thì mật khẩu cũ vẫn dùng được", async () => {
  const tao = await request(app).post("/api/users").set(auth).send(payload());

  const sua = await request(app)
    .put(`/api/users/${tao.body.id}`)
    .set(auth)
    .send({ username: "nhanvien1", email: "moi@example.com", role: "staff" });

  assert.equal(sua.status, 200);
  assert.equal(sua.body.email, "moi@example.com");

  const dangNhap = await request(app)
    .post("/api/auth/login")
    .send({ username: "nhanvien1", password: "matkhau123" });
  assert.equal(dangNhap.status, 200);
});

// Tiêu chí 6
test("PUT có password mới thì mật khẩu cũ hết tác dụng", async () => {
  const tao = await request(app).post("/api/users").set(auth).send(payload());

  await request(app)
    .put(`/api/users/${tao.body.id}`)
    .set(auth)
    .send({
      username: "nhanvien1",
      email: "nv1@example.com",
      password: "matkhaumoi999",
    });

  const cu = await request(app)
    .post("/api/auth/login")
    .send({ username: "nhanvien1", password: "matkhau123" });
  const moi = await request(app)
    .post("/api/auth/login")
    .send({ username: "nhanvien1", password: "matkhaumoi999" });

  assert.equal(cu.status, 401);
  assert.equal(moi.status, 200);
});

// Tiêu chí 7
test("tự khoá chính mình trả 400", async () => {
  const self = await authOfSelf();

  const res = await request(app)
    .put(`/api/users/${adminId}`)
    .set(self)
    .send({
      username: "septo",
      email: "sep@example.com",
      role: "admin",
      isActive: false,
    });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /tự khoá/);
  const row = await prisma.user.findUnique({ where: { id: adminId } });
  assert.equal(row.isActive, true);
});

test("tự hạ quyền chính mình khỏi admin trả 400", async () => {
  const self = await authOfSelf();

  const res = await request(app)
    .put(`/api/users/${adminId}`)
    .set(self)
    .send({ username: "septo", email: "sep@example.com", role: "staff" });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /tự đổi quyền/);
});

test("khoá người khác thì vẫn được", async () => {
  const tao = await request(app).post("/api/users").set(auth).send(payload());

  const res = await request(app)
    .put(`/api/users/${tao.body.id}`)
    .set(auth)
    .send({
      username: "nhanvien1",
      email: "nv1@example.com",
      role: "staff",
      isActive: false,
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.isActive, false);
});

// Tiêu chí 8
test("tự xoá chính mình trả 400", async () => {
  const self = await authOfSelf();

  const res = await request(app).delete(`/api/users/${adminId}`).set(self);

  assert.equal(res.status, 400);
  assert.match(res.body.error, /tự xoá/);
  const row = await prisma.user.findUnique({ where: { id: adminId } });
  assert.equal(row.isDeleted, false);
});

// Tiêu chí 9
test("trùng username và trùng email đều trả 400 với câu chỉ đúng chỗ", async () => {
  await request(app).post("/api/users").set(auth).send(payload());

  const trungUsername = await request(app)
    .post("/api/users")
    .set(auth)
    .send(payload({ email: "khac@example.com" }));
  const trungEmail = await request(app)
    .post("/api/users")
    .set(auth)
    .send(payload({ username: "khac" }));

  assert.equal(trungUsername.status, 400);
  assert.equal(trungUsername.body.error, "Username đã tồn tại");
  assert.equal(trungEmail.status, 400);
  assert.equal(trungEmail.body.error, "Email đã tồn tại");
});

// Tiêu chí 10: đây là chỗ dễ rơi xuống 500 nhất
test("trùng username của người đã xoá mềm trả 400 chứ không phải 500", async () => {
  const tao = await request(app).post("/api/users").set(auth).send(payload());
  await request(app).delete(`/api/users/${tao.body.id}`).set(auth);

  const res = await request(app).post("/api/users").set(auth).send(payload());

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Username đã tồn tại");
});

// Tiêu chí 11
test("DELETE là xoá mềm và user biến khỏi danh sách", async () => {
  const tao = await request(app).post("/api/users").set(auth).send(payload());

  const xoa = await request(app).delete(`/api/users/${tao.body.id}`).set(auth);
  assert.equal(xoa.status, 200);

  const row = await prisma.user.findUnique({ where: { id: tao.body.id } });
  assert.equal(row.isDeleted, true);

  const danhSach = await request(app).get("/api/users").set(auth);
  const ids = danhSach.body.data.map((u) => u.id);
  assert.ok(!ids.includes(tao.body.id));

  const chiTiet = await request(app).get(`/api/users/${tao.body.id}`).set(auth);
  assert.equal(chiTiet.status, 404);
});

// Tiêu chí 12
test("người đã xoá mềm không đăng nhập được nữa", async () => {
  const tao = await request(app).post("/api/users").set(auth).send(payload());
  await request(app).delete(`/api/users/${tao.body.id}`).set(auth);

  const res = await request(app)
    .post("/api/auth/login")
    .send({ username: "nhanvien1", password: "matkhau123" });

  assert.equal(res.status, 401);
});

test("tìm theo username hoặc email và lọc theo role", async () => {
  await request(app).post("/api/users").set(auth).send(payload());
  await request(app)
    .post("/api/users")
    .set(auth)
    .send(payload({ username: "quanly", email: "ql@example.com", role: "admin" }));

  const theoTen = await request(app).get("/api/users?search=quanly").set(auth);
  assert.equal(theoTen.body.meta.total, 1);

  const theoEmail = await request(app).get("/api/users?search=nv1@").set(auth);
  assert.equal(theoEmail.body.meta.total, 1);

  const theoRole = await request(app).get("/api/users?role=staff").set(auth);
  assert.equal(theoRole.body.data.every((u) => u.role === "staff"), true);
});

test("id không phải số trả 400 ở GET, PUT và DELETE", async () => {
  const get = await request(app).get("/api/users/abc").set(auth);
  const put = await request(app).put("/api/users/abc").set(auth).send(payload());
  const del = await request(app).delete("/api/users/abc").set(auth);

  assert.equal(get.status, 400);
  assert.equal(put.status, 400);
  assert.equal(del.status, 400);
});

test("GET danh sách không bao giờ chứa password", async () => {
  await request(app).post("/api/users").set(auth).send(payload());

  const res = await request(app).get("/api/users").set(auth);

  assert.ok(!JSON.stringify(res.body).includes("$2"), "không được lộ hash");
  assert.ok(res.body.data.every((u) => u.password === undefined));
});
