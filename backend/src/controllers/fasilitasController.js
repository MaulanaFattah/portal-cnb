const db = require("../models");
const { deleteLocalUpload, toRelativeUploadPath } = require("../utils/uploadStorage");
const { logAudit } = require("../services/auditLogService");

const Fasilitas = db.Fasilitas;

function getImageValue(req, currentImage = null) {
  if (req.file) return toRelativeUploadPath(req.file);
  if (req.body.image !== undefined) return req.body.image || currentImage;
  return currentImage;
}

function buildPayload(body, image) {
  const payload = {
    name: String(body.name || body.nama || "").trim(),
    description: String(body.description || body.deskripsi || "").trim(),
    image,
    status: ["tampil", "sembunyi"].includes(body.status) ? body.status : "tampil"
  };

  if (body.sortOrder !== undefined || body.urutan !== undefined) {
    const sortOrder = Number(body.sortOrder ?? body.urutan);
    payload.sortOrder = Number.isFinite(sortOrder) ? sortOrder : 0;
  }

  return payload;
}

exports.getAllFasilitas = async (req, res) => {
  try {
    const fasilitas = await Fasilitas.findAll({
      where: { status: "tampil" },
      order: [["sortOrder", "ASC"], ["createdAt", "DESC"]]
    });

    return res.json({ success: true, message: "Data fasilitas berhasil diambil", data: fasilitas });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil data fasilitas", error: error.message });
  }
};

exports.getAllFasilitasAdmin = async (req, res) => {
  try {
    const fasilitas = await Fasilitas.findAll({ order: [["sortOrder", "ASC"], ["createdAt", "DESC"]] });
    return res.json({ success: true, message: "Data fasilitas admin berhasil diambil", data: fasilitas });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil data fasilitas", error: error.message });
  }
};

exports.createFasilitas = async (req, res) => {
  try {
    const image = getImageValue(req);
    const payload = buildPayload(req.body, image);

    if (!payload.name || !payload.description) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Nama dan deskripsi fasilitas wajib diisi" });
    }

    const fasilitas = await Fasilitas.create(payload);
    await logAudit(req, {
      action: "facility.create",
      entityType: "facility",
      entityId: fasilitas.id,
      metadata: { name: fasilitas.name, uploaded: Boolean(req.file) }
    });

    return res.status(201).json({ success: true, message: "Fasilitas berhasil ditambahkan", data: fasilitas });
  } catch (error) {
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    return res.status(500).json({ success: false, message: "Gagal menambahkan fasilitas", error: error.message });
  }
};

exports.updateFasilitas = async (req, res) => {
  try {
    const fasilitas = await Fasilitas.findByPk(req.params.id);
    if (!fasilitas) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(404).json({ success: false, message: "Fasilitas tidak ditemukan" });
    }

    const oldImage = fasilitas.image;
    const nextImage = getImageValue(req, oldImage);
    const payload = buildPayload(req.body, nextImage);

    if (!payload.name || !payload.description) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Nama dan deskripsi fasilitas wajib diisi" });
    }

    await fasilitas.update(payload);
    if (req.file && oldImage && oldImage !== nextImage) deleteLocalUpload(oldImage);

    await logAudit(req, {
      action: "facility.update",
      entityType: "facility",
      entityId: fasilitas.id,
      metadata: { name: fasilitas.name, uploaded: Boolean(req.file) }
    });

    return res.json({ success: true, message: "Fasilitas berhasil diperbarui", data: fasilitas });
  } catch (error) {
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    return res.status(500).json({ success: false, message: "Gagal memperbarui fasilitas", error: error.message });
  }
};

exports.deleteFasilitas = async (req, res) => {
  try {
    const fasilitas = await Fasilitas.findByPk(req.params.id);
    if (!fasilitas) return res.status(404).json({ success: false, message: "Fasilitas tidak ditemukan" });

    const oldImage = fasilitas.image;
    await fasilitas.destroy();
    if (oldImage) deleteLocalUpload(oldImage);
    await logAudit(req, { action: "facility.delete", entityType: "facility", entityId: req.params.id });

    return res.json({ success: true, message: "Fasilitas berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal menghapus fasilitas", error: error.message });
  }
};