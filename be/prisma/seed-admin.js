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

  // Không dùng upsert được nữa: username thôi @unique kể từ khi chuyển sang
  // index một phần, mà upsert đòi where phải là khoá unique.
  // Chạy lại script với cùng username thì đổi mật khẩu chứ không lỗi trùng khoá.
  const existing = await prisma.user.findFirst({ where: { username } });

  const data = {
    password: hashed,
    email,
    role: "admin",
    isActive: true,
    isDeleted: false,
  };

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data,
        select: { id: true, username: true, email: true, role: true },
      })
    : await prisma.user.create({
        data: { username, ...data },
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
