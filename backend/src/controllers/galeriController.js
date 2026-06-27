const db = require("../models");
const { deleteLocalUpload, toRelativeUploadPath } = require("../utils/uploadStorage");
const { logAudit } = require("../services/auditLogService");

const Galeri = db.Galeri;

/**
 * Menentukan nilai field gambar yang akan disimpan: bila ada file upload baru maka memakai
 * path relatifnya; bila klien mengirim field image (boleh kosong) maka memakai nilai itu atau
 * fallback ke gambar saat ini; selain itu mempertahankan gambar saat ini.
 *
 * @param {import('express').Request} req - Memakai req.file (hasil upload) dan req.body.image.
 * @param {string|null} [currentImage=null] - Path gambar yang sudah ada (untuk update).
 * @returns {string|null} Path gambar yang akan dipakai. Tanpa efek samping ke database.
 */
function getImageValue(req, currentImage = null) {
  if (req.file) return toRelativeUploadPath(req.file);
  if (req.body.image !== undefined) return req.body.image || currentImage;
  return currentImage;
}

/**
 * Membentuk judul foto galeri: memakai judul yang diberikan bila ada, atau membuat judul
 * default berisi tanggal lokal Indonesia bila kosong.
 *
 * @param {*} value - Judul yang dimasukkan pengguna.
 * @returns {string} Judul foto final. Tanpa efek samping.
 */
function buildPhotoTitle(value) {
  const title = String(value || "").trim();
  return title || `Foto Galeri ${new Date().toLocaleDateString("id-ID")}`;
}

/**
 * Controller Express: mengambil seluruh data galeri, diurutkan dari yang terbaru.
 *
 * @param {import('express').Request} req - Tidak memakai parameter khusus.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi daftar galeri, atau 500 bila gagal.
 *   Efek samping: query baca ke tabel Galeri.
 */
exports.getAllGaleri = async (req, res) => {
  try {
    const galeri = await Galeri.findAll({
      order: [["createdAt", "DESC"]]
    });

    res.json({
      success: true,
      message: "Data galeri berhasil diambil",
      data: galeri
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data galeri",
      error: error.message
    });
  }
};

/**
 * Controller Express: menambah foto galeri baru. Wajib menyertakan file foto. Membuat
 * record galeri dan mencatat aksi ke audit log. Bila terjadi error, file yang sudah diupload
 * akan dihapus agar tidak menjadi sampah.
 *
 * @param {import('express').Request} req - req.body memuat title, description, category;
 *   req.file berisi file foto hasil upload (wajib).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 201 berisi data galeri baru bila sukses; 400 bila foto
 *   tidak diupload; 500 untuk error server (file upload dihapus). Efek samping: membuat record
 *   Galeri, menulis audit log, dan/atau menghapus file lokal saat gagal.
 */
exports.createGaleri = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const image = getImageValue(req);

    if (!req.file || !image) {
      return res.status(400).json({
        success: false,
        message: "Foto galeri wajib diupload"
      });
    }

    const galeri = await Galeri.create({ title: buildPhotoTitle(title), image, description: description || null, category: category || "foto" });
    await logAudit(req, {
      action: "gallery.create",
      entityType: "gallery",
      entityId: galeri.id,
      metadata: { title, uploaded: Boolean(req.file) }
    });

    res.status(201).json({
      success: true,
      message: "Galeri berhasil ditambahkan",
      data: galeri
    });
  } catch (error) {
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan galeri",
      error: error.message
    });
  }
};

/**
 * Controller Express: memperbarui data galeri berdasarkan id. Field yang tidak dikirim akan
 * mempertahankan nilai lama. Bila ada foto baru, foto lama dihapus dari penyimpanan. Aksi
 * dicatat ke audit log. Bila galeri tidak ditemukan atau terjadi error, file baru dibersihkan.
 *
 * @param {import('express').Request} req - req.params.id ID galeri; req.body memuat title,
 *   description, category (opsional); req.file foto baru (opsional).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi data terbaru bila sukses; 404 bila galeri tak
 *   ada (file baru dihapus); 500 untuk error server (file baru dihapus). Efek samping: update
 *   record Galeri, menghapus file lama bila diganti, dan menulis audit log.
 */
exports.updateGaleri = async (req, res) => {
  try {
    const { id } = req.params;
    const galeri = await Galeri.findByPk(id);

    if (!galeri) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(404).json({
        success: false,
        message: "Galeri tidak ditemukan"
      });
    }

    const oldImage = galeri.image;
    const nextImage = getImageValue(req, oldImage);
    await galeri.update({
      title: req.body.title ?? galeri.title,
      description: req.body.description ?? galeri.description,
      category: req.body.category ?? galeri.category,
      image: nextImage
    });

    if (req.file && oldImage && oldImage !== nextImage) deleteLocalUpload(oldImage);
    await logAudit(req, {
      action: "gallery.update",
      entityType: "gallery",
      entityId: galeri.id,
      metadata: { title: galeri.title, uploaded: Boolean(req.file) }
    });

    res.json({
      success: true,
      message: "Galeri berhasil diperbarui",
      data: galeri
    });
  } catch (error) {
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui galeri",
      error: error.message
    });
  }
};

/**
 * Controller Express: menghapus data galeri berdasarkan id beserta file fotonya dari
 * penyimpanan. Aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.params.id ID galeri yang dihapus.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 bila sukses; 404 bila galeri tak ada; 500 untuk error
 *   server. Efek samping: menghapus record Galeri, menghapus file lokal, dan menulis audit log.
 */
exports.deleteGaleri = async (req, res) => {
  try {
    const { id } = req.params;
    const galeri = await Galeri.findByPk(id);

    if (!galeri) {
      return res.status(404).json({
        success: false,
        message: "Galeri tidak ditemukan"
      });
    }

    const oldImage = galeri.image;
    await galeri.destroy();
    deleteLocalUpload(oldImage);
    await logAudit(req, { action: "gallery.delete", entityType: "gallery", entityId: id });

    res.json({
      success: true,
      message: "Galeri berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus galeri",
      error: error.message
    });
  }
};
