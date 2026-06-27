const db = require("../models");

const ProfilSekolah = db.ProfilSekolah;

/**
 * Mengambil data profil sekolah. Karena hanya ada satu profil sekolah, mengembalikan record pertama yang ditemukan.
 *
 * @param {import('express').Request} req - Request Express (tidak ada parameter khusus yang dipakai).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi data profil sekolah (bisa null bila belum ada);
 *   500 bila terjadi kesalahan.
 */
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

/**
 * Membuat data profil sekolah baru. Memastikan nama sekolah wajib diisi dan menolak pembuatan bila profil sudah ada
 * (karena profil sekolah bersifat tunggal — gunakan update untuk mengubahnya).
 *
 * @param {import('express').Request} req - Request Express. Memakai req.body.nama_sekolah (wajib) dan field profil lain.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: membuat record ProfilSekolah. Mengirim HTTP 201 dengan data profil;
 *   400 bila nama kosong atau profil sudah ada; 500 bila terjadi kesalahan.
 */
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

/**
 * Memperbarui data profil sekolah yang sudah ada (record tunggal) dengan seluruh field yang dikirim pada body.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.body (field profil yang ingin diperbarui).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui record ProfilSekolah. Mengirim HTTP 200 dengan data terbaru;
 *   404 bila profil belum ada; 500 bila terjadi kesalahan.
 */
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
