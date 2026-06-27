/**
 * ============================================================================
 * Kelompok Route: Profil Sekolah (profilSekolahRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk mengelola data profil sekolah (informasi umum sekolah).
 *   - Menampilkan profil sekolah bersifat publik (tanpa login).
 *   - Membuat dan memperbarui profil hanya untuk administrator.
 *
 * Otorisasi pada endpoint terproteksi:
 *   - verifyToken : memastikan JWT valid (sudah login).
 *   - onlyAdmin   : memastikan role pengguna adalah "admin".
 *
 * Logika diproses oleh profilSekolahController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const profilSekolahController = require("../controllers/profilSekolahController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

/**
 * GET /
 * Method      : GET
 * Otorisasi   : Publik (tanpa token)
 * Controller  : profilSekolahController.getProfilSekolah
 * Fungsi      : Mengambil data profil sekolah untuk ditampilkan.
 */
router.get("/", profilSekolahController.getProfilSekolah);

/**
 * POST /
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : profilSekolahController.createProfilSekolah
 * Fungsi      : Membuat data profil sekolah (mis. inisialisasi awal).
 */
router.post("/", verifyToken, onlyAdmin, profilSekolahController.createProfilSekolah);

/**
 * PUT /
 * Method      : PUT
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : profilSekolahController.updateProfilSekolah
 * Fungsi      : Memperbarui data profil sekolah yang sudah ada.
 */
router.put("/", verifyToken, onlyAdmin, profilSekolahController.updateProfilSekolah);

module.exports = router;
