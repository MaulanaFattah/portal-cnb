const express = require("express");
const router = express.Router();

const profilSekolahController = require("../controllers/profilSekolahController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

router.get("/", profilSekolahController.getProfilSekolah);
router.post("/", verifyToken, onlyAdmin, profilSekolahController.createProfilSekolah);
router.put("/", verifyToken, onlyAdmin, profilSekolahController.updateProfilSekolah);

module.exports = router;
