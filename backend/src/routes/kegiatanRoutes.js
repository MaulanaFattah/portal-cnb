const express = require("express");
const router = express.Router();

const kegiatanController = require("../controllers/kegiatanController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

// public: semua user bisa lihat kegiatan
router.get("/", kegiatanController.getAllKegiatan);

// admin only: tambah, edit, hapus kegiatan
router.post("/", verifyToken, onlyAdmin, kegiatanController.createKegiatan);
router.put("/:id", verifyToken, onlyAdmin, kegiatanController.updateKegiatan);
router.delete("/:id", verifyToken, onlyAdmin, kegiatanController.deleteKegiatan);

module.exports = router;