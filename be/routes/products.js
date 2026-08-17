const express = require('express');
const productsControllers = require('../controllers/products');
const router = express.Router();

router.post("/", productsControllers.createProduct);
router.get("/", productsControllers.getProducts);
router.get("/:id", productsControllers.getProductById);
router.put("/:id", productsControllers.updateProduct);
module.exports = router;