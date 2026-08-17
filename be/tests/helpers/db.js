const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

if (!process.env.DATABASE_URL_TEST) {
  throw new Error("Thiếu DATABASE_URL_TEST trong be/.env — xem Task 1 Step 1 của plan.");
}

// PHẢI gán trước khi require prisma client, vì PrismaClient đọc DATABASE_URL
// ngay lúc khởi tạo. Đây là lý do mọi test file require helper này ĐẦU TIÊN.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

const prisma = require("../../prisma/client");

// TRUNCATE ... CASCADE dọn sạch mọi bảng và reset lại chuỗi id về 1,
// nên mỗi test bắt đầu từ trạng thái giống hệt nhau.
async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Address","OrderItem","Order","ProductColorImage","ProductColorVariants","ProductColor","Product","Category","User" RESTART IDENTITY CASCADE'
  );
}

module.exports = { prisma, resetDb };
