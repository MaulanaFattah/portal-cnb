const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/dashboard", verifyToken, onlyAdmin, adminController.dashboard);

module.exports = router;