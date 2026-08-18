const express = require("express");
const router = express.Router();

const authRouter = require("./auth");
const categoriesRouter = require("./categories");
const productsRouter = require("./products");
const ordersRouter = require("./orders");
const dashboardRouter = require("./dashboard");

router.use("/api/auth", authRouter);
router.use(categoriesRouter);
router.use("/api/products",productsRouter);
router.use("/api/orders", ordersRouter);
router.use("/api/dashboard", dashboardRouter);

module.exports = router;
