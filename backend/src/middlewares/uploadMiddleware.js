/**
 * ============================================================================
 * Middleware Unggah Berkas Gambar (uploadMiddleware)
 * ----------------------------------------------------------------------------
 * Menyediakan konfigurasi Multer untuk mengunggah gambar ke folder lokal
 * tertentu (kegiatan, siswa, galeri, dll) beserta penanganan error unggah.
 * Aturan tipe/ukuran berkas diambil dari utils/uploadStorage.
 * ============================================================================
 */
const path = require("path");
const multer = require("multer");
const {
  allowedImageExtensions,
  allowedImageMimeTypes,
  maxImageSize,
  sanitizeFilename,
  uploadFolders
} = require("../utils/uploadStorage");

/**
 * imageUpload
 * Membuat instance Multer yang dikonfigurasi untuk menyimpan gambar ke folder
 * tujuan sesuai destinationKey. Konfigurasi mencakup:
 *   - Penyimpanan ke disk pada folder yang dipetakan oleh uploadFolders.
 *   - Penamaan berkas yang aman lewat sanitizeFilename.
 *   - Batas ukuran berkas (maxImageSize).
 *   - Filter agar hanya menerima gambar JPG/PNG/WebP yang valid.
 *
 * @param {string} destinationKey Kunci folder tujuan (mis. "kegiatan", "siswa",
 *        "galeri"), harus tersedia di uploadFolders.
 * @returns {import("multer").Multer} Instance Multer yang siap dipakai sebagai
 *          middleware (mis. .single("image")).
 * @throws {Error} "Folder unggah tidak valid" bila destinationKey tidak dikenal.
 */
function imageUpload(destinationKey) {
  const destination = uploadFolders[destinationKey];
  if (!destination) throw new Error("Folder unggah tidak valid");

  const storage = multer.diskStorage({
    destination(_req, file, cb) {
      file.destinationKey = destinationKey;
      cb(null, destination);
    },
    filename(_req, file, cb) {
      cb(null, sanitizeFilename(file.originalname));
    }
  });

  return multer({
    storage,
    limits: { fileSize: maxImageSize },
    fileFilter(_req, file, cb) {
      const extension = path.extname(file.originalname || "").toLowerCase();
      if (!allowedImageMimeTypes.has(file.mimetype) || !allowedImageExtensions.has(extension)) {
        return cb(new Error("Berkas harus berupa gambar JPG, PNG, atau WebP maksimal 4 MB"));
      }

      return cb(null, true);
    }
  });
}

/**
 * handleUploadError
 * Middleware penanganan error untuk proses unggah berkas. Dipasang setelah
 * middleware Multer agar error unggah dikonversi menjadi respons JSON yang
 * ramah pengguna alih-alih error mentah.
 *
 * @param {Error|null} error Error yang dilempar oleh Multer/filter; bila null
 *        maka tidak ada error dan langsung diteruskan.
 * @param {import("express").Request} _req Request Express (tidak digunakan).
 * @param {import("express").Response} res Response Express untuk mengirim error.
 * @param {import("express").NextFunction} next Lanjut ke handler berikutnya bila tidak ada error.
 * @returns {void} Efek samping: memanggil next() bila tidak ada error, mengirim
 *          respons 400 dengan pesan ukuran maksimal bila error LIMIT_FILE_SIZE,
 *          atau respons 400 dengan pesan error lainnya.
 */
function handleUploadError(error, _req, res, next) {
  if (!error) return next();

  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "Ukuran gambar maksimal 4 MB" });
  }

  return res.status(400).json({ success: false, message: error.message || "Unggah berkas tidak valid" });
}

module.exports = { handleUploadError, imageUpload };
