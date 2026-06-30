/**
 * ============================================================================
 * Kelompok Route: Admin - Portal Guru (adminGuruPortalRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint yang dipakai oleh ADMINISTRATOR untuk mengelola data yang
 * berkaitan dengan portal guru, yaitu:
 *   1. Verifikasi/persetujuan pendaftaran (registrasi) akun guru.
 *   2. Pengelolaan jadwal mengajar (CRUD jadwal).
 *
 * Seluruh endpoint pada file ini diproteksi oleh dua middleware:
 *   - verifyToken : memastikan request membawa JWT yang valid (sudah login).
 *   - onlyAdmin   : memastikan role pengguna adalah "admin".
 *
 * Controller yang menangani logika ada di guruPortalController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const guruPortalController = require("../controllers/guruPortalController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

/**
 * GET /registrations
 * Method      : GET
 * Otorisasi   : verifyToken + onlyAdmin (hanya administrator)
 * Controller  : guruPortalController.getGuruRegistrations
 * Fungsi      : Mengambil daftar pendaftaran (registrasi) akun guru yang
 *               masuk, agar admin dapat meninjau dan memverifikasinya.
 */
router.get("/registrations", verifyToken, onlyAdmin, guruPortalController.getGuruRegistrations);

/**
 * POST /accounts
 * Otorisasi  : verifyToken + onlyAdmin
 * Controller : guruPortalController.createGuruAccount
 * Fungsi     : Admin membuat akun guru langsung (registrasi mandiri dinonaktifkan).
 */
router.post("/accounts", verifyToken, onlyAdmin, guruPortalController.createGuruAccount);

/**
 * PUT /registrations/:userId
 * Method      : PUT
 * Parameter   : :userId -> ID akun pengguna (guru) yang akan diverifikasi.
 * Otorisasi   : verifyToken + onlyAdmin (hanya administrator)
 * Controller  : guruPortalController.verifyGuruRegistration
 * Fungsi      : Memverifikasi/menyetujui (atau memperbarui status) pendaftaran
 *               akun guru tertentu berdasarkan userId.
 */
router.put("/registrations/:userId", verifyToken, onlyAdmin, guruPortalController.verifyGuruRegistration);

/**
 * DELETE /registrations/:userId
 * Method      : DELETE
 * Parameter   : :userId -> ID akun pengguna (guru) yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin (hanya administrator)
 * Controller  : guruPortalController.deleteGuruRegistration
 * Fungsi      : Menghapus/menolak pendaftaran akun guru tertentu.
 */
router.delete("/registrations/:userId", verifyToken, onlyAdmin, guruPortalController.deleteGuruRegistration);

/**
 * GET /jadwal
 * Method      : GET
 * Otorisasi   : verifyToken + onlyAdmin (hanya administrator)
 * Controller  : guruPortalController.getJadwalAdmin
 * Fungsi      : Mengambil seluruh data jadwal mengajar dari sudut pandang
 *               admin (semua guru/kelas).
 */
router.get("/jadwal", verifyToken, onlyAdmin, guruPortalController.getJadwalAdmin);

/**
 * POST /jadwal
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin (hanya administrator)
 * Controller  : guruPortalController.createJadwal
 * Fungsi      : Membuat data jadwal mengajar baru.
 */
router.post("/jadwal", verifyToken, onlyAdmin, guruPortalController.createJadwal);

/**
 * PUT /jadwal/:id
 * Method      : PUT
 * Parameter   : :id -> ID jadwal mengajar yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin (hanya administrator)
 * Controller  : guruPortalController.updateJadwal
 * Fungsi      : Memperbarui data jadwal mengajar tertentu.
 */
router.put("/jadwal/:id", verifyToken, onlyAdmin, guruPortalController.updateJadwal);

/**
 * DELETE /jadwal/:id
 * Method      : DELETE
 * Parameter   : :id -> ID jadwal mengajar yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin (hanya administrator)
 * Controller  : guruPortalController.deleteJadwal
 * Fungsi      : Menghapus data jadwal mengajar tertentu.
 */
router.delete("/jadwal/:id", verifyToken, onlyAdmin, guruPortalController.deleteJadwal);

module.exports = router;
