const express = require("express");
const router = express.Router();

const kegiatanController = require("../controllers/kegiatanController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");
const { handleUploadError, imageUpload } = require("../middlewares/uploadMiddleware");

// public: semua user bisa lihat kegiatan
router.get("/", kegiatanController.getAllKegiatan);
router.get("/admin/all", verifyToken, onlyAdmin, (req, res, next) => {
  req.query.includeHidden = "true";
  return kegiatanController.getAllKegiatan(req, res, next);
});

// admin only: tambah, edit, hapus kegiatan
router.post("/", verifyToken, onlyAdmin, imageUpload("activities").single("image"), handleUploadError, kegiatanController.createKegiatan);
router.put("/:id", verifyToken, onlyAdmin, imageUpload("activities").single("image"), handleUploadError, kegiatanController.updateKegiatan);
router.delete("/:id", verifyToken, onlyAdmin, kegiatanController.deleteKegiatan);

module.exports = router;
