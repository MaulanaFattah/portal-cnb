const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/dashboard", verifyToken, onlyAdmin, adminController.dashboard);

router.get("/users", verifyToken, onlyAdmin, adminController.getUsers);
router.post("/users", verifyToken, onlyAdmin, adminController.createUser);
router.put("/users/:id", verifyToken, onlyAdmin, adminController.updateUser);
router.delete("/users/:id", verifyToken, onlyAdmin, adminController.deleteUser);
router.put("/users/:id/reset-password", verifyToken, onlyAdmin, adminController.resetUserPassword);
router.get("/password-reset-requests", verifyToken, onlyAdmin, adminController.getPasswordResetRequests);
router.put("/password-reset-requests/:id/reset", verifyToken, onlyAdmin, adminController.processPasswordResetRequest);
router.put("/password-reset-requests/:id/reject", verifyToken, onlyAdmin, adminController.rejectPasswordResetRequest);

module.exports = router;
