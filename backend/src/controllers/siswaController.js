const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const db = require("../models");
const { deleteLocalUpload, toRelativeUploadPath } = require("../utils/uploadStorage");
const { logAudit } = require("../services/auditLogService");

const Siswa = db.Siswa;
const Kelas = db.Kelas;
const User = db.User;
const PortalAccountLink = db.PortalAccountLink;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function getClassMap() {
  const kelas = await Kelas.findAll();
  return new Map(kelas.map((item) => [Number(item.id), item.toJSON()]));
}

function attachClass(siswa, classMap) {
  const data = siswa.toJSON ? siswa.toJSON() : siswa;
  return { ...data, kelas: classMap.get(Number(data.kelas_id)) || null };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

function generatePassword(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function buildPortalEmail(nisn, type) {
  const cleanNisn = String(nisn).toLowerCase().replace(/[^a-z0-9]+/g, "");
  return type === "siswa" ? `${cleanNisn}@cnb.sch.id` : `${cleanNisn}.ortu@cnb.sch.id`;
}

async function findReusableParentUserByPhone(phone, transaction) {
  const parentPhone = normalizePhoneNumber(phone);
  if (!parentPhone) return null;

  const siblingStudents = await Siswa.findAll({
    where: { no_telepon: { [Op.ne]: null } },
    attributes: ["id", "no_telepon"],
    transaction
  });
  const siblingIds = siblingStudents
    .filter((student) => normalizePhoneNumber(student.no_telepon) === parentPhone)
    .map((student) => student.id);
  if (!siblingIds.length) return null;

  const parentLink = await PortalAccountLink.findOne({
    where: { siswa_id: { [Op.in]: siblingIds }, link_type: "orangtua" },
    order: [["id", "ASC"]],
    transaction
  });
  if (!parentLink) return null;

  return User.findOne({ where: { id: parentLink.user_id, role: "orangtua" }, transaction });
}

function buildSiswaPayload(body, file) {
  const foto = file ? toRelativeUploadPath(file) : body.foto || null;
  return {
    nisn: String(body.nisn || "").trim(),
    nama: String(body.nama || "").trim(),
    kelas_id: Number(body.kelas_id),
    tempat_lahir: body.tempat_lahir || null,
    tanggal_lahir: body.tanggal_lahir || null,
    jenis_kelamin: body.jenis_kelamin,
    agama: body.agama || null,
    alamat: body.alamat || null,
    nama_ayah: body.nama_ayah || body.nama_orangtua || null,
    nama_ibu: body.nama_ibu || null,
    no_telepon: body.no_telepon || null,
    email: normalizeEmail(body.email) || null,
    foto,
    status: body.status || "aktif"
  };
}

function validateRequired(payload) {
  if (!payload.nisn || !payload.nama || !payload.kelas_id || !payload.tanggal_lahir || !payload.jenis_kelamin) {
    return "NIS/NISN, nama, kelas, tanggal lahir, dan jenis kelamin wajib diisi";
  }

  if (!['L', 'P'].includes(payload.jenis_kelamin)) return "Jenis kelamin tidak valid";
  return null;
}

exports.getAllSiswa = async (req, res) => {
  try {
    const siswa = await Siswa.findAll({ order: [["nama", "ASC"]] });
    const classMap = await getClassMap();

    res.json({
      success: true,
      message: "Data siswa berhasil diambil",
      data: siswa.map((item) => attachClass(item, classMap))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data siswa",
      error: error.message
    });
  }
};

exports.createSiswa = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const payload = buildSiswaPayload(req.body, req.file);
    const validationMessage = validateRequired(payload);
    if (validationMessage) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const kelas = await Kelas.findByPk(payload.kelas_id, { transaction });
    if (!kelas) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Kelas tidak valid atau tidak ditemukan" });
    }

    const reusableParentUser = await findReusableParentUserByPhone(payload.no_telepon, transaction);
    const studentEmail = normalizeEmail(req.body.student_email || payload.email || buildPortalEmail(payload.nisn, "siswa"));
    const parentEmail = reusableParentUser
      ? reusableParentUser.email
      : normalizeEmail(req.body.parent_email || req.body.orangtua_email || buildPortalEmail(payload.nisn, "orangtua"));
    if (!EMAIL_PATTERN.test(studentEmail) || (!reusableParentUser && !EMAIL_PATTERN.test(parentEmail))) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Format email akun siswa/orang tua tidak valid" });
    }

    const emails = reusableParentUser ? [studentEmail] : [studentEmail, parentEmail];
    if (new Set(emails).size !== emails.length) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Email akun siswa dan orang tua tidak boleh sama" });
    }

    const existingUsers = await User.findAll({ where: { email: { [Op.in]: emails } }, transaction });
    if (existingUsers.length) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(409).json({ success: false, message: `Email akun sudah terdaftar: ${existingUsers.map((user) => user.email).join(", ")}` });
    }

    if (reusableParentUser) payload.nama_ayah = reusableParentUser.name;

    const studentPassword = req.body.student_password || generatePassword("SISWA");
    const parentPassword = reusableParentUser ? null : req.body.parent_password || req.body.orangtua_password || generatePassword("ORTU");
    const siswa = await Siswa.create({ ...payload, email: studentEmail }, { transaction });

    const studentUser = await User.create({
      name: payload.nama,
      email: studentEmail,
      password: await bcrypt.hash(studentPassword, 10),
      role: "siswa",
      profession: `Siswa ${kelas.nama_kelas}`,
      must_change_password: true
    }, { transaction });

    let parentUser = reusableParentUser;
    if (!parentUser) {
      const parentName = req.body.nama_orangtua || req.body.orangtua_name || payload.nama_ayah || `Orang Tua ${payload.nama}`;
      parentUser = await User.create({
        name: parentName,
        email: parentEmail,
        password: await bcrypt.hash(parentPassword, 10),
        role: "orangtua",
        profession: [`Orang tua dari ${payload.nama}`, payload.no_telepon ? `No HP: ${payload.no_telepon}` : null].filter(Boolean).join(" | "),
        must_change_password: true
      }, { transaction });
    }

    await PortalAccountLink.bulkCreate([
      { user_id: studentUser.id, siswa_id: siswa.id, link_type: "siswa" },
      { user_id: parentUser.id, siswa_id: siswa.id, link_type: "orangtua" }
    ], { transaction });

    await logAudit(req, {
      action: "student.create",
      entityType: "student",
      entityId: siswa.id,
      metadata: {
        nisn: siswa.nisn,
        createdAccounts: reusableParentUser ? [studentUser.id] : [studentUser.id, parentUser.id],
        reusedParentAccount: Boolean(reusableParentUser),
        uploaded: Boolean(req.file)
      }
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: reusableParentUser
        ? "Data siswa dan akun siswa berhasil ditambahkan. Akun orang tua lama dipakai ulang."
        : "Data siswa serta akun siswa dan orang tua berhasil ditambahkan",
      data: attachClass(siswa, new Map([[Number(kelas.id), kelas.toJSON()]])),
      credentials: {
        siswa: { email: studentEmail, password: studentPassword },
        orangtua: { email: parentEmail, password: parentPassword, reused: Boolean(reusableParentUser) }
      }
    });
  } catch (error) {
    await transaction.rollback();
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data siswa",
      error: error.message
    });
  }
};

