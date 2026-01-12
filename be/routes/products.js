const express = require('express');
const productsControllers = require('../controllers/products');
const router = express.Router();

router.post("/", productsControllers.createProduct);
// router.get("/");
// router.put("/:id");
module.exports = router;