const express = require("express");
const router = express.Router();

const siswaController = require("../controllers/siswaController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/", verifyToken, onlyAdmin, siswaController.getAllSiswa);
router.post("/", verifyToken, onlyAdmin, siswaController.createSiswa);
router.put("/:id", verifyToken, onlyAdmin, siswaController.updateSiswa);
router.delete("/:id", verifyToken, onlyAdmin, siswaController.deleteSiswa);

module.exports = router;
