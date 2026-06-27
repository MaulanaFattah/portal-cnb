/**
 * ============================================================================
 * Kelompok Route: Pengumuman (pengumumanRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk mengelola data pengumuman sekolah.
 *   - Menampilkan daftar pengumuman bersifat publik (tanpa login).
 *   - Membuat, memperbarui, dan menghapus hanya untuk administrator.
 *
 * Otorisasi pada endpoint terproteksi:
 *   - verifyToken : memastikan JWT valid (sudah login).
 *   - onlyAdmin   : memastikan role pengguna adalah "admin".
 *
 * Logika diproses oleh pengumumanController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const pengumumanController = require("../controllers/pengumumanController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

/**
 * GET /
 * Method      : GET
 * Otorisasi   : Publik (tanpa token)
 * Controller  : pengumumanController.getAllPengumuman
 * Fungsi      : Mengambil seluruh data pengumuman untuk ditampilkan.
 */
router.get("/", pengumumanController.getAllPengumuman);

/**
 * POST /
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : pengumumanController.createPengumuman
 * Fungsi      : Menambahkan pengumuman baru.
 */
router.post("/", verifyToken, onlyAdmin, pengumumanController.createPengumuman);

/**
 * PUT /:id
 * Method      : PUT
 * Parameter   : :id -> ID pengumuman yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : pengumumanController.updatePengumuman
 * Fungsi      : Memperbarui pengumuman tertentu.
 */
router.put("/:id", verifyToken, onlyAdmin, pengumumanController.updatePengumuman);

/**
 * DELETE /:id
 * Method      : DELETE
 * Parameter   : :id -> ID pengumuman yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : pengumumanController.deletePengumuman
 * Fungsi      : Menghapus pengumuman tertentu.
 */
router.delete("/:id", verifyToken, onlyAdmin, pengumumanController.deletePengumuman);

module.exports = router;
