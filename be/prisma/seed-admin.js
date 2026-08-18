const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const prisma = require("./client");

// Cách dùng:
//   node prisma/seed-admin.js <username> <email> <password>
// hoặc đặt ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD trong be/.env rồi
//   node prisma/seed-admin.js
const [argUsername, argEmail, argPassword] = process.argv.slice(2);

const username = argUsername || process.env.ADMIN_USERNAME;
const email = argEmail || process.env.ADMIN_EMAIL;
const password = argPassword || process.env.ADMIN_PASSWORD;

async function main() {
  if (!username || !email || !password) {
    throw new Error(
      "Thiếu tham số. Dùng: node prisma/seed-admin.js <username> <email> <password>"
    );
  }

  // Ràng buộc độ dài đặt ở đây chứ không ở bước đăng nhập, để lúc đăng nhập
  // không tiết lộ quy tắc mật khẩu cho người đang dò.
  if (password.length < 8) {
    throw new Error("Mật khẩu phải từ 8 ký tự trở lên");
  }

  const hashed = await bcrypt.hash(password, 10);

  // Chạy lại script với cùng username thì đổi mật khẩu chứ không lỗi trùng khoá.
  const user = await prisma.user.upsert({
    where: { username },
    update: { password: hashed, email, role: "admin", isActive: true, isDeleted: false },
    create: { username, email, password: hashed, role: "admin" },
    select: { id: true, username: true, email: true, role: true },
  });

  console.log("Đã tạo/cập nhật tài khoản:", user);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
