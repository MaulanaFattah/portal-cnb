const bcrypt = require("bcryptjs");
const db = require("../models");

const User = db.User;
const Siswa = db.Siswa;
const Kelas = db.Kelas;
const PortalAccountLink = db.PortalAccountLink;

const SAFE_ATTRS = ["id", "name", "email", "role", "profession", "createdAt", "updatedAt"];
const VALID_ROLES = ["admin", "guru", "siswa", "orangtua", "kepala_sekolah"];
const LINKED_ROLES = ["siswa", "orangtua"];

function safeUser(user) {
  if (!user) return null;
  return SAFE_ATTRS.reduce((payload, key) => ({ ...payload, [key]: user[key] }), {});
}

async function getClassMap() {
  const kelas = await Kelas.findAll();
  return new Map(kelas.map((item) => [Number(item.id), item.toJSON()]));
}

function attachClass(siswa, classMap) {
  if (!siswa) return null;
  const data = siswa.toJSON ? siswa.toJSON() : siswa;
  return { ...data, kelas: classMap.get(Number(data.kelas_id)) || null };
}

async function buildUsersPayload(users) {
  const userIds = users.map((user) => Number(user.id));
  const links = userIds.length && PortalAccountLink
    ? await PortalAccountLink.findAll({ where: { user_id: userIds } })
    : [];
  const studentIds = [...new Set(links.map((link) => Number(link.siswa_id)).filter(Boolean))];
  const students = studentIds.length ? await Siswa.findAll({ where: { id: studentIds } }) : [];
  const classMap = await getClassMap();
  const studentMap = new Map(students.map((siswa) => [Number(siswa.id), attachClass(siswa, classMap)]));
  const linkMap = new Map(links.map((link) => [Number(link.user_id), link.toJSON()]));

  return users.map((user) => {
    const link = linkMap.get(Number(user.id)) || null;
    return {
      ...safeUser(user),
      portalLink: link,
      siswa: link ? studentMap.get(Number(link.siswa_id)) || null : null
    };
  });
}

async function upsertPortalLink(userId, siswaId, role, transaction) {
  if (!PortalAccountLink || !LINKED_ROLES.includes(role)) return null;
  if (!siswaId) throw new Error("Data siswa wajib dipilih untuk akun siswa/orang tua");

  const siswa = await Siswa.findByPk(siswaId, { transaction });
  if (!siswa) throw new Error("Data siswa tidak ditemukan");

  await PortalAccountLink.destroy({ where: { user_id: userId }, transaction });
  return PortalAccountLink.create({ user_id: userId, siswa_id: siswa.id, link_type: role }, { transaction });
}

exports.dashboard = async (req, res) => {
  try {
    const totalGuru = await User.count({ where: { role: "guru" } });
    const totalSiswa = await User.count({ where: { role: "siswa" } });
    const totalAdmin = await User.count({ where: { role: "admin" } });
    const totalKepalaSekolah = await User.count({ where: { role: "kepala_sekolah" } });

    return res.json({
      success: true,
      message: "Dashboard admin berhasil diambil",
      data: {
        admin: req.user.name,
        totalGuru,
        totalSiswa,
        totalAdmin,
        totalKepalaSekolah,
        loginHariIni: 1
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const where = {};
    if (role) where.role = role;

    const users = await User.findAll({
      where,
      attributes: SAFE_ATTRS,
      order: [["name", "ASC"]]
    });
    const data = await buildUsersPayload(users);

    return res.json({
      success: true,
      message: "Data user berhasil diambil",
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data user",
      error: error.message
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role = "siswa", profession, siswa_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password wajib diisi"
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Role akun tidak valid" });
    }

    if (LINKED_ROLES.includes(role) && !siswa_id) {
      return res.status(400).json({ success: false, message: "Pilih data siswa yang akan dihubungkan" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar"
      });
    }

    const transaction = await db.sequelize.transaction();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashedPassword, role, profession }, { transaction });
      await upsertPortalLink(user.id, siswa_id, role, transaction);
      await transaction.commit();

      const [payload] = await buildUsersPayload([user]);
      return res.status(201).json({ success: true, message: "User berhasil ditambahkan", data: payload });
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: error.message });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan user",
      error: error.message
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, profession, siswa_id } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Email sudah terdaftar"
        });
      }
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Role akun tidak valid" });
    }

    if (role && LINKED_ROLES.includes(role) && !siswa_id) {
      return res.status(400).json({ success: false, message: "Pilih data siswa yang akan dihubungkan" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (profession !== undefined) updateData.profession = profession;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const nextRole = role || user.role;
    const transaction = await db.sequelize.transaction();

    try {
      await user.update(updateData, { transaction });
      if (LINKED_ROLES.includes(nextRole)) await upsertPortalLink(user.id, siswa_id, nextRole, transaction);
      else if (PortalAccountLink) await PortalAccountLink.destroy({ where: { user_id: user.id }, transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: error.message });
    }

    const [payload] = await buildUsersPayload([user]);

    return res.json({
      success: true,
      message: "User berhasil diperbarui",
      data: payload
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui user",
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus akun sendiri"
      });
    }

    await user.destroy();

    return res.json({
      success: true,
      message: "User berhasil dihapus"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus user",
      error: error.message
    });
  }
};
