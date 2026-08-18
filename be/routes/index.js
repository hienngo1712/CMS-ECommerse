const express = require("express");
const router = express.Router();

const authRouter = require("./auth");
const categoriesRouter = require("./categories");
const productsRouter = require("./products");

router.use("/api/auth", authRouter);
router.use(categoriesRouter);
router.use("/api/products",productsRouter);

module.exports = router;
