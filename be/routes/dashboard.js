const express = require("express");
const dashboardControllers = require("../controllers/dashboard");
const { requireAuth } = require("../middlewares/auth");
const router = express.Router();

// Số liệu kinh doanh, không phải thứ để trang bán hàng đọc — luôn cần token.
router.get("/stats", requireAuth, dashboardControllers.getStats);

module.exports = router;
