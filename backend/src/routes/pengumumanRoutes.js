const express = require("express");
const router = express.Router();

const pengumumanController = require("../controllers/pengumumanController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/", pengumumanController.getAllPengumuman);
router.post("/", verifyToken, onlyAdmin, pengumumanController.createPengumuman);
router.put("/:id", verifyToken, onlyAdmin, pengumumanController.updatePengumuman);
router.delete("/:id", verifyToken, onlyAdmin, pengumumanController.deletePengumuman);

module.exports = router;
