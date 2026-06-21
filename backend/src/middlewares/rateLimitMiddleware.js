function getClientIp(req) {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  if (forwardedFor) return String(forwardedFor).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

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
