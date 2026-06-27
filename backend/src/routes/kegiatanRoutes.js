/**
 * ============================================================================
 * Kelompok Route: Kegiatan (kegiatanRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk mengelola data kegiatan sekolah.
 *   - Menampilkan kegiatan bersifat publik.
 *   - Terdapat endpoint khusus admin untuk melihat semua kegiatan termasuk
 *     yang disembunyikan (includeHidden).
 *   - Membuat, memperbarui, dan menghapus kegiatan hanya untuk administrator.
 *
 * Catatan upload:
 *   - Endpoint create & update menggunakan imageUpload("kegiatan").single("image")
 *     untuk menerima 1 gambar pada field "image", lalu handleUploadError untuk
 *     menangani error unggah.
 *
 * Logika diproses oleh kegiatanController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const kegiatanController = require("../controllers/kegiatanController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");
const { handleUploadError, imageUpload } = require("../middlewares/uploadMiddleware");

/**
 * GET /
 * Method      : GET
 * Otorisasi   : Publik (tanpa token)
 * Controller  : kegiatanController.getAllKegiatan
 * Fungsi      : Mengambil daftar kegiatan yang tampil untuk umum.
 */
// public: semua user bisa lihat kegiatan
router.get("/", kegiatanController.getAllKegiatan);

/**
 * GET /admin/all
 * Method      : GET
 * Otorisasi   : verifyToken + onlyAdmin
 * Middleware  : handler inline yang memaksa req.query.includeHidden = "true"
 *               sebelum meneruskan ke controller, sehingga kegiatan yang
 *               disembunyikan ikut ditampilkan untuk admin.
 * Controller  : kegiatanController.getAllKegiatan (dipanggil ulang dengan includeHidden)
 * Fungsi      : Mengambil seluruh kegiatan termasuk yang tersembunyi untuk admin.
 */
router.get("/admin/all", verifyToken, onlyAdmin, (req, res, next) => {
  req.query.includeHidden = "true";
  return kegiatanController.getAllKegiatan(req, res, next);
});

/**
 * POST /
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Middleware  : imageUpload("kegiatan").single("image") -> unggah 1 gambar (field "image")
 *               handleUploadError -> menangani error unggah berkas
 * Controller  : kegiatanController.createKegiatan
 * Fungsi      : Menambahkan kegiatan baru beserta gambarnya.
 */
// admin only: tambah, edit, hapus kegiatan
router.post("/", verifyToken, onlyAdmin, imageUpload("kegiatan").single("image"), handleUploadError, kegiatanController.createKegiatan);

/**
 * PUT /:id
 * Method      : PUT
 * Parameter   : :id -> ID kegiatan yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin
 * Middleware  : imageUpload("kegiatan").single("image") -> unggah 1 gambar (opsional)
 *               handleUploadError -> menangani error unggah berkas
 * Controller  : kegiatanController.updateKegiatan
 * Fungsi      : Memperbarui kegiatan tertentu (termasuk penggantian gambar).
 */
router.put("/:id", verifyToken, onlyAdmin, imageUpload("kegiatan").single("image"), handleUploadError, kegiatanController.updateKegiatan);

/**
 * DELETE /:id
 * Method      : DELETE
 * Parameter   : :id -> ID kegiatan yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : kegiatanController.deleteKegiatan
 * Fungsi      : Menghapus kegiatan tertentu.
 */
router.delete("/:id", verifyToken, onlyAdmin, kegiatanController.deleteKegiatan);

module.exports = router;
