const db = require("../models");
const { deleteLocalUpload, toRelativeUploadPath } = require("../utils/uploadStorage");
const { logAudit } = require("../services/auditLogService");

const Kegiatan = db.Kegiatan;
const VALID_STATUS = ["tampil", "tidak_tampil"];

function getImageValue(req, currentImage = null) {
  if (req.file) return toRelativeUploadPath(req.file);
  if (req.body.image !== undefined) return req.body.image || currentImage;
  return currentImage;
}

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
