const db = require("../models");

const Kegiatan = db.Kegiatan;

exports.getAllKegiatan = async (req, res) => {
  try {
    const kegiatan = await Kegiatan.findAll({
      order: [["date", "DESC"]]
    });

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
    const { title, date, description, image } = req.body;

    if (!title || !date || !description) {
      return res.status(400).json({
        success: false,
        message: "Judul, tanggal, dan deskripsi wajib diisi"
      });
    }

    const kegiatan = await Kegiatan.create({
      title,
      date,
      description,
      image
    });

    res.status(201).json({
      success: true,
      message: "Kegiatan berhasil ditambahkan",
      data: kegiatan
    });
  } catch (error) {
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
      return res.status(404).json({
        success: false,
        message: "Kegiatan tidak ditemukan"
      });
    }

    await kegiatan.update(req.body);

    res.json({
      success: true,
      message: "Kegiatan berhasil diperbarui",
      data: kegiatan
    });
  } catch (error) {
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

    await kegiatan.destroy();

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