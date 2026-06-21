const bcrypt = require("bcryptjs");
const db = require("../models");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { logAudit } = require("../services/auditLogService");

const User = db.User;
const Siswa = db.Siswa;
const Kelas = db.Kelas;
const PortalAccountLink = db.PortalAccountLink;
const PasswordResetRequest = db.PasswordResetRequest;

const SAFE_ATTRS = ["id", "name", "email", "role", "profession", "must_change_password", "createdAt", "updatedAt"];
const VALID_ROLES = ["admin", "guru", "siswa", "orangtua", "kepala_sekolah"];
const LINKED_ROLES = ["siswa", "orangtua"];
const RESET_REQUEST_STATUSES = ["pending", "completed", "rejected"];

function safeUser(user) {
  if (!user) return null;
  return SAFE_ATTRS.reduce((payload, key) => ({ ...payload, [key]: user[key] }), {});
}

function normalizeText(value, maxLength = 500) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.slice(0, maxLength);
}

function safePasswordResetRequest(request) {
  const data = request?.toJSON ? request.toJSON() : request;
  if (!data) return null;

  return {
    id: data.id,
    role: data.role,
    email: data.email,
    name: data.name,
    nisn: data.nisn,
    class_name: data.class_name,
    notes: data.notes,
    status: data.status,
    matched_user_id: data.matched_user_id,
    processed_by: data.processed_by,
    rejection_reason: data.rejection_reason,
    processed_at: data.processed_at,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    matchedUser: safeUser(data.matchedUser),
    processedBy: safeUser(data.processedBy)
  };
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
  const linkMap = new Map();

  links.forEach((link) => {
    const data = link.toJSON();
    const currentLinks = linkMap.get(Number(data.user_id)) || [];
    currentLinks.push({ ...data, siswa: studentMap.get(Number(data.siswa_id)) || null });
    linkMap.set(Number(data.user_id), currentLinks);
  });

  return users.map((user) => {
    const userLinks = linkMap.get(Number(user.id)) || [];
    const link = userLinks[0] || null;
    return {
      ...safeUser(user),
      portalLink: link,
      portalLinks: userLinks,
      siswa: link ? studentMap.get(Number(link.siswa_id)) || null : null
    };
  });
}

async function upsertPortalLink(userId, siswaId, role, transaction) {
  if (!PortalAccountLink || !LINKED_ROLES.includes(role)) return null;
  if (!siswaId) throw new Error("Data siswa wajib dipilih untuk akun siswa/orang tua");

  const siswa = await Siswa.findByPk(siswaId, { transaction });
  if (!siswa) throw new Error("Data siswa tidak ditemukan");

  if (role === "orangtua") {
    const existingParentLink = await PortalAccountLink.findOne({
      where: { siswa_id: siswa.id, link_type: role, user_id: { [Op.ne]: userId } },
      transaction
    });
    if (existingParentLink) throw new Error("Siswa ini sudah terhubung ke akun orang tua lain");

    await PortalAccountLink.destroy({ where: { user_id: userId, link_type: "siswa" }, transaction });
    const existingLink = await PortalAccountLink.findOne({
      where: { user_id: userId, siswa_id: siswa.id, link_type: role },
      transaction
    });
    if (existingLink) return existingLink;
    return PortalAccountLink.create({ user_id: userId, siswa_id: siswa.id, link_type: role }, { transaction });
  }

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
      message: "Data dasbor administrator berhasil diambil",
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
      message: "Data pengguna berhasil diambil",
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data pengguna",
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
        message: "Nama, email, dan kata sandi wajib diisi"
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Peran akun tidak valid" });
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
      return res.status(201).json({ success: true, message: "Pengguna berhasil ditambahkan", data: payload });
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: error.message });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan pengguna",
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
        message: "Pengguna tidak ditemukan"
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
      return res.status(400).json({ success: false, message: "Peran akun tidak valid" });
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
      message: "Pengguna berhasil diperbarui",
      data: payload
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui pengguna",
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
        message: "Pengguna tidak ditemukan"
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
      message: "Pengguna berhasil dihapus"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus pengguna",
      error: error.message
    });
  }
};


function generatePassword() {
  return `CNB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedPassword = req.body.password || generatePassword();

    if (String(requestedPassword).length < 6) {
      return res.status(400).json({ success: false, message: "Kata sandi minimal 6 karakter" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan" });
    }

    await user.update({
      password: await bcrypt.hash(requestedPassword, 10),
      must_change_password: true
    });

    await logAudit(req, {
      action: "password.force_reset",
      entityType: "user_account",
      entityId: user.id,
      metadata: { role: user.role, generated: !req.body.password }
    });

    return res.json({
      success: true,
      message: "Kata sandi pengguna berhasil diatur ulang. Pengguna wajib mengganti kata sandi saat masuk berikutnya.",
      data: {
        user: safeUser(user),
        generated_password: req.body.password ? null : requestedPassword
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengatur ulang kata sandi pengguna", error: error.message });
  }
};

exports.getPasswordResetRequests = async (req, res) => {
  try {
    const status = String(req.query.status || "pending").trim().toLowerCase();
    const where = RESET_REQUEST_STATUSES.includes(status) ? { status } : {};
    const requests = await PasswordResetRequest.findAll({
      where,
      include: [
        { model: User, as: "matchedUser", attributes: SAFE_ATTRS },
        { model: User, as: "processedBy", attributes: SAFE_ATTRS }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.json({ success: true, data: requests.map(safePasswordResetRequest) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memuat permintaan reset password" });
  }
};

exports.processPasswordResetRequest = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const request = await PasswordResetRequest.findByPk(req.params.id, { transaction });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Permintaan reset password tidak ditemukan" });
    }

    if (request.status !== "pending") {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Permintaan ini sudah diproses" });
    }

    const requestedPassword = req.body.password || generatePassword();
    if (String(requestedPassword).length < 6) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Kata sandi minimal 6 karakter" });
    }

    if (!request.matched_user_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Akun belum cocok otomatis. Tolak permintaan atau reset manual dari menu akun setelah verifikasi."
      });
    }

    const user = await User.findByPk(request.matched_user_id, { transaction });
    if (!user || user.role !== request.role) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Akun yang cocok tidak valid. Tolak permintaan atau reset manual dari menu akun."
      });
    }

    await user.update({
      password: await bcrypt.hash(requestedPassword, 10),
      must_change_password: true
    }, { transaction });

    await request.update({
      status: "completed",
      matched_user_id: user.id,
      processed_by: req.user.id,
      processed_at: new Date(),
      rejection_reason: null
    }, { transaction });

    await logAudit(req, {
      action: "password.reset.request.complete",
      entityType: "password_reset_request",
      entityId: request.id,
      metadata: { role: user.role, user_id: user.id, generated: !req.body.password }
    }, { transaction });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Permintaan reset selesai. Pengguna wajib mengganti kata sandi saat login berikutnya.",
      data: {
        request: safePasswordResetRequest(request),
        user: safeUser(user),
        generated_password: req.body.password ? null : requestedPassword
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: "Gagal memproses permintaan reset password" });
  }
};

exports.rejectPasswordResetRequest = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Permintaan reset password tidak ditemukan" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: "Permintaan ini sudah diproses" });
    }

    const rejectionReason = normalizeText(req.body.reason || req.body.alasan_penolakan || "Ditolak administrator");
    await request.update({
      status: "rejected",
      processed_by: req.user.id,
      processed_at: new Date(),
      rejection_reason: rejectionReason
    });

    await logAudit(req, {
      action: "password.reset.request.reject",
      entityType: "password_reset_request",
      entityId: request.id,
      metadata: { role: request.role }
    });

    return res.json({
      success: true,
      message: "Permintaan reset password ditolak.",
      data: { request: safePasswordResetRequest(request) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal menolak permintaan reset password" });
  }
};
