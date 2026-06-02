const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/dashboard", verifyToken, onlyAdmin, adminController.dashboard);

router.get("/users", verifyToken, onlyAdmin, adminController.getUsers);
router.post("/users", verifyToken, onlyAdmin, adminController.createUser);
router.put("/users/:id", verifyToken, onlyAdmin, adminController.updateUser);
router.delete("/users/:id", verifyToken, onlyAdmin, adminController.deleteUser);

module.exports = router;
