const express = require('express');
const productsControllers = require('../controllers/products');
const { requireAuth } = require('../middlewares/auth');
const router = express.Router();

// GET để mở cho trang bán hàng, route ghi bắt buộc token — xem QĐ-3 spec auth.
router.post("/", requireAuth, productsControllers.createProduct);
router.get("/", productsControllers.getProducts);
router.get("/:id", productsControllers.getProductById);
router.put("/:id", requireAuth, productsControllers.updateProduct);
router.delete("/:id", requireAuth, productsControllers.deleteProduct);
module.exports = router;
