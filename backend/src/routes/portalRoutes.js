/**
 * ============================================================================
 * Kelompok Route: Portal Pengguna (portalRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint portal untuk berbagai peran pengguna:
 *   1. Kepala Sekolah (atau Admin) : dashboard & pembaruan profil.
 *   2. Siswa                        : dashboard, profil, dan absensi.
 *   3. Orang Tua                    : dashboard, profil, dan absensi anak.
 *
 * Setiap kelompok endpoint diproteksi sesuai perannya:
 *   - verifyToken                 : memastikan JWT valid (sudah login).
 *   - onlyKepalaSekolahOrAdmin    : role "kepala_sekolah" atau "admin".
 *   - onlySiswa                   : role "siswa".
 *   - onlyOrangTua                : role "orangtua".
 *
 * Logika diproses oleh portalController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const portalController = require("../controllers/portalController");
const { verifyToken, onlySiswa, onlyOrangTua, onlyKepalaSekolahOrAdmin } = require("../middlewares/authMiddleware");

/**
 * GET /kepala-sekolah/dashboard
 * Method      : GET
 * Otorisasi   : verifyToken + onlyKepalaSekolahOrAdmin
 * Controller  : portalController.getKepalaSekolahDashboard
 * Fungsi      : Menampilkan data dashboard untuk kepala sekolah/admin.
 */
router.get("/kepala-sekolah/dashboard", verifyToken, onlyKepalaSekolahOrAdmin, portalController.getKepalaSekolahDashboard);

/**
 * PUT /kepala-sekolah/profile
 * Method      : PUT
 * Otorisasi   : verifyToken + onlyKepalaSekolahOrAdmin
 * Controller  : portalController.updateKepalaSekolahProfile
 * Fungsi      : Memperbarui profil kepala sekolah.
 */
router.put("/kepala-sekolah/profile", verifyToken, onlyKepalaSekolahOrAdmin, portalController.updateKepalaSekolahProfile);

/**
 * GET /siswa/dashboard
 * Method      : GET
 * Otorisasi   : verifyToken + onlySiswa
 * Controller  : portalController.getSiswaDashboard
 * Fungsi      : Menampilkan data dashboard untuk siswa.
 */
router.get("/siswa/dashboard", verifyToken, onlySiswa, portalController.getSiswaDashboard);

/**
 * PUT /siswa/profile
 * Method      : PUT
 * Otorisasi   : verifyToken + onlySiswa
 * Controller  : portalController.updateSiswaProfile
 * Fungsi      : Memperbarui profil siswa yang sedang login.
 */
router.put("/siswa/profile", verifyToken, onlySiswa, portalController.updateSiswaProfile);

/**
 * GET /siswa/absensi
 * Method      : GET
 * Otorisasi   : verifyToken + onlySiswa
 * Controller  : portalController.getSiswaAbsensi
 * Fungsi      : Mengambil data absensi milik siswa yang sedang login.
 */
router.get("/siswa/absensi", verifyToken, onlySiswa, portalController.getSiswaAbsensi);

/**
 * GET /orangtua/dashboard
 * Method      : GET
 * Otorisasi   : verifyToken + onlyOrangTua
 * Controller  : portalController.getOrangTuaDashboard
 * Fungsi      : Menampilkan data dashboard untuk orang tua/wali.
 */
router.get("/orangtua/dashboard", verifyToken, onlyOrangTua, portalController.getOrangTuaDashboard);

/**
 * PUT /orangtua/profile
 * Method      : PUT
 * Otorisasi   : verifyToken + onlyOrangTua
 * Controller  : portalController.updateOrangTuaProfile
 * Fungsi      : Memperbarui profil orang tua/wali yang sedang login.
 */
router.put("/orangtua/profile", verifyToken, onlyOrangTua, portalController.updateOrangTuaProfile);

/**
 * GET /orangtua/absensi
 * Method      : GET
 * Otorisasi   : verifyToken + onlyOrangTua
 * Controller  : portalController.getOrangTuaAbsensi
 * Fungsi      : Mengambil data absensi anak dari orang tua/wali terkait.
 */
router.get("/orangtua/absensi", verifyToken, onlyOrangTua, portalController.getOrangTuaAbsensi);

module.exports = router;
