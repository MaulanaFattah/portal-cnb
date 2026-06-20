const express = require("express");
const router = express.Router();

const siswaController = require("../controllers/siswaController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");
const { handleUploadError, imageUpload } = require("../middlewares/uploadMiddleware");

router.get("/", verifyToken, onlyAdmin, siswaController.getAllSiswa);
router.post("/", verifyToken, onlyAdmin, imageUpload("siswa").single("foto"), handleUploadError, siswaController.createSiswa);
router.put("/:id", verifyToken, onlyAdmin, imageUpload("siswa").single("foto"), handleUploadError, siswaController.updateSiswa);
router.delete("/:id", verifyToken, onlyAdmin, siswaController.deleteSiswa);

module.exports = router;
