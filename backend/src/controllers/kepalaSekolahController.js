const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const db = require("../models");

const KepalaSekolah = db.KepalaSekolah;
const User = db.User;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeJenjang(value) {
  const jenjang = String(value || "").trim().toLowerCase();
  return ["sd", "smp"].includes(jenjang) ? jenjang : null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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
