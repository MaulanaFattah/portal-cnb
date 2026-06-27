/**
 * ============================================================================
 * Kelompok Route: Data Guru (guruRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk mengelola data master guru.
 *   - Menampilkan daftar guru bersifat publik (bisa diakses tanpa login).
 *   - Membuat, memperbarui, dan menghapus guru hanya untuk administrator.
 *
 * Otorisasi pada endpoint terproteksi:
 *   - verifyToken : memastikan JWT valid (sudah login).
 *   - onlyAdmin   : memastikan role pengguna adalah "admin".
 *
 * Logika diproses oleh guruController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const guruController = require("../controllers/guruController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

/**
 * GET /
 * Method      : GET
 * Otorisasi   : Publik (tanpa token)
 * Controller  : guruController.getAllGuru
 * Fungsi      : Mengambil seluruh data guru untuk ditampilkan.
 */
router.get("/", guruController.getAllGuru);

/**
 * POST /
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : guruController.createGuru
 * Fungsi      : Menambahkan data guru baru.
 */
router.post("/", verifyToken, onlyAdmin, guruController.createGuru);

/**
 * PUT /:id
 * Method      : PUT
 * Parameter   : :id -> ID guru yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : guruController.updateGuru
 * Fungsi      : Memperbarui data guru tertentu.
 */
router.put("/:id", verifyToken, onlyAdmin, guruController.updateGuru);

/**
 * DELETE /:id
 * Method      : DELETE
 * Parameter   : :id -> ID guru yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : guruController.deleteGuru
 * Fungsi      : Menghapus data guru tertentu.
 */
router.delete("/:id", verifyToken, onlyAdmin, guruController.deleteGuru);

module.exports = router;