exports.updateSiswa = async (req, res) => {
  try {
    const { id } = req.params;
    const siswa = await Siswa.findByPk(id);

    if (!siswa) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(404).json({
        success: false,
        message: "Data siswa tidak ditemukan"
      });
    }

    const payload = buildSiswaPayload({ ...siswa.toJSON(), ...req.body }, req.file);
    const validationMessage = validateRequired(payload);
    if (validationMessage) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const kelas = await Kelas.findByPk(payload.kelas_id);
    if (!kelas) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Kelas tidak valid atau tidak ditemukan" });
    }

    const oldFoto = siswa.foto;
    await siswa.update(payload);
    if (req.file && oldFoto && oldFoto !== payload.foto) deleteLocalUpload(oldFoto);
    await logAudit(req, {
      action: "student.update",
      entityType: "student",
      entityId: siswa.id,
      metadata: { nisn: siswa.nisn, uploaded: Boolean(req.file) }
    });

    res.json({
      success: true,
      message: "Data siswa berhasil diperbarui",
      data: siswa
    });
  } catch (error) {
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data siswa",
      error: error.message
    });
  }
};

exports.deleteSiswa = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;
    const siswa = await Siswa.findByPk(id, { transaction });

    if (!siswa) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Data siswa tidak ditemukan"
      });
    }

    const links = await PortalAccountLink.findAll({ where: { siswa_id: siswa.id }, transaction });
    const studentUserIds = links
      .filter((link) => link.link_type === "siswa")
      .map((link) => link.user_id);
    const preservedParentLinks = links.filter((link) => link.link_type === "orangtua").length;
    const oldFoto = siswa.foto;

    await PortalAccountLink.destroy({ where: { siswa_id: siswa.id }, transaction });
    await siswa.destroy({ transaction });
    if (studentUserIds.length) await User.destroy({ where: { id: { [Op.in]: studentUserIds } }, transaction });

    await logAudit(req, {
      action: "student.delete",
      entityType: "student",
      entityId: id,
      metadata: { deletedStudentAccounts: studentUserIds.length, preservedParentLinks }
    }, { transaction });
    await transaction.commit();
    deleteLocalUpload(oldFoto);

    res.json({
      success: true,
      message: "Data siswa dan akun siswa berhasil dihapus. Akun orang tua tetap disimpan."
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data siswa",
      error: error.message
    });
  }
};
