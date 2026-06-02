const db = require("../models");

const Pengumuman = db.Pengumuman;

exports.getAllPengumuman = async (req, res) => {
  try {
    const pengumuman = await Pengumuman.findAll({
      order: [["date", "DESC"]]
    });

    res.json({
      success: true,
      message: "Data pengumuman berhasil diambil",
      data: pengumuman
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data pengumuman",
      error: error.message
    });
  }
};

exports.createPengumuman = async (req, res) => {
  try {
    const { title, date, content, category, image } = req.body;

    if (!title || !date || !content) {
      return res.status(400).json({
        success: false,
        message: "Judul, tanggal, dan konten wajib diisi"
      });
    }

    const pengumuman = await Pengumuman.create({
      title,
      date,
      content,
      category,
      image
    });

    res.status(201).json({
      success: true,
      message: "Pengumuman berhasil ditambahkan",
      data: pengumuman
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan pengumuman",
      error: error.message
    });
  }
};

exports.updatePengumuman = async (req, res) => {
  try {
    const { id } = req.params;

    const pengumuman = await Pengumuman.findByPk(id);

    if (!pengumuman) {
      return res.status(404).json({
        success: false,
        message: "Pengumuman tidak ditemukan"
      });
    }

    await pengumuman.update(req.body);

    res.json({
      success: true,
      message: "Pengumuman berhasil diperbarui",
      data: pengumuman
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui pengumuman",
      error: error.message
    });
  }
};

exports.deletePengumuman = async (req, res) => {
  try {
    const { id } = req.params;

    const pengumuman = await Pengumuman.findByPk(id);

    if (!pengumuman) {
      return res.status(404).json({
        success: false,
        message: "Pengumuman tidak ditemukan"
      });
    }

    await pengumuman.destroy();

    res.json({
      success: true,
      message: "Pengumuman berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pengumuman",
      error: error.message
    });
  }
};
