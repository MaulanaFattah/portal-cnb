const express = require("express");
const router = express.Router();

const kelasController = require("../controllers/kelasController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/", kelasController.getAllKelas);
router.post("/", verifyToken, onlyAdmin, kelasController.createKelas);
router.put("/:id", verifyToken, onlyAdmin, kelasController.updateKelas);
router.delete("/:id", verifyToken, onlyAdmin, kelasController.deleteKelas);

module.exports = router;
