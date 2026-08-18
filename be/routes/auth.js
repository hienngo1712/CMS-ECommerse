const express = require("express");
const authControllers = require("../controllers/auth");
const { requireAuth } = require("../middlewares/auth");
const router = express.Router();

router.post("/login", authControllers.login);
router.get("/me", requireAuth, authControllers.me);

module.exports = router;
