const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// Không có secret mặc định dự phòng: một secret ai cũng đoán được lọt lên
// production còn tệ hơn là server không khởi động nổi. Ném ngay lúc nạp module
// để lỗi lộ ra lúc chạy `npm run dev`, chứ không phải lúc người dùng đăng nhập.
if (!JWT_SECRET) {
  throw new Error("Thiếu JWT_SECRET trong be/.env");
}

const TOKEN_TTL = "1d";

const signToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = { signToken, verifyToken };
