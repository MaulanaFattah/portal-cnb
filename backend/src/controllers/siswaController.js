const db = require("../models");

const Siswa = db.Siswa;

exports.getAllSiswa = async (req, res) => {
  try {
    const siswa = await Siswa.findAll({
      order: [["nama", "ASC"]]
    });

    res.json({
      success: true,
      message: "Data siswa berhasil diambil",
      data: siswa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data siswa",
      error: error.message
    });
  }
};

exports.createSiswa = async (req, res) => {
  try {
    const { nisn, nama, jenis_kelamin } = req.body;

    if (!nisn || !nama || !jenis_kelamin) {
      return res.status(400).json({
        success: false,
        message: "NISN, nama, dan jenis kelamin wajib diisi"
      });
    }

    const siswa = await Siswa.create(req.body);

    res.status(201).json({
      success: true,
      message: "Data siswa berhasil ditambahkan",
      data: siswa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data siswa",
      error: error.message
    });
  }
};

exports.updateSiswa = async (req, res) => {
  try {
    const { id } = req.params;

    const siswa = await Siswa.findByPk(id);

    if (!siswa) {
      return res.status(404).json({
        success: false,
        message: "Data siswa tidak ditemukan"
      });
    }

    await siswa.update(req.body);

    res.json({
      success: true,
      message: "Data siswa berhasil diperbarui",
      data: siswa
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data siswa",
      error: error.message
    });
  }
};

exports.deleteSiswa = async (req, res) => {
  try {
    const { id } = req.params;

    const siswa = await Siswa.findByPk(id);

    if (!siswa) {
      return res.status(404).json({
        success: false,
        message: "Data siswa tidak ditemukan"
      });
    }

    await siswa.destroy();

    res.json({
      success: true,
      message: "Data siswa berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data siswa",
      error: error.message
    });
  }
};
