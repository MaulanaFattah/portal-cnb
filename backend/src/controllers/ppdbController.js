const db = require("../models");

const PPDB = db.PPDB;

exports.getAllPPDB = async (req, res) => {
  try {
    const ppdb = await PPDB.findAll({
      order: [["createdAt", "DESC"]]
    });

    res.json({
      success: true,
      message: "Data PPDB berhasil diambil",
      data: ppdb
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data PPDB",
      error: error.message
    });
  }
};

exports.createPPDB = async (req, res) => {
  try {
    const { nama_lengkap, tanggal_lahir, jenis_kelamin, agama, alamat, nama_ayah, nama_ibu, no_telepon, tahun_ajaran } = req.body;

    if (!nama_lengkap || !tanggal_lahir || !jenis_kelamin || !agama || !alamat || !nama_ayah || !nama_ibu || !no_telepon || !tahun_ajaran) {
      return res.status(400).json({
        success: false,
        message: "Semua field wajib diisi"
      });
    }

    const ppdb = await PPDB.create(req.body);

    res.status(201).json({
      success: true,
      message: "Data PPDB berhasil ditambahkan",
      data: ppdb
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data PPDB",
      error: error.message
    });
  }
};

exports.updatePPDB = async (req, res) => {
  try {
    const { id } = req.params;

    const ppdb = await PPDB.findByPk(id);

    if (!ppdb) {
      return res.status(404).json({
        success: false,
        message: "Data PPDB tidak ditemukan"
      });
    }

    await ppdb.update(req.body);

    res.json({
      success: true,
      message: "Data PPDB berhasil diperbarui",
      data: ppdb
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data PPDB",
      error: error.message
    });
  }
};

exports.deletePPDB = async (req, res) => {
  try {
    const { id } = req.params;

    const ppdb = await PPDB.findByPk(id);

    if (!ppdb) {
      return res.status(404).json({
        success: false,
        message: "Data PPDB tidak ditemukan"
      });
    }

    await ppdb.destroy();

    res.json({
      success: true,
      message: "Data PPDB berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data PPDB",
      error: error.message
    });
  }
};
