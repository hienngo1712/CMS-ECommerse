const express = require("express");
const categoriesControllers = require("../controllers/categories");
const router = express.Router();

//create category
router.post("/api/categories", categoriesControllers.createCategory);
router.get("/api/categories", categoriesControllers.getCategories);

module.exports = router;