/**
 * ============================================================================
 * Kelompok Route: Data Siswa (siswaRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk mengelola data master siswa, termasuk:
 *   1. Melihat daftar siswa dan arsip kelas.
 *   2. Proses kenaikan kelas (naik kelas).
 *   3. CRUD data siswa beserta unggah foto.
 *
 * Seluruh endpoint pada file ini diproteksi untuk ADMINISTRATOR:
 *   - verifyToken : memastikan JWT valid (sudah login).
 *   - onlyAdmin   : memastikan role pengguna adalah "admin".
 *
 * Catatan upload:
 *   - Endpoint create & update menggunakan imageUpload("siswa").single("foto")
 *     untuk menerima 1 berkas foto pada field "foto", lalu handleUploadError
 *     untuk menangani error unggah.
 *
 * Logika diproses oleh siswaController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const siswaController = require("../controllers/siswaController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");
const { handleUploadError, imageUpload } = require("../middlewares/uploadMiddleware");

/**
 * GET /
 * Method      : GET
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : siswaController.getAllSiswa
 * Fungsi      : Mengambil seluruh data siswa (aktif).
 */
router.get("/", verifyToken, onlyAdmin, siswaController.getAllSiswa);

/**
 * GET /arsip-kelas
 * Method      : GET
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : siswaController.getArsipKelas
 * Fungsi      : Mengambil data arsip riwayat kelas siswa.
 */
router.get("/arsip-kelas", verifyToken, onlyAdmin, siswaController.getArsipKelas);

/**
 * POST /naik-kelas
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : siswaController.promoteSiswa
 * Fungsi      : Memproses kenaikan kelas (promote) untuk siswa.
 */
router.post("/naik-kelas", verifyToken, onlyAdmin, siswaController.promoteSiswa);
router.put("/:id/nis", verifyToken, onlyAdmin, siswaController.updateNIS);

/**
 * POST /
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Middleware  : imageUpload("siswa").single("foto") -> unggah 1 foto (field "foto")
 *               handleUploadError -> menangani error unggah berkas
 * Controller  : siswaController.createSiswa
 * Fungsi      : Menambahkan data siswa baru beserta fotonya.
 */
router.post("/", verifyToken, onlyAdmin, imageUpload("siswa").single("foto"), handleUploadError, siswaController.createSiswa);

/**
 * PUT /:id
 * Method      : PUT
 * Parameter   : :id -> ID siswa yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin
 * Middleware  : imageUpload("siswa").single("foto") -> unggah 1 foto (opsional)
 *               handleUploadError -> menangani error unggah berkas
 * Controller  : siswaController.updateSiswa
 * Fungsi      : Memperbarui data siswa tertentu (termasuk penggantian foto).
 */
router.put("/:id", verifyToken, onlyAdmin, imageUpload("siswa").single("foto"), handleUploadError, siswaController.updateSiswa);

/**
 * DELETE /:id
 * Method      : DELETE
 * Parameter   : :id -> ID siswa yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : siswaController.deleteSiswa
 * Fungsi      : Menghapus data siswa tertentu.
 */
router.delete("/:id", verifyToken, onlyAdmin, siswaController.deleteSiswa);

module.exports = router;
