const db = require("../models");

const Kelas = db.Kelas;

exports.getAllKelas = async (req, res) => {
  try {
    const kelas = await Kelas.findAll({
      order: [["tingkat", "ASC"], ["nama_kelas", "ASC"]]
    });

    res.json({
      success: true,
      message: "Data kelas berhasil diambil",
      data: kelas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data kelas",
      error: error.message
    });
  }
};

exports.createKelas = async (req, res) => {
  try {
    const { nama_kelas, tingkat, tahun_ajaran } = req.body;

    if (!nama_kelas || !tingkat || !tahun_ajaran) {
      return res.status(400).json({
        success: false,
        message: "Nama kelas, tingkat, dan tahun ajaran wajib diisi"
      });
    }

    const kelas = await Kelas.create(req.body);

    res.status(201).json({
      success: true,
      message: "Data kelas berhasil ditambahkan",
      data: kelas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data kelas",
      error: error.message
    });
  }
};

exports.updateKelas = async (req, res) => {
  try {
    const { id } = req.params;

    const kelas = await Kelas.findByPk(id);

    if (!kelas) {
      return res.status(404).json({
        success: false,
        message: "Data kelas tidak ditemukan"
      });
    }

    await kelas.update(req.body);

    res.json({
      success: true,
      message: "Data kelas berhasil diperbarui",
      data: kelas
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data kelas",
      error: error.message
    });
  }
};

exports.deleteKelas = async (req, res) => {
  try {
    const { id } = req.params;

    const kelas = await Kelas.findByPk(id);

    if (!kelas) {
      return res.status(404).json({
        success: false,
        message: "Data kelas tidak ditemukan"
      });
    }

    await kelas.destroy();

    res.json({
      success: true,
      message: "Data kelas berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data kelas",
      error: error.message
    });
  }
};
