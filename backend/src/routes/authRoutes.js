const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { forgotPasswordLimiter } = require("../middlewares/rateLimitMiddleware");

router.post("/login", authController.login);
router.post("/register-guru", authController.registerGuru);
router.post("/forgot-password", forgotPasswordLimiter, authController.requestPasswordReset);
router.put("/change-password", verifyToken, authController.changePassword);

module.exports = router;
