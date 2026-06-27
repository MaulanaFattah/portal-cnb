/**
 * ============================================================================
 * Middleware Pembatasan Laju Permintaan (rateLimitMiddleware)
 * ----------------------------------------------------------------------------
 * Menyediakan rate limiter sederhana berbasis penyimpanan di memori untuk
 * membatasi jumlah permintaan dalam rentang waktu tertentu, guna mencegah
 * penyalahgunaan (mis. percobaan brute force pada lupa kata sandi).
 * ============================================================================
 */

/**
 * getClientIp
 * Mengambil alamat IP klien dari request. Mengutamakan header
 * "x-forwarded-for" (mengambil IP pertama bila ada beberapa, mis. di belakang
 * proxy), lalu fallback ke req.ip atau alamat socket.
 *
 * @param {import("express").Request} req Objek request Express.
 * @returns {string} Alamat IP klien, atau "unknown" bila tidak dapat ditentukan.
 */
function getClientIp(req) {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  if (forwardedFor) return String(forwardedFor).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

/**
 * createInMemoryRateLimiter
 * Membuat middleware rate limiter yang menyimpan jumlah percobaan per kunci
 * (key) di dalam Map pada memori proses. Setiap kunci memiliki jendela waktu
 * (windowMs) dan batas maksimal (max) permintaan. Setelah jendela kedaluwarsa,
 * hitungan direset.
 *
 * Catatan: state disimpan di memori sehingga tidak terbagi antar instance/proses.
 *
 * @param {Object} options Konfigurasi rate limiter.
 * @param {number} options.windowMs Durasi jendela waktu dalam milidetik.
 * @param {number} options.max Jumlah maksimum permintaan yang diizinkan per jendela.
 * @param {(req: import("express").Request) => string} [options.keyGenerator]
 *        Fungsi opsional untuk menentukan kunci pembatasan; default memakai IP klien.
 * @param {string} [options.message] Pesan opsional yang dikirim saat batas terlampaui.
 * @returns {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void}
 *          Middleware Express. Efek samping: memanggil next() bila masih di
 *          bawah batas, atau mengirim respons 429 (Too Many Requests) bila
 *          batas terlampaui.
 */
function createInMemoryRateLimiter({ windowMs, max, keyGenerator, message }) {
  const attempts = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = keyGenerator ? keyGenerator(req) : getClientIp(req);
    const record = attempts.get(key);

    if (!record || record.expiresAt <= now) {
      attempts.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      return res.status(429).json({
        success: false,
        message: message || "Terlalu banyak percobaan. Coba lagi nanti."
      });
    }

    record.count += 1;
    attempts.set(key, record);
    return next();
  };
}

/**
 * forgotPasswordLimiter
 * Instance rate limiter khusus untuk endpoint "lupa kata sandi". Membatasi
 * maksimal 3 permintaan per jam untuk setiap kombinasi IP klien + role +
 * identifier (email/nisn/no_telepon/phone), sehingga pembatasan lebih spesifik
 * per pengguna dan tidak mudah disalahgunakan.
 *
 * @type {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void}
 */
const forgotPasswordLimiter = createInMemoryRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const role = String(req.body?.role || req.body?.peran || "").trim().toLowerCase();
    const identifier = String(req.body?.email || req.body?.nisn || req.body?.no_telepon || req.body?.phone || "")
      .trim()
      .toLowerCase();
    return [getClientIp(req), role, identifier].join(":");
  },
  message: "Permintaan lupa kata sandi terlalu banyak. Coba lagi dalam beberapa saat."
});

module.exports = { createInMemoryRateLimiter, forgotPasswordLimiter, getClientIp };
