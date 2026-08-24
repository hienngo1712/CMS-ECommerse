const { rateLimit, MemoryStore } = require("express-rate-limit");

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

// Giữ tham chiếu tới store để test reset được giữa các case. Không có nó thì
// case sau kế thừa số lần đếm của case trước và fail loạn xạ.
const loginStore = new MemoryStore();

const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_FAILED_ATTEMPTS,
  store: loginStore,
  // Chỉ đếm lần đăng nhập HỎNG. Đếm cả lần thành công thì một người dùng thật
  // đăng nhập đi đăng nhập lại trong ngày cũng bị khoá, mà việc đó vô hại.
  skipSuccessfulRequests: true,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      error: "Bạn đã thử đăng nhập sai quá nhiều lần, vui lòng đợi ít phút",
    }),
});

// Dùng trong test. Không có đường nào gọi được từ HTTP.
const resetRateLimits = () => loginStore.resetAll();

module.exports = { loginLimiter, resetRateLimits, MAX_FAILED_ATTEMPTS };
