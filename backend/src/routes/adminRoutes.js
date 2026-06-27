/**
 * ============================================================================
 * Kelompok Route: Administrator (adminRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint khusus ADMINISTRATOR untuk:
 *   1. Melihat ringkasan dashboard admin.
 *   2. Mengelola akun pengguna (CRUD user + reset password).
 *   3. Menangani permintaan reset kata sandi dari pengguna (proses/tolak).
 *
 * Seluruh endpoint diproteksi oleh middleware:
 *   - verifyToken : memastikan JWT valid (sudah login).
 *   - onlyAdmin   : memastikan role pengguna adalah "admin".
 *
 * Logika diproses oleh adminController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");

/**
 * GET /dashboard
 * Method      : GET
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : adminController.dashboard
 * Fungsi      : Menampilkan data ringkasan/statistik untuk dashboard admin.
 */
router.get("/dashboard", verifyToken, onlyAdmin, adminController.dashboard);

/**
 * GET /users
 * Method      : GET
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : adminController.getUsers
 * Fungsi      : Mengambil daftar seluruh akun pengguna.
 */
router.get("/users", verifyToken, onlyAdmin, adminController.getUsers);

/**
 * POST /users
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : adminController.createUser
 * Fungsi      : Membuat akun pengguna baru.
 */
router.post("/users", verifyToken, onlyAdmin, adminController.createUser);

/**
 * PUT /users/:id
 * Method      : PUT
 * Parameter   : :id -> ID akun pengguna yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : adminController.updateUser
 * Fungsi      : Memperbarui data akun pengguna tertentu.
 */
router.put("/users/:id", verifyToken, onlyAdmin, adminController.updateUser);

/**
 * DELETE /users/:id
 * Method      : DELETE
 * Parameter   : :id -> ID akun pengguna yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : adminController.deleteUser
 * Fungsi      : Menghapus akun pengguna tertentu.
 */
router.delete("/users/:id", verifyToken, onlyAdmin, adminController.deleteUser);

/**
 * PUT /users/:id/reset-password
 * Method      : PUT
 * Parameter   : :id -> ID akun pengguna yang kata sandinya akan diatur ulang.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : adminController.resetUserPassword
 * Fungsi      : Mengatur ulang (reset) kata sandi akun pengguna tertentu oleh admin.
 */
router.put("/users/:id/reset-password", verifyToken, onlyAdmin, adminController.resetUserPassword);

/**
 * GET /password-reset-requests
 * Method      : GET
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : adminController.getPasswordResetRequests
 * Fungsi      : Mengambil daftar permintaan reset kata sandi yang diajukan pengguna.
 */
router.get("/password-reset-requests", verifyToken, onlyAdmin, adminController.getPasswordResetRequests);

/**
 * PUT /password-reset-requests/:id/reset
 * Method      : PUT
 * Parameter   : :id -> ID permintaan reset kata sandi yang akan diproses.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : adminController.processPasswordResetRequest
 * Fungsi      : Memproses (menyetujui) permintaan reset kata sandi dan
 *               mengatur ulang kata sandi pengguna terkait.
 */
router.put("/password-reset-requests/:id/reset", verifyToken, onlyAdmin, adminController.processPasswordResetRequest);

/**
 * PUT /password-reset-requests/:id/reject
 * Method      : PUT
 * Parameter   : :id -> ID permintaan reset kata sandi yang akan ditolak.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : adminController.rejectPasswordResetRequest
 * Fungsi      : Menolak permintaan reset kata sandi tertentu.
 */
router.put("/password-reset-requests/:id/reject", verifyToken, onlyAdmin, adminController.rejectPasswordResetRequest);

module.exports = router;
