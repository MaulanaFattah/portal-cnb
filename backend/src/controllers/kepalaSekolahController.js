const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const db = require("../models");

const KepalaSekolah = db.KepalaSekolah;
const User = db.User;

/**
 * Menormalkan alamat email menjadi bentuk standar: tanpa spasi di ujung dan huruf kecil semua.
 * Dipakai agar pencocokan email konsisten (mis. saat mencari/membuat akun user kepala sekolah).
 *
 * @param {*} value - Nilai email mentah (boleh undefined/null).
 * @returns {string} Email yang sudah di-trim dan di-lowercase (string kosong bila input kosong).
 */
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Memvalidasi dan menormalkan jenjang kepala sekolah agar hanya menerima nilai "sd" atau "smp".
 *
 * @param {*} value - Nilai jenjang mentah (boleh undefined/null).
 * @returns {("sd"|"smp"|null)} "sd" atau "smp" bila valid; null bila nilai tidak dikenali.
 */
function normalizeJenjang(value) {
  const jenjang = String(value || "").trim().toLowerCase();
  return ["sd", "smp"].includes(jenjang) ? jenjang : null;
}

/**
 * Menghasilkan tanggal hari ini dalam format ISO "YYYY-MM-DD".
 * Dipakai sebagai nilai default periode_mulai kepala sekolah bila tidak diisi.
 *
 * @returns {string} Tanggal hari ini dalam format "YYYY-MM-DD".
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Menyusun payload data kepala sekolah dari body request, hanya menyertakan field yang dikirim.
 * Sekaligus menormalkan jenjang dan email, serta membuang field status bila kosong agar tidak menimpa nilai default.
 *
 * @param {Object} body - Objek req.body. Field yang diproses: nip, nama, email, no_telepon, foto,
 *   periode_mulai, periode_akhir, alamat, pendidikan_terakhir, status, dan jenjang.
 * @returns {Object} Payload data kepala sekolah yang sudah dinormalkan, siap dipakai untuk create/update.
 */
function buildKepalaSekolahPayload(body) {
  const payload = {};
  [
    "nip",
    "nama",
    "email",
    "no_telepon",
    "foto",
    "periode_mulai",
    "periode_akhir",
    "alamat",
    "pendidikan_terakhir",
    "status"
  ].forEach((field) => {
    if (body[field] !== undefined) payload[field] = body[field] || null;
  });

  if (body.jenjang !== undefined) payload.jenjang = normalizeJenjang(body.jenjang);
  if (payload.email) payload.email = normalizeEmail(payload.email);
  if (!payload.status) delete payload.status;
  return payload;
}

/**
 * Mencari akun User kepala sekolah yang sudah ada atau membuat akun baru sesuai data yang diberikan.
 * Logika bisnisnya: cari user berdasarkan id lama atau email; tolak bila email sudah dipakai role lain;
 * perbarui data (nama, email, role, profession) dan password bila disertakan; bila belum ada user dan password
 * tidak diberikan maka tidak membuat akun (mengembalikan null). Semua operasi berjalan di dalam transaksi.
 *
 * @param {Object} args - Argumen.
 * @param {number} [args.existingUserId] - Id user yang sudah tertaut (saat update).
 * @param {string} args.nama - Nama kepala sekolah untuk field name user.
 * @param {string} args.email - Email yang sudah dinormalkan, dipakai sebagai identitas login.
 * @param {string} [args.password] - Password baru (opsional). Wajib minimal 6 karakter bila diisi; akan di-hash bcrypt.
 * @param {("sd"|"smp"|null)} args.jenjang - Jenjang untuk menyusun profession ("Kepala Sekolah SD/SMP").
 * @param {import('sequelize').Transaction} args.transaction - Transaksi Sequelize aktif.
 * @returns {Promise<number|null>} Id user kepala sekolah yang dipakai/dibuat, atau null bila akun tidak dibuat.
 * @throws {Error} Bila email dipakai role lain atau password kurang dari 6 karakter.
 */
async function resolveOrCreatePrincipalUser({ existingUserId, nama, email, password, jenjang, transaction }) {
  if (!email) return existingUserId || null;

  let user = existingUserId ? await User.findByPk(existingUserId, { transaction }) : null;
  if (!user) user = await User.findOne({ where: { email }, transaction });

  if (user && user.role !== "kepala_sekolah") {
    throw new Error("Email sudah dipakai oleh role lain");
  }

  const updatePayload = {
    name: nama,
    email,
    role: "kepala_sekolah",
    profession: jenjang ? `Kepala Sekolah ${jenjang.toUpperCase()}` : "Kepala Sekolah"
  };

  if (password) {
    if (String(password).length < 6) throw new Error("Kata sandi minimal 6 karakter");
    updatePayload.password = await bcrypt.hash(password, 10);
  }

  if (user) {
    await user.update(updatePayload, { transaction });
    return user.id;
  }

  if (!password) return null;

  const createdUser = await User.create(updatePayload, { transaction });
  return createdUser.id;
}

