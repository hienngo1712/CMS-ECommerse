const bcrypt = require("bcryptjs");
const prisma = require("../prisma/client");
const { signToken } = require("../utils/jwt");
const { validateLoginPayload } = require("../validators/auth");

// Hash giả dùng khi không tìm thấy user. Nếu bỏ qua bcrypt.compare trong trường
// hợp đó thì request với username không tồn tại trả về nhanh hơn hẳn, và người
// ngoài dò được username nào có thật chỉ bằng cách đo thời gian phản hồi.
const DUMMY_HASH = bcrypt.hashSync("khong-bao-gio-khop", 10);

// Một câu duy nhất cho cả sai username lẫn sai mật khẩu — xem QĐ-6 của spec.
const INVALID_CREDENTIALS = "Sai tài khoản hoặc mật khẩu";

const authControllers = {
  login: async (req, res) => {
    try {
      const errors = validateLoginPayload(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors[0], details: errors });
      }

      const { username, password } = req.body;
      const identifier = username.trim();

      const user = await prisma.user.findFirst({
        where: {
          isDeleted: false,
          OR: [{ username: identifier }, { email: identifier }],
        },
      });

      const matched = await bcrypt.compare(
        password,
        user ? user.password : DUMMY_HASH
      );

      if (!user || !matched) {
        return res.status(401).json({ error: INVALID_CREDENTIALS });
      }

      // Chỉ báo tài khoản bị khoá sau khi mật khẩu đã đúng. Báo sớm hơn là tiết
      // lộ username có thật cho người chưa biết mật khẩu.
      if (!user.isActive) {
        return res.status(403).json({ error: "Tài khoản đã bị khoá" });
      }

      res.json({
        token: signToken(user),
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // requireAuth đã tra DB và gán req.user, ở đây chỉ trả lại.
  me: async (req, res) => {
    res.json(req.user);
  },
};

module.exports = authControllers;
