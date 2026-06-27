const db = require("../models");

const Pengumuman = db.Pengumuman;

/**
 * Mengambil seluruh data pengumuman, diurutkan dari tanggal terbaru.
 *
 * @param {import('express').Request} req - Request Express (tidak ada parameter khusus yang dipakai).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi daftar pengumuman; 500 bila terjadi kesalahan.
 */
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

/**
 * Membuat pengumuman baru. Memvalidasi bahwa judul, tanggal, dan konten wajib diisi sebelum menyimpan.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.body.title, req.body.date, req.body.content,
 *   req.body.category, dan req.body.image.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: membuat record Pengumuman baru. Mengirim HTTP 201 dengan data pengumuman;
 *   400 bila field wajib kosong; 500 bila terjadi kesalahan.
 */
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

/**
 * Memperbarui pengumuman berdasarkan id menggunakan seluruh field yang dikirim pada body.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id pengumuman) dan req.body
 *   (field yang ingin diperbarui, mis. title, date, content, category, image).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui record Pengumuman. Mengirim HTTP 200 dengan data terbaru;
 *   404 bila tidak ditemukan; 500 bila terjadi kesalahan.
 */
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

/**
 * Menghapus pengumuman berdasarkan id.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id pengumuman yang dihapus).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: menghapus record Pengumuman dari database. Mengirim HTTP 200 bila berhasil;
 *   404 bila tidak ditemukan; 500 bila terjadi kesalahan.
 */
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
