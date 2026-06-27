/**
 * ============================================================================
 * Kelompok Route: Galeri (galeriRoutes)
 * ----------------------------------------------------------------------------
 * Kumpulan endpoint untuk mengelola data galeri foto sekolah.
 *   - Menampilkan galeri bersifat publik (bisa diakses tanpa login).
 *   - Membuat, memperbarui, dan menghapus galeri hanya untuk administrator.
 *
 * Catatan upload:
 *   - Endpoint create & update menggunakan imageUpload("galeri").single("image")
 *     untuk menerima 1 berkas gambar pada field "image", lalu handleUploadError
 *     untuk menangani error unggah (mis. ukuran/tipe berkas tidak valid).
 *
 * Logika diproses oleh galeriController.
 * ============================================================================
 */
const express = require("express");
const router = express.Router();

const galeriController = require("../controllers/galeriController");
const { verifyToken, onlyAdmin } = require("../middlewares/authMiddleware");
const { handleUploadError, imageUpload } = require("../middlewares/uploadMiddleware");

/**
 * GET /
 * Method      : GET
 * Otorisasi   : Publik (tanpa token)
 * Controller  : galeriController.getAllGaleri
 * Fungsi      : Mengambil seluruh data galeri untuk ditampilkan ke pengunjung.
 */
router.get("/", galeriController.getAllGaleri);

/**
 * POST /
 * Method      : POST
 * Otorisasi   : verifyToken + onlyAdmin
 * Middleware  : imageUpload("galeri").single("image") -> unggah 1 gambar (field "image")
 *               handleUploadError -> menangani error unggah berkas
 * Controller  : galeriController.createGaleri
 * Fungsi      : Menambahkan item galeri baru beserta gambarnya.
 */
router.post("/", verifyToken, onlyAdmin, imageUpload("galeri").single("image"), handleUploadError, galeriController.createGaleri);

/**
 * PUT /:id
 * Method      : PUT
 * Parameter   : :id -> ID item galeri yang akan diperbarui.
 * Otorisasi   : verifyToken + onlyAdmin
 * Middleware  : imageUpload("galeri").single("image") -> unggah 1 gambar (opsional)
 *               handleUploadError -> menangani error unggah berkas
 * Controller  : galeriController.updateGaleri
 * Fungsi      : Memperbarui item galeri tertentu (termasuk penggantian gambar).
 */
router.put("/:id", verifyToken, onlyAdmin, imageUpload("galeri").single("image"), handleUploadError, galeriController.updateGaleri);

/**
 * DELETE /:id
 * Method      : DELETE
 * Parameter   : :id -> ID item galeri yang akan dihapus.
 * Otorisasi   : verifyToken + onlyAdmin
 * Controller  : galeriController.deleteGaleri
 * Fungsi      : Menghapus item galeri tertentu.
 */
router.delete("/:id", verifyToken, onlyAdmin, galeriController.deleteGaleri);

module.exports = router;
