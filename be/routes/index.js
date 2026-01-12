const express = require("express");
const router = express.Router();

const categoriesRouter = require("./categories");
const productsRouter = require("./products");

router.use(categoriesRouter);
router.use("/api/products",productsRouter);

module.exports = router;
