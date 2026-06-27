const { fn, col } = require("sequelize");
const db = require("../models");

const Kelas = db.Kelas;
const Siswa = db.Siswa;

// Jumlah siswa selalu dihitung otomatis dari data siswa, tidak pernah diinput manual.
/**
 * Menyusun payload data kelas dari body request, hanya menyertakan field yang benar-benar dikirim.
 * Sengaja TIDAK menyertakan jumlah siswa karena jumlah siswa selalu dihitung otomatis dari data siswa,
 * bukan diinput manual. Dipakai oleh createKelas dan updateKelas.
 *
 * @param {Object} body - Objek req.body. Field yang diproses: nama_kelas, tingkat, wali_kelas, tahun_ajaran.
 * @returns {Object} Payload berisi hanya field kelas yang dikirim, siap dipakai untuk create/update.
 */
function buildKelasPayload(body) {
  const payload = {};
  ["nama_kelas", "tingkat", "wali_kelas", "tahun_ajaran"].forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field];
  });

  return payload;
}

/**
 * Menghitung jumlah siswa aktif per kelas dengan agregasi COUNT di database, lalu memetakannya berdasarkan kelas_id.
 * Dipakai untuk melengkapi data kelas dengan jumlah siswa secara real-time tanpa menyimpan angka itu di tabel kelas.
 *
 * @returns {Promise<Map<number, number>>} Map dengan key kelas_id (number) dan value jumlah siswa aktif di kelas tersebut.
 */
async function getStudentCountMap() {
  const rows = await Siswa.findAll({
    attributes: ["kelas_id", [fn("COUNT", col("id")), "total"]],
    where: { status: "aktif" },
    group: ["kelas_id"]
  });

  const map = new Map();
  rows.forEach((row) => {
    const data = row.toJSON();
    if (data.kelas_id !== null && data.kelas_id !== undefined) {
      map.set(Number(data.kelas_id), Number(data.total) || 0);
    }
  });
  return map;
}

/**
 * Mengambil seluruh data kelas, diurutkan berdasarkan tingkat lalu nama kelas, dan melengkapi setiap kelas
 * dengan jumlah siswa aktif yang dihitung otomatis.
 *
 * @param {import('express').Request} req - Request Express (tidak ada parameter khusus yang dipakai).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi daftar kelas beserta field jumlah_siswa; 500 bila terjadi kesalahan.
 */
exports.getAllKelas = async (req, res) => {
  try {
    const kelas = await Kelas.findAll({
      order: [["tingkat", "ASC"], ["nama_kelas", "ASC"]]
    });

    const countMap = await getStudentCountMap();
    const data = kelas.map((item) => ({
      ...item.toJSON(),
      jumlah_siswa: countMap.get(Number(item.id)) || 0
    }));

    res.json({
      success: true,
      message: "Data kelas berhasil diambil",
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data kelas",
      error: error.message
    });
  }
};

/**
 * Membuat data kelas baru. Memvalidasi bahwa nama kelas, tingkat, dan tahun ajaran wajib diisi sebelum menyimpan.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.body.nama_kelas, req.body.tingkat,
 *   req.body.wali_kelas, dan req.body.tahun_ajaran.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: membuat record Kelas baru. Mengirim HTTP 201 dengan data kelas;
 *   400 bila field wajib kosong; 500 bila terjadi kesalahan.
 */
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

/**
 * Memperbarui data kelas berdasarkan id. Hanya field yang dikirim pada body yang akan diperbarui.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id kelas) dan field opsional
 *   pada req.body (nama_kelas, tingkat, wali_kelas, tahun_ajaran).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui record Kelas. Mengirim HTTP 200 dengan data terbaru;
 *   404 bila kelas tidak ditemukan; 500 bila terjadi kesalahan.
 */
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

/**
 * Menghapus data kelas berdasarkan id.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id kelas yang dihapus).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: menghapus record Kelas dari database. Mengirim HTTP 200 bila berhasil;
 *   404 bila kelas tidak ditemukan; 500 bila terjadi kesalahan.
 */
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
