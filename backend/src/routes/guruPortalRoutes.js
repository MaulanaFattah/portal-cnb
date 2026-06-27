/**
 * ============================================================================
 * Kelompok Route: Portal Guru (guruPortalRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint yang dipakai oleh GURU saat login ke portal mereka:
 *   1. Melihat dashboard guru.
 *   2. Memperbarui profil guru.
 *   3. Menyimpan/mengirim data absensi siswa.
 *   4. Melihat rekap absensi.
 *   5. Membuat akun siswa (mis. untuk kelas yang diampu).
 *
 * Seluruh endpoint diproteksi oleh middleware:
 *   - verifyToken : memastikan JWT valid (sudah login).
 *   - onlyGuru    : memastikan role pengguna adalah "guru".
 *
 * Logika diproses oleh guruPortalController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const guruPortalController = require("../controllers/guruPortalController");
const { verifyToken, onlyGuru } = require("../middlewares/authMiddleware");

/**
 * GET /dashboard
 * Method      : GET
 * Otorisasi   : verifyToken + onlyGuru
 * Controller  : guruPortalController.getDashboard
 * Fungsi      : Menampilkan data ringkasan dashboard untuk guru.
 */
router.get("/dashboard", verifyToken, onlyGuru, guruPortalController.getDashboard);

/**
 * PUT /profile
 * Method      : PUT
 * Otorisasi   : verifyToken + onlyGuru
 * Controller  : guruPortalController.updateProfile
 * Fungsi      : Memperbarui data profil guru yang sedang login.
 */
router.put("/profile", verifyToken, onlyGuru, guruPortalController.updateProfile);

/**
 * POST /absensi
 * Method      : POST
 * Otorisasi   : verifyToken + onlyGuru
 * Controller  : guruPortalController.submitAbsensi
 * Fungsi      : Menyimpan/mengirim data absensi siswa yang diinput guru.
 */
router.post("/absensi", verifyToken, onlyGuru, guruPortalController.submitAbsensi);

/**
 * GET /rekap
 * Method      : GET
 * Otorisasi   : verifyToken + onlyGuru
 * Controller  : guruPortalController.getRekapAbsensi
 * Fungsi      : Mengambil rekap/laporan absensi untuk guru.
 */
router.get("/rekap", verifyToken, onlyGuru, guruPortalController.getRekapAbsensi);

/**
 * POST /akun-siswa
 * Method      : POST
 * Otorisasi   : verifyToken + onlyGuru
 * Controller  : guruPortalController.createStudentAccounts
 * Fungsi      : Membuat akun siswa (dapat secara massal) yang dikelola guru.
 */
router.post("/akun-siswa", verifyToken, onlyGuru, guruPortalController.createStudentAccounts);

module.exports = router;
