const express = require("express");
const usersControllers = require("../controllers/users");
const { requireAuth, requireRole } = require("../middlewares/auth");
const router = express.Router();

// Toàn bộ module chỉ dành cho admin — xem QĐ-1 spec users. Đặt ở router thay vì
// gắn lại từng route để không có đường nào lọt ra ngoài khi thêm route mới.
router.use(requireAuth, requireRole("admin"));

router.post("/", usersControllers.createUser);
router.get("/", usersControllers.getUsers);
router.get("/:id", usersControllers.getUserById);
router.put("/:id", usersControllers.updateUser);
router.delete("/:id", usersControllers.deleteUser);

module.exports = router;
