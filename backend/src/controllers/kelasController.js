const db = require("../models");

const Kelas = db.Kelas;

function buildKelasPayload(body) {
  const payload = {};
  ["nama_kelas", "tingkat", "wali_kelas", "tahun_ajaran"].forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });

  if (body.jumlah_siswa !== undefined && body.jumlah_siswa !== "") {
    payload.jumlah_siswa = Number(body.jumlah_siswa) || 0;
  }

  return payload;
}

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
    const payload = buildKelasPayload(req.body);
    const { nama_kelas, tingkat, tahun_ajaran } = payload;

    if (!nama_kelas || !tingkat || !tahun_ajaran) {
      return res.status(400).json({
        success: false,
        message: "Nama kelas, tingkat, dan tahun ajaran wajib diisi"
      });
    }

    const kelas = await Kelas.create(payload);

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

    await kelas.update(buildKelasPayload(req.body));

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
