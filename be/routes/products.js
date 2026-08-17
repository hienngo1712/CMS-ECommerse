const express = require('express');
const productsControllers = require('../controllers/products');
const router = express.Router();

router.post("/", productsControllers.createProduct);
router.get("/", productsControllers.getProducts);
router.put("/:id", productsControllers.updateProduct);
module.exports = router;