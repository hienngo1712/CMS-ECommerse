const express = require("express");
const categoriesControllers = require("../controllers/categories");
const { requireAuth } = require("../middlewares/auth");
const router = express.Router();

// GET để mở: trang bán hàng cho khách phải đọc được danh mục mà không đăng nhập.
// Các route ghi thì bắt buộc có token — xem QĐ-3 của spec auth.
router.post("/api/categories", requireAuth, categoriesControllers.createCategory);
router.get("/api/categories", categoriesControllers.getCategories);
router.get("/api/categories/:id", categoriesControllers.getCategoryById);
router.put("/api/categories/:id", requireAuth, categoriesControllers.updateCategory);
router.delete("/api/categories/:id", requireAuth, categoriesControllers.deleteCategory);

module.exports = router;
