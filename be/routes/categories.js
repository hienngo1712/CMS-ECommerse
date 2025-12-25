const express = require("express");
const categoriesControllers = require("../controllers/categories");
const router = express.Router();

//create category
router.post("/api/categories", categoriesControllers.createCategory);
router.get("/api/categories", categoriesControllers.getCategories);
router.get("/api/categories/:id", categoriesControllers.getCategoryById);
router.put("/api/categories/:id", categoriesControllers.updateCategory);
router.delete("/api/categories/:id", categoriesControllers.deleteCategory);

module.exports = router;