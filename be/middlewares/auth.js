const prisma = require("../prisma/client");
const { verifyToken } = require("../utils/jwt");

// Tra lại DB mỗi request thay vì tin hoàn toàn vào payload trong token: khoá
// một tài khoản có hiệu lực ngay, không phải chờ token hết hạn sau 1 ngày.
const requireAuth = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Chưa đăng nhập" });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: payload.id, isDeleted: false, isActive: true },
      // Liệt kê cột tường minh: không bao giờ để `password` lọt vào req.user.
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { requireAuth };
