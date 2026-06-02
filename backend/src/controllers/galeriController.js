const db = require("../models");

const Galeri = db.Galeri;

exports.getAllGaleri = async (req, res) => {
  try {
    const galeri = await Galeri.findAll({
      order: [["createdAt", "DESC"]]
    });

    res.json({
      success: true,
      message: "Data galeri berhasil diambil",
      data: galeri
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data galeri",
      error: error.message
    });
  }
};

exports.createGaleri = async (req, res) => {
  try {
    const { title, image, description, category } = req.body;

    if (!title || !image) {
      return res.status(400).json({
        success: false,
        message: "Judul dan gambar wajib diisi"
      });
    }

    const galeri = await Galeri.create({
      title,
      image,
      description,
      category
    });

    res.status(201).json({
      success: true,
      message: "Galeri berhasil ditambahkan",
      data: galeri
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan galeri",
      error: error.message
    });
  }
};

exports.updateGaleri = async (req, res) => {
  try {
    const { id } = req.params;

    const galeri = await Galeri.findByPk(id);

    if (!galeri) {
      return res.status(404).json({
        success: false,
        message: "Galeri tidak ditemukan"
      });
    }

    await galeri.update(req.body);

    res.json({
      success: true,
      message: "Galeri berhasil diperbarui",
      data: galeri
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui galeri",
      error: error.message
    });
  }
};

exports.deleteGaleri = async (req, res) => {
  try {
    const { id } = req.params;

    const galeri = await Galeri.findByPk(id);

    if (!galeri) {
      return res.status(404).json({
        success: false,
        message: "Galeri tidak ditemukan"
      });
    }

    await galeri.destroy();

    res.json({
      success: true,
      message: "Galeri berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus galeri",
      error: error.message
    });
  }
};
