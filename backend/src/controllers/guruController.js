const db = require("../models");

const Guru = db.Guru;

/**
 * Controller Express: mengambil seluruh data guru (master data), diurutkan menurut nama.
 *
 * @param {import('express').Request} req - Tidak memakai parameter khusus.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi daftar guru, atau 500 bila gagal. Efek
 *   samping: query baca ke tabel Guru.
 */
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

/**
 * Controller Express: menambah data guru baru ke master data. Memvalidasi bahwa NIP dan nama
 * wajib diisi, lalu menyimpan seluruh field dari body.
 *
 * @param {import('express').Request} req - req.body memuat data guru, minimal nip dan nama
 *   (field lain disimpan apa adanya sesuai model Guru).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 201 berisi data guru baru bila sukses; 400 bila NIP/nama
 *   kosong; 500 untuk error server. Efek samping: membuat record Guru.
 */
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

/**
 * Controller Express: memperbarui data guru berdasarkan id dengan field dari body.
 *
 * @param {import('express').Request} req - req.params.id ID guru; req.body memuat field yang
 *   akan diperbarui.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi data terbaru bila sukses; 404 bila guru tak
 *   ada; 500 untuk error server. Efek samping: update record Guru.
 */
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

/**
 * Controller Express: menghapus data guru berdasarkan id.
 *
 * @param {import('express').Request} req - req.params.id ID guru yang dihapus.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 bila sukses; 404 bila guru tak ada; 500 untuk error
 *   server. Efek samping: menghapus record Guru.
 */
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
