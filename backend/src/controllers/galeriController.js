const db = require("../models");
const { deleteLocalUpload, toRelativeUploadPath } = require("../utils/uploadStorage");
const { logAudit } = require("../services/auditLogService");

const Galeri = db.Galeri;

function getImageValue(req, currentImage = null) {
  if (req.file) return toRelativeUploadPath(req.file);
  if (req.body.image !== undefined) return req.body.image || currentImage;
  return currentImage;
}

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

exports.createGaleri = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const image = getImageValue(req);

    if (!title || !image) {
      return res.status(400).json({
        success: false,
        message: "Judul dan gambar wajib diisi"
      });
    }

    const galeri = await Galeri.create({ title, image, description, category });
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
