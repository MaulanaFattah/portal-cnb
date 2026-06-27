/**
 * ============================================================================
 * Kelompok Route: Kelas (kelasRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk mengelola data master kelas.
 *   - Menampilkan daftar kelas bersifat publik (bisa diakses tanpa login).
 *   - Membuat, memperbarui, dan menghapus kelas hanya untuk administrator.
 *
 * Otorisasi pada endpoint terproteksi:
 *   - verifyToken : memastikan JWT valid (sudah login).
 *   - onlyAdmin   : memastikan role pengguna adalah "admin".
 *
 * Logika diproses oleh kelasController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const kelasController = require("../controllers/kelasController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

/**
 * GET /
 * Method      : GET
 * Otorisasi   : Publik (tanpa token)
 * Controller  : kelasController.getAllKelas
 * Fungsi      : Mengambil seluruh data kelas.
 */
router.get("/", kelasController.getAllKelas);

/**
 * POST /
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : kelasController.createKelas
 * Fungsi      : Menambahkan data kelas baru.
 */
router.post("/", verifyToken, onlyAdmin, kelasController.createKelas);

/**
 * PUT /:id
 * Method      : PUT
 * Parameter   : :id -> ID kelas yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : kelasController.updateKelas
 * Fungsi      : Memperbarui data kelas tertentu.
 */
router.put("/:id", verifyToken, onlyAdmin, kelasController.updateKelas);

/**
 * DELETE /:id
 * Method      : DELETE
 * Parameter   : :id -> ID kelas yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : kelasController.deleteKelas
 * Fungsi      : Menghapus data kelas tertentu.
 */
router.delete("/:id", verifyToken, onlyAdmin, kelasController.deleteKelas);

module.exports = router;
