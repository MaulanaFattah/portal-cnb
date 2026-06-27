const db = require("../models");
const { deleteLocalUpload, toRelativeUploadPath } = require("../utils/uploadStorage");
const { logAudit } = require("../services/auditLogService");

const Kegiatan = db.Kegiatan;
const VALID_STATUS = ["tampil", "tidak_tampil"];

/**
 * Menentukan nilai (path) gambar yang akan disimpan untuk sebuah kegiatan.
 * Logika bisnisnya: jika ada file yang diunggah lewat multipart, gunakan path file tersebut;
 * jika tidak ada file tetapi body mengirim field "image", gunakan nilai itu (atau fallback ke gambar lama bila kosong);
 * jika keduanya tidak ada, pertahankan gambar lama. Dipakai bersama oleh createKegiatan dan updateKegiatan.
 *
 * @param {import('express').Request} req - Objek request Express. Memakai req.file (hasil upload) dan req.body.image.
 * @param {string|null} [currentImage=null] - Path gambar yang sedang tersimpan, dipakai sebagai fallback saat update.
 * @returns {string|null} Path gambar relatif yang akan disimpan ke database (bisa null bila tidak ada gambar).
 */
function getImageValue(req, currentImage = null) {
  if (req.file) return toRelativeUploadPath(req.file);
  if (req.body.image !== undefined) return req.body.image || currentImage;
  return currentImage;
}

/**
 * Mengambil seluruh data kegiatan sekolah untuk ditampilkan (mis. di halaman publik atau dashboard admin).
 * Secara default hanya menampilkan kegiatan berstatus "tampil"; bila admin meminta data lengkap,
 * semua kegiatan termasuk yang disembunyikan ikut dikembalikan. Hasil diurutkan dari tanggal terbaru.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.query.includeHidden ("true" untuk menampilkan kegiatan tersembunyi juga).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim respons HTTP 200 berisi daftar kegiatan, atau 500 bila terjadi kesalahan.
 */
exports.getAllKegiatan = async (req, res) => {
  try {
    const where = req.query.includeHidden === "true" ? {} : { status: "tampil" };
    const kegiatan = await Kegiatan.findAll({ where, order: [["date", "DESC"]] });

    res.json({
      success: true,
      message: "Data kegiatan berhasil diambil",
      data: kegiatan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data kegiatan",
      error: error.message
    });
  }
};

/**
 * Membuat data kegiatan baru beserta gambarnya (jika ada upload) dan mencatat audit log pembuatan.
 * Memvalidasi field wajib serta status kegiatan sebelum menyimpan ke database.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.body.title, req.body.date, req.body.description,
 *   req.body.status (default "tampil"), dan req.file/req.body.image untuk gambar.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: membuat record Kegiatan baru dan menulis audit log "activity.create".
 *   Mengirim HTTP 201 dengan data kegiatan; 400 bila validasi gagal; 500 bila error (file upload dihapus saat gagal).
 */
exports.createKegiatan = async (req, res) => {
  try {
    const { title, date, description, status = "tampil" } = req.body;
    const image = getImageValue(req);

    if (!title || !date || !description) {
      return res.status(400).json({
        success: false,
        message: "Judul, tanggal, dan deskripsi wajib diisi"
      });
    }

    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: "Status kegiatan tidak valid" });
    }

    const kegiatan = await Kegiatan.create({ title, date, description, image, status });
    await logAudit(req, {
      action: "activity.create",
      entityType: "activity",
      entityId: kegiatan.id,
      metadata: { title, uploaded: Boolean(req.file) }
    });

    res.status(201).json({
      success: true,
      message: "Kegiatan berhasil ditambahkan",
      data: kegiatan
    });
  } catch (error) {
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan kegiatan",
      error: error.message
    });
  }
};

/**
 * Memperbarui data kegiatan yang sudah ada berdasarkan id. Field yang tidak dikirim akan mempertahankan nilai lama.
 * Bila ada gambar baru diunggah, gambar lama dihapus dari penyimpanan. Mencatat audit log perubahan.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id kegiatan),
 *   serta req.body.title/date/description/status dan req.file/req.body.image yang bersifat opsional.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui record Kegiatan, menghapus file gambar lama bila diganti,
 *   dan menulis audit log "activity.update". Mengirim HTTP 200 dengan data terbaru; 404 bila tidak ditemukan;
 *   400 bila status tidak valid; 500 bila error (file upload dihapus saat gagal).
 */
exports.updateKegiatan = async (req, res) => {
  try {
    const { id } = req.params;

    const kegiatan = await Kegiatan.findByPk(id);

    if (!kegiatan) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(404).json({
        success: false,
        message: "Kegiatan tidak ditemukan"
      });
    }

    if (req.body.status && !VALID_STATUS.includes(req.body.status)) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Status kegiatan tidak valid" });
    }

    const oldImage = kegiatan.image;
    const nextImage = getImageValue(req, oldImage);
    await kegiatan.update({
      title: req.body.title ?? kegiatan.title,
      date: req.body.date ?? kegiatan.date,
      description: req.body.description ?? kegiatan.description,
      status: req.body.status ?? kegiatan.status,
      image: nextImage
    });

    if (req.file && oldImage && oldImage !== nextImage) deleteLocalUpload(oldImage);
    await logAudit(req, {
      action: "activity.update",
      entityType: "activity",
      entityId: kegiatan.id,
      metadata: { title: kegiatan.title, uploaded: Boolean(req.file) }
    });

    res.json({
      success: true,
      message: "Kegiatan berhasil diperbarui",
      data: kegiatan
    });
  } catch (error) {
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui kegiatan",
      error: error.message
    });
  }
};

/**
 * Menghapus data kegiatan berdasarkan id sekaligus menghapus file gambarnya dan mencatat audit log.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id kegiatan yang dihapus).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: menghapus record Kegiatan dari database, menghapus file gambar terkait,
 *   dan menulis audit log "activity.delete". Mengirim HTTP 200 bila berhasil; 404 bila tidak ditemukan; 500 bila error.
 */
exports.deleteKegiatan = async (req, res) => {
  try {
    const { id } = req.params;

    const kegiatan = await Kegiatan.findByPk(id);

    if (!kegiatan) {
      return res.status(404).json({
        success: false,
        message: "Kegiatan tidak ditemukan"
      });
    }

    const oldImage = kegiatan.image;
    await kegiatan.destroy();
    deleteLocalUpload(oldImage);
    await logAudit(req, { action: "activity.delete", entityType: "activity", entityId: id });

    res.json({
      success: true,
      message: "Kegiatan berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus kegiatan",
      error: error.message
    });
  }
};
