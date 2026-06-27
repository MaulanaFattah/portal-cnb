/**
 * ============================================================================
 * Kelompok Route: Data Kepala Sekolah (kepalaSekolahRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk mengelola data master kepala sekolah.
 *   - Menampilkan daftar kepala sekolah bersifat publik (tanpa login).
 *   - Membuat, memperbarui, dan menghapus hanya untuk administrator.
 *
 * Otorisasi pada endpoint terproteksi:
 *   - verifyToken : memastikan JWT valid (sudah login).
 *   - onlyAdmin   : memastikan role pengguna adalah "admin".
 *
 * Logika diproses oleh kepalaSekolahController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const kepalaSekolahController = require("../controllers/kepalaSekolahController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

/**
 * GET /
 * Method      : GET
 * Otorisasi   : Publik (tanpa token)
 * Controller  : kepalaSekolahController.getAllKepalaSekolah
 * Fungsi      : Mengambil seluruh data kepala sekolah.
 */
router.get("/", kepalaSekolahController.getAllKepalaSekolah);

/**
 * POST /
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : kepalaSekolahController.createKepalaSekolah
 * Fungsi      : Menambahkan data kepala sekolah baru.
 */
router.post("/", verifyToken, onlyAdmin, kepalaSekolahController.createKepalaSekolah);

/**
 * PUT /:id
 * Method      : PUT
 * Parameter   : :id -> ID kepala sekolah yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : kepalaSekolahController.updateKepalaSekolah
 * Fungsi      : Memperbarui data kepala sekolah tertentu.
 */
router.put("/:id", verifyToken, onlyAdmin, kepalaSekolahController.updateKepalaSekolah);

/**
 * DELETE /:id
 * Method      : DELETE
 * Parameter   : :id -> ID kepala sekolah yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : kepalaSekolahController.deleteKepalaSekolah
 * Fungsi      : Menghapus data kepala sekolah tertentu.
 */
router.delete("/:id", verifyToken, onlyAdmin, kepalaSekolahController.deleteKepalaSekolah);

module.exports = router;
