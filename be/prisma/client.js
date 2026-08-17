const { PrismaClient } = require("../generated/prisma");

// Một instance duy nhất cho toàn app. Mỗi `new PrismaClient()` mở một pool
// kết nối riêng, tạo nhiều instance sẽ làm cạn connection pool của Postgres.
const prisma = new PrismaClient();

module.exports = prisma;
