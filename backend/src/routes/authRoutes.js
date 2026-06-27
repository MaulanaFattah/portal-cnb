/**
 * ============================================================================
 * Kelompok Route: Autentikasi (authRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk proses autentikasi dan pengelolaan kredensial:
 *   1. Login pengguna.
 *   2. Registrasi akun guru dan kepala sekolah.
 *   3. Permintaan lupa kata sandi (dengan pembatasan laju/rate limit).
 *   4. Penggantian kata sandi oleh pengguna yang sudah login.
 *
 * Catatan otorisasi:
 *   - Endpoint login & registrasi bersifat publik (tidak butuh token).
 *   - Endpoint forgot-password dilindungi rate limiter agar tidak disalahgunakan.
 *   - Endpoint change-password membutuhkan verifyToken (harus sudah login).
 *
 * Logika diproses oleh authController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
const { forgotPasswordLimiter } = require("../middlewares/rateLimitMiddleware");

/**
 * POST /login
 * Method      : POST
 * Otorisasi   : Publik (tanpa token)
 * Controller  : authController.login
 * Fungsi      : Memvalidasi kredensial pengguna dan menerbitkan token JWT
 *               bila login berhasil.
 */
router.post("/login", authController.login);

/**
 * POST /register-guru
 * Method      : POST
 * Otorisasi   : Publik (tanpa token)
 * Controller  : authController.registerGuru
 * Fungsi      : Mendaftarkan akun guru baru (menunggu verifikasi admin).
 */
router.post("/register-guru", authController.registerGuru);

/**
 * POST /register-kepala-sekolah
 * Method      : POST
 * Otorisasi   : Publik (tanpa token)
 * Controller  : authController.registerKepalaSekolah
 * Fungsi      : Mendaftarkan akun kepala sekolah baru.
 */
router.post("/register-kepala-sekolah", authController.registerKepalaSekolah);

/**
 * POST /forgot-password
 * Method      : POST
 * Otorisasi   : Publik, namun dibatasi oleh forgotPasswordLimiter (rate limit)
 *               untuk mencegah penyalahgunaan/percobaan berlebihan.
 * Controller  : authController.requestPasswordReset
 * Fungsi      : Membuat permintaan reset kata sandi untuk diproses admin.
 */
router.post("/forgot-password", forgotPasswordLimiter, authController.requestPasswordReset);

/**
 * PUT /change-password
 * Method      : PUT
 * Otorisasi   : verifyToken (pengguna harus sudah login)
 * Controller  : authController.changePassword
 * Fungsi      : Mengganti kata sandi milik pengguna yang sedang login.
 */
router.put("/change-password", verifyToken, authController.changePassword);

module.exports = router;
