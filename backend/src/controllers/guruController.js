const db = require("../models");

const Guru = db.Guru;

exports.getAllGuru = async (req, res) => {
  try {
    const guru = await Guru.findAll({
      order: [["nama", "ASC"]]
    });

    res.json({
      success: true,
      message: "Data guru berhasil diambil",
      data: guru
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data guru",
      error: error.message
    });
  }
};

exports.createGuru = async (req, res) => {
  try {
    const { nip, nama } = req.body;

    if (!nip || !nama) {
      return res.status(400).json({
        success: false,
        message: "NIP dan nama wajib diisi"
      });
    }

    const guru = await Guru.create(req.body);

    res.status(201).json({
      success: true,
      message: "Data guru berhasil ditambahkan",
      data: guru
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data guru",
      error: error.message
    });
  }
};

exports.updateGuru = async (req, res) => {
  try {
    const { id } = req.params;

    const guru = await Guru.findByPk(id);

    if (!guru) {
      return res.status(404).json({
        success: false,
        message: "Data guru tidak ditemukan"
      });
    }

    await guru.update(req.body);

    res.json({
      success: true,
      message: "Data guru berhasil diperbarui",
      data: guru
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data guru",
      error: error.message
    });
  }
};

exports.deleteGuru = async (req, res) => {
  try {
    const { id } = req.params;

    const guru = await Guru.findByPk(id);

    if (!guru) {
      return res.status(404).json({
        success: false,
        message: "Data guru tidak ditemukan"
      });
    }

    await guru.destroy();

    res.json({
      success: true,
      message: "Data guru berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data guru",
      error: error.message
    });
  }
};
