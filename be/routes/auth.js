const express = require("express");
const authControllers = require("../controllers/auth");
const { requireAuth } = require("../middlewares/auth");
const { loginLimiter } = require("../middlewares/rateLimit");
const router = express.Router();

// bcrypt chỉ làm chậm MỘT lần thử. Không có giới hạn số lần thì vẫn dò được
// mật khẩu bằng cách thử rất nhiều lần.
router.post("/login", loginLimiter, authControllers.login);
router.get("/me", requireAuth, authControllers.me);
router.put("/password", requireAuth, authControllers.changePassword);

module.exports = router;
