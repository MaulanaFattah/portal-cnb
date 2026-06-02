const express = require("express");
const router = express.Router();

const guruController = require("../controllers/guruController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/", guruController.getAllGuru);
router.post("/", verifyToken, onlyAdmin, guruController.createGuru);
router.put("/:id", verifyToken, onlyAdmin, guruController.updateGuru);
router.delete("/:id", verifyToken, onlyAdmin, guruController.deleteGuru);

module.exports = router;
