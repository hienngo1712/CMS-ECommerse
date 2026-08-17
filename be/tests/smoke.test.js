const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

const { prisma, resetDb } = require("./helpers/db");
const request = require("supertest");
const app = require("../app");

before(async () => {
  await resetDb();
});

after(async () => {
  await prisma.$disconnect();
});

test("GET / trả về 200", async () => {
  const res = await request(app).get("/");
  assert.equal(res.status, 200);
});

test("resetDb dọn sạch bảng Category", async () => {
  await prisma.category.create({ data: { name: "Tạm", slug: "tam" } });
  await resetDb();
  assert.equal(await prisma.category.count(), 0);
});