/**
 * Mengambil seluruh data kepala sekolah, diurutkan dari periode mulai terbaru.
 *
 * @param {import('express').Request} req - Request Express (tidak ada parameter khusus yang dipakai).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi daftar kepala sekolah; 500 bila terjadi kesalahan.
 */
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

/**
 * Membuat data kepala sekolah baru sekaligus akun login User-nya dalam satu transaksi database.
 * Memvalidasi field wajib (NIP, nama, email, password, jenjang), mengisi default periode_mulai dan status,
 * lalu menautkan record kepala sekolah ke user yang dibuat/ditemukan. Bila gagal, transaksi di-rollback.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.body.nip, req.body.nama, req.body.email,
 *   req.body.jenjang, req.body.password atau req.body.kata_sandi, serta field profil lain (no_telepon, alamat, dll).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: membuat record KepalaSekolah dan (opsional) record User dalam transaksi.
 *   Mengirim HTTP 201 dengan data kepala sekolah; 400 bila validasi gagal; 500 (rollback) bila terjadi kesalahan.
 */
exports.createKepalaSekolah = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const payload = buildKepalaSekolahPayload(req.body);
    const { nip, nama, jenjang } = payload;
    const password = req.body.password || req.body.kata_sandi;

    if (!nip || !nama || !payload.email || !password || !jenjang) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "NIP, nama, email, password, dan jenjang wajib diisi"
      });
    }

    if (!payload.periode_mulai) payload.periode_mulai = todayISO();
    if (!payload.status) payload.status = "aktif";

    payload.user_id = await resolveOrCreatePrincipalUser({
      nama,
      email: payload.email,
      password,
      jenjang,
      transaction
    });

    const kepalaSekolah = await KepalaSekolah.create(payload, { transaction });
    await transaction.commit();

    res.status(201).json({
      success: true,
      message: payload.user_id ? "Data dan akun kepala sekolah berhasil ditambahkan" : "Data kepala sekolah berhasil ditambahkan",
      data: kepalaSekolah
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data kepala sekolah",
      error: error.message
    });
  }
};

/**
 * Memperbarui data kepala sekolah berdasarkan id dalam satu transaksi. Bila email, password, nama, atau jenjang
 * berubah, akun User yang tertaut ikut diperbarui/dibuat melalui resolveOrCreatePrincipalUser. Rollback bila gagal.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id kepala sekolah) dan field opsional
 *   pada req.body (nama, email, jenjang, password/kata_sandi, no_telepon, alamat, periode, status, dll).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui record KepalaSekolah dan (opsional) record User dalam transaksi.
 *   Mengirim HTTP 200 dengan data terbaru; 404 bila tidak ditemukan; 500 (rollback) bila terjadi kesalahan.
 */
exports.updateKepalaSekolah = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;
    const kepalaSekolah = await KepalaSekolah.findByPk(id, { transaction });

    if (!kepalaSekolah) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Data kepala sekolah tidak ditemukan"
      });
    }

    const payload = buildKepalaSekolahPayload(req.body);
    const nextData = { ...kepalaSekolah.toJSON(), ...payload };
    const password = req.body.password || req.body.kata_sandi;

    if (payload.email || password || payload.nama || payload.jenjang) {
      const userId = await resolveOrCreatePrincipalUser({
        existingUserId: kepalaSekolah.user_id,
        nama: nextData.nama,
        email: normalizeEmail(nextData.email),
        password,
        jenjang: nextData.jenjang,
        transaction
      });
      if (userId) payload.user_id = userId;
    }

    await kepalaSekolah.update(payload, { transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Data kepala sekolah berhasil diperbarui",
      data: kepalaSekolah
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data kepala sekolah",
      error: error.message
    });
  }
};

/**
 * Menghapus data kepala sekolah berdasarkan id sekaligus menghapus akun User yang tertaut, dalam satu transaksi.
 * Penghapusan akun dilakukan berdasarkan user_id bila ada; bila tidak, berdasarkan email dengan role kepala_sekolah.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id kepala sekolah yang dihapus).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: menghapus record KepalaSekolah dan akun User terkait dalam transaksi.
 *   Mengirim HTTP 200 bila berhasil; 404 bila tidak ditemukan; 500 (rollback) bila terjadi kesalahan.
 */
exports.deleteKepalaSekolah = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;
    const kepalaSekolah = await KepalaSekolah.findByPk(id, { transaction });

    if (!kepalaSekolah) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Data kepala sekolah tidak ditemukan"
      });
    }

    const linkedUserId = kepalaSekolah.user_id;
    const linkedEmail = kepalaSekolah.email;
    await kepalaSekolah.destroy({ transaction });

    if (linkedUserId) {
      await User.destroy({ where: { id: linkedUserId, role: "kepala_sekolah" }, transaction });
    } else if (linkedEmail) {
      await User.destroy({ where: { email: linkedEmail, role: "kepala_sekolah", id: { [Op.ne]: 0 } }, transaction });
    }

    await transaction.commit();
    res.json({
      success: true,
      message: "Data kepala sekolah berhasil dihapus"
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data kepala sekolah",
      error: error.message
    });
  }
};
