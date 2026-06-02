const db = require("../models");

const ProfilSekolah = db.ProfilSekolah;

exports.getProfilSekolah = async (req, res) => {
  try {
    const profil = await ProfilSekolah.findOne();

    res.json({
      success: true,
      message: "Data profil sekolah berhasil diambil",
      data: profil
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data profil sekolah",
      error: error.message
    });
  }
};

exports.createProfilSekolah = async (req, res) => {
  try {
    const { nama_sekolah } = req.body;

    if (!nama_sekolah) {
      return res.status(400).json({
        success: false,
        message: "Nama sekolah wajib diisi"
      });
    }

    const existingProfil = await ProfilSekolah.findOne();
    if (existingProfil) {
      return res.status(400).json({
        success: false,
        message: "Profil sekolah sudah ada, gunakan update untuk mengubah"
      });
    }

    const profil = await ProfilSekolah.create(req.body);

    res.status(201).json({
      success: true,
      message: "Data profil sekolah berhasil ditambahkan",
      data: profil
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data profil sekolah",
      error: error.message
    });
  }
};

exports.updateProfilSekolah = async (req, res) => {
  try {
    const profil = await ProfilSekolah.findOne();

    if (!profil) {
      return res.status(404).json({
        success: false,
        message: "Data profil sekolah tidak ditemukan"
      });
    }

    await profil.update(req.body);

    res.json({
      success: true,
      message: "Data profil sekolah berhasil diperbarui",
      data: profil
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data profil sekolah",
      error: error.message
    });
  }
};
