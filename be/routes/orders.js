const express = require("express");
const ordersControllers = require("../controllers/orders");
const { requireAuth } = require("../middlewares/auth");
const router = express.Router();

// POST để mở: người mua không có tài khoản CMS nên không thể có token.
// Ngoại lệ có chủ ý với QĐ-3 spec auth, xem QĐ-1 spec orders.
router.post("/", ordersControllers.createOrder);
router.get("/", requireAuth, ordersControllers.getOrders);
router.get("/:id", requireAuth, ordersControllers.getOrderById);
router.put("/:id/status", requireAuth, ordersControllers.updateOrderStatus);

module.exports = router;
