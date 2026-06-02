const db = require("../models");

const KepalaSekolah = db.KepalaSekolah;

exports.getAllKepalaSekolah = async (req, res) => {
  try {
    const kepalaSekolah = await KepalaSekolah.findAll({
      order: [["periode_mulai", "DESC"]]
    });

    res.json({
      success: true,
      message: "Data kepala sekolah berhasil diambil",
      data: kepalaSekolah
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data kepala sekolah",
      error: error.message
    });
  }
};

exports.createKepalaSekolah = async (req, res) => {
  try {
    const { nip, nama, periode_mulai } = req.body;

    if (!nip || !nama || !periode_mulai) {
      return res.status(400).json({
        success: false,
        message: "NIP, nama, dan periode mulai wajib diisi"
      });
    }

    const kepalaSekolah = await KepalaSekolah.create(req.body);

    res.status(201).json({
      success: true,
      message: "Data kepala sekolah berhasil ditambahkan",
      data: kepalaSekolah
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data kepala sekolah",
      error: error.message
    });
  }
};

exports.updateKepalaSekolah = async (req, res) => {
  try {
    const { id } = req.params;

    const kepalaSekolah = await KepalaSekolah.findByPk(id);

    if (!kepalaSekolah) {
      return res.status(404).json({
        success: false,
        message: "Data kepala sekolah tidak ditemukan"
      });
    }

    await kepalaSekolah.update(req.body);

    res.json({
      success: true,
      message: "Data kepala sekolah berhasil diperbarui",
      data: kepalaSekolah
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data kepala sekolah",
      error: error.message
    });
  }
};

exports.deleteKepalaSekolah = async (req, res) => {
  try {
    const { id } = req.params;

    const kepalaSekolah = await KepalaSekolah.findByPk(id);

    if (!kepalaSekolah) {
      return res.status(404).json({
        success: false,
        message: "Data kepala sekolah tidak ditemukan"
      });
    }

    await kepalaSekolah.destroy();

    res.json({
      success: true,
      message: "Data kepala sekolah berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data kepala sekolah",
      error: error.message
    });
  }
};
