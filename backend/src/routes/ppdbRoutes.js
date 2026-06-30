/**
 * ============================================================================
 * Kelompok Route: PPDB (ppdbRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk Penerimaan Peserta Didik Baru (PPDB).
 *   - Pendaftaran (create) dan cek status bersifat publik agar calon pendaftar
 *     dapat mendaftar dan memantau status tanpa login.
 *   - Melihat seluruh data, memperbarui, dan menghapus pendaftaran hanya untuk
 *     administrator.
 *
 * Otorisasi pada endpoint terproteksi:
 *   - verifyToken : memastikan JWT valid (sudah login).
 *   - onlyAdmin   : memastikan role pengguna adalah "admin".
 *
 * Logika diproses oleh ppdbController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const ppdbController = require("../controllers/ppdbController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

/**
 * GET /
 * Method      : GET
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : ppdbController.getAllPPDB
 * Fungsi      : Mengambil seluruh data pendaftaran PPDB untuk admin.
 */
router.get("/", verifyToken, onlyAdmin, ppdbController.getAllPPDB);

/**
 * GET /rekap
 * Otorisasi : verifyToken + onlyAdmin
 * Fungsi    : Rekapitulasi PPDB (total, per status, daftar ulang, per jenjang).
 */
router.get("/rekap", verifyToken, onlyAdmin, ppdbController.getRekap);

/**
 * PUT /:id/daftar-ulang
 * Otorisasi : verifyToken + onlyAdmin
 * Fungsi    : Memperbarui status daftar ulang pendaftar PPDB.
 */
router.put("/:id/daftar-ulang", verifyToken, onlyAdmin, ppdbController.setDaftarUlang);

/**
 * POST /status
 * Method      : POST
 * Otorisasi   : Publik (tanpa token)
 * Controller  : ppdbController.checkStatus
 * Fungsi      : Mengecek status pendaftaran PPDB berdasarkan data yang dikirim.
 */
router.post("/status", ppdbController.checkStatus);

/**
 * POST /resubmit
 * Method      : POST
 * Otorisasi   : Publik (tanpa token)
 * Controller  : ppdbController.resubmitBerkas
 * Fungsi      : Mengunggah ulang berkas pendaftaran saat status "revisi_berkas".
 */
router.post("/resubmit", ppdbController.resubmitBerkas);

/**
 * POST /
 * Method      : POST
 * Otorisasi   : Publik (tanpa token)
 * Controller  : ppdbController.createPPDB
 * Fungsi      : Membuat pendaftaran PPDB baru dari calon peserta didik.
 */
router.post("/", ppdbController.createPPDB);

/**
 * PUT /:id
 * Method      : PUT
 * Parameter   : :id -> ID pendaftaran PPDB yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : ppdbController.updatePPDB
 * Fungsi      : Memperbarui data/status pendaftaran PPDB tertentu.
 */
router.put("/:id", verifyToken, onlyAdmin, ppdbController.updatePPDB);

/**
 * DELETE /:id
 * Method      : DELETE
 * Parameter   : :id -> ID pendaftaran PPDB yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : ppdbController.deletePPDB
 * Fungsi      : Menghapus data pendaftaran PPDB tertentu.
 */
router.delete("/:id", verifyToken, onlyAdmin, ppdbController.deletePPDB);

module.exports = router;
