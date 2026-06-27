/**
 * ============================================================================
 * Utilitas Penyimpanan Unggahan (uploadStorage)
 * ----------------------------------------------------------------------------
 * Berisi konstanta dan fungsi pembantu untuk mengelola berkas unggahan gambar:
 *   - Konfigurasi folder tujuan, tipe MIME, ekstensi, dan ukuran maksimal.
 *   - Pembuatan folder, sanitasi nama berkas, konversi path, dan penghapusan
 *     berkas lokal secara aman.
 * ============================================================================
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

/** @type {string} Path absolut folder root tempat seluruh unggahan disimpan. */
const uploadRoot = path.resolve(__dirname, "../../uploads");
/** @type {Set<string>} Daftar tipe MIME gambar yang diizinkan. */
const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
/** @type {Set<string>} Daftar ekstensi berkas gambar yang diizinkan. */
const allowedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
/** @type {number} Ukuran maksimal berkas gambar dalam byte (4 MB). */
const maxImageSize = 4 * 1024 * 1024;

/**
 * uploadFolders
 * Pemetaan kunci kategori unggahan ke path absolut folder tujuannya.
 * @type {Object<string, string>}
 */
const uploadFolders = {
  kegiatan: path.join(uploadRoot, "kegiatan"),
  siswa: path.join(uploadRoot, "siswa"),
  galeri: path.join(uploadRoot, "galeri"),
  fasilitas: path.join(uploadRoot, "fasilitas"),
  kepala_sekolah: path.join(uploadRoot, "kepala-sekolah")
};

/**
 * ensureUploadFolders
 * Memastikan folder root unggahan beserta seluruh subfolder pada uploadFolders
 * tersedia, dengan membuatnya secara rekursif bila belum ada.
 *
 * @returns {void} Efek samping: membuat direktori di filesystem bila belum ada.
 */
function ensureUploadFolders() {
  fs.mkdirSync(uploadRoot, { recursive: true });
  Object.values(uploadFolders).forEach((folder) => fs.mkdirSync(folder, { recursive: true }));
}

/**
 * sanitizeFilename
 * Membentuk nama berkas yang aman dan unik dari nama asli. Mengubah ke huruf
 * kecil, mengganti karakter non-alfanumerik dengan strip, memangkas strip di
 * tepi, membatasi panjang basis maksimal 80 karakter, lalu menambahkan prefiks
 * timestamp dan byte acak agar unik.
 *
 * @param {string} filename Nama berkas asli (mis. "Foto Saya.JPG").
 * @returns {string} Nama berkas baru yang aman dan unik, mis.
 *          "1700000000000-a1b2c3d4-foto-saya.jpg".
 */
function sanitizeFilename(filename) {
  const extension = path.extname(filename || "").toLowerCase();
  const base = path.basename(filename || "gambar", extension)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "gambar";

  return `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${base}${extension}`;
}

/**
 * toRelativeUploadPath
 * Mengonversi objek berkas (hasil Multer) menjadi path publik relatif yang
 * dapat diakses klien, dalam format "/uploads/<folder>/<namaBerkas>".
 *
 * @param {{destinationKey: string, filename: string}|null|undefined} file
 *        Objek berkas yang memiliki destinationKey dan filename.
 * @returns {string|null} Path publik relatif berkas, atau null bila file kosong.
 */
function toRelativeUploadPath(file) {
  if (!file) return null;
  const publicFolder = path.basename(uploadFolders[file.destinationKey] || file.destinationKey);
  return `/uploads/${publicFolder}/${file.filename}`;
}

/**
 * isLocalUploadPath
 * Memeriksa apakah sebuah nilai merupakan path unggahan lokal yang valid, yaitu
 * berupa string yang diawali "/uploads/" dan tidak mengandung ".." (untuk
 * mencegah path traversal).
 *
 * @param {*} value Nilai yang akan diperiksa.
 * @returns {boolean} true bila merupakan path unggahan lokal yang aman, selain
 *          itu false.
 */
function isLocalUploadPath(value) {
  return typeof value === "string" && value.startsWith("/uploads/") && !value.includes("..");
}

/**
 * deleteLocalUpload
 * Menghapus berkas unggahan lokal secara aman berdasarkan path publiknya.
 * Melakukan beberapa lapis pengaman: memastikan path valid (isLocalUploadPath)
 * dan memastikan path absolut yang dihasilkan berada di dalam uploadRoot untuk
 * mencegah penghapusan berkas di luar folder unggahan.
 *
 * @param {string} value Path publik unggahan (mis. "/uploads/galeri/foto.jpg").
 * @returns {void} Tidak mengembalikan nilai. Efek samping: menghapus berkas dari
 *          filesystem bila path valid, aman, dan berkas memang ada. Tidak
 *          melakukan apa pun bila path tidak valid/di luar uploadRoot/tidak ada.
 */
function deleteLocalUpload(value) {
  if (!isLocalUploadPath(value)) return;

  const absolutePath = path.resolve(uploadRoot, value.replace(/^\/uploads\//, ""));
  const insideUploadRoot = absolutePath === uploadRoot || absolutePath.startsWith(`${uploadRoot}${path.sep}`);
  if (!insideUploadRoot) return;
  if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath);
}

ensureUploadFolders();

module.exports = {
  allowedImageExtensions,
  allowedImageMimeTypes,
  deleteLocalUpload,
  ensureUploadFolders,
  isLocalUploadPath,
  maxImageSize,
  sanitizeFilename,
  toRelativeUploadPath,
  uploadFolders,
  uploadRoot
};
