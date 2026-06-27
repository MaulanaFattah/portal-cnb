/**
 * ============================================================================
 * Middleware Autentikasi & Otorisasi (authMiddleware)
 * ----------------------------------------------------------------------------
 * Berisi middleware Express untuk:
 *   - Memverifikasi token JWT dan memuat data pengguna ke req.user.
 *   - Membatasi akses endpoint berdasarkan role (admin, guru, siswa, dll).
 * ============================================================================
 */
const jwt = require("jsonwebtoken");
const db = require("../models");

const User = db.User;

/**
 * Middleware verifyToken
 * Memverifikasi token JWT pada header Authorization (format "Bearer <token>").
 * Bila valid, data pengguna dimuat dari database dan disimpan ke req.user agar
 * dapat dipakai oleh middleware/handler berikutnya.
 *
 * @param {import("express").Request} req  Objek request Express; header
 *        Authorization diharapkan berisi token JWT.
 * @param {import("express").Response} res Objek response Express; dipakai untuk
 *        mengirim status 401 bila token tidak ada/tidak valid.
 * @param {import("express").NextFunction} next Callback untuk melanjutkan ke
 *        middleware berikutnya bila autentikasi berhasil.
 * @returns {Promise<void>} Tidak mengembalikan nilai. Efek samping: mengeset
 *          req.user lalu memanggil next(), atau mengirim respons 401 (token
 *          tidak ditemukan / pengguna tidak valid / token tidak valid).
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Token tidak ditemukan" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "Pengguna tidak valid" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token tidak valid" });
  }
};

/**
 * Middleware onlyAdmin
 * Membatasi akses hanya untuk pengguna dengan role "admin". Harus dipakai
 * setelah verifyToken karena bergantung pada req.user.
 *
 * @param {import("express").Request} req  Request Express; membutuhkan req.user.role.
 * @param {import("express").Response} res Response Express; mengirim 403 bila bukan admin.
 * @param {import("express").NextFunction} next Lanjut ke handler berikutnya bila role sesuai.
 * @returns {void} Efek samping: memanggil next() bila admin, atau mengirim
 *          respons 403 (Forbidden) bila bukan admin.
 */
exports.onlyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Akses hanya untuk administrator" });
  }

  next();
};

/**
 * Middleware onlyGuru
 * Membatasi akses hanya untuk pengguna dengan role "guru". Harus dipakai
 * setelah verifyToken karena bergantung pada req.user.
 *
 * @param {import("express").Request} req  Request Express; membutuhkan req.user.role.
 * @param {import("express").Response} res Response Express; mengirim 403 bila bukan guru.
 * @param {import("express").NextFunction} next Lanjut ke handler berikutnya bila role sesuai.
 * @returns {void} Efek samping: memanggil next() bila guru, atau mengirim
 *          respons 403 (Forbidden) bila bukan guru.
 */
exports.onlyGuru = (req, res, next) => {
  if (req.user.role !== "guru") {
    return res.status(403).json({ success: false, message: "Akses hanya untuk guru" });
  }

  next();
};


/**
 * Middleware onlySiswa
 * Membatasi akses hanya untuk pengguna dengan role "siswa". Harus dipakai
 * setelah verifyToken karena bergantung pada req.user.
 *
 * @param {import("express").Request} req  Request Express; membutuhkan req.user.role.
 * @param {import("express").Response} res Response Express; mengirim 403 bila bukan siswa.
 * @param {import("express").NextFunction} next Lanjut ke handler berikutnya bila role sesuai.
 * @returns {void} Efek samping: memanggil next() bila siswa, atau mengirim
 *          respons 403 (Forbidden) bila bukan siswa.
 */
exports.onlySiswa = (req, res, next) => {
  if (req.user.role !== "siswa") {
    return res.status(403).json({ success: false, message: "Akses hanya untuk siswa" });
  }

  next();
};

/**
 * Middleware onlyOrangTua
 * Membatasi akses hanya untuk pengguna dengan role "orangtua". Harus dipakai
 * setelah verifyToken karena bergantung pada req.user.
 *
 * @param {import("express").Request} req  Request Express; membutuhkan req.user.role.
 * @param {import("express").Response} res Response Express; mengirim 403 bila bukan orang tua.
 * @param {import("express").NextFunction} next Lanjut ke handler berikutnya bila role sesuai.
 * @returns {void} Efek samping: memanggil next() bila orang tua, atau mengirim
 *          respons 403 (Forbidden) bila bukan orang tua.
 */
exports.onlyOrangTua = (req, res, next) => {
  if (req.user.role !== "orangtua") {
    return res.status(403).json({ success: false, message: "Akses hanya untuk orang tua" });
  }

  next();
};

/**
 * Middleware onlyKepalaSekolahOrAdmin
 * Membatasi akses untuk pengguna dengan role "kepala_sekolah" ATAU "admin".
 * Harus dipakai setelah verifyToken karena bergantung pada req.user.
 *
 * @param {import("express").Request} req  Request Express; membutuhkan req.user.role.
 * @param {import("express").Response} res Response Express; mengirim 403 bila role tidak diizinkan.
 * @param {import("express").NextFunction} next Lanjut ke handler berikutnya bila role sesuai.
 * @returns {void} Efek samping: memanggil next() bila kepala sekolah/admin,
 *          atau mengirim respons 403 (Forbidden) bila role lain.
 */
exports.onlyKepalaSekolahOrAdmin = (req, res, next) => {
  if (!["kepala_sekolah", "admin"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Akses hanya untuk kepala sekolah atau administrator" });
  }

  next();
};
