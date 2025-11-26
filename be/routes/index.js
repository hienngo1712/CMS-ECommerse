const express = require("express");
const router = express.Router();

const categoriesRouter = require("./categories");
router.use(categoriesRouter);

module.exports = router;
