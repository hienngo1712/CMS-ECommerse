const bcrypt = require("bcryptjs");
const { prisma } = require("./db");
const { signToken } = require("../../utils/jwt");

let counter = 0;

// cost 4 thay vì 10: test tạo user ở gần như mọi case, cost 10 cộng dồn lại
// thành vài giây chờ vô ích. bcrypt.compare vẫn đọc được cost từ chính chuỗi
// hash nên đăng nhập qua API với user này vẫn chạy đúng.
const TEST_COST = 4;

const createUser = async (overrides = {}) => {
  counter += 1;
  const { password = "matkhau123", ...rest } = overrides;

  return prisma.user.create({
    data: {
      username: `user${counter}`,
      email: `user${counter}@example.com`,
      password: await bcrypt.hash(password, TEST_COST),
      role: "admin",
      ...rest,
    },
  });
};

// Trả sẵn object header để test viết `.set(auth)`. Phải tạo user thật trong DB
// vì requireAuth tra lại bảng User ở mỗi request chứ không chỉ verify chữ ký.
const authHeader = async (overrides = {}) => {
  const user = await createUser(overrides);
  return { Authorization: `Bearer ${signToken(user)}` };
};

module.exports = { createUser, authHeader, TEST_COST };
