const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const db = require("../models");
const { logAudit } = require("../services/auditLogService");
const { getClientIp } = require("../middlewares/rateLimitMiddleware");

const User = db.User;
const GuruProfile = db.GuruProfile;
const Siswa = db.Siswa;
const Kelas = db.Kelas;
const PortalAccountLink = db.PortalAccountLink;
const PasswordResetRequest = db.PasswordResetRequest;
const RESET_REQUEST_ROLES = ["guru", "siswa", "orangtua", "kepala_sekolah"];
const RESET_REQUEST_MESSAGE = "Permintaan reset kata sandi berhasil dikirim. Silakan hubungi admin untuk meminta persetujuan dan kata sandi sementara.";
const PORTAL_EMAIL_DOMAIN = "ciptanusabakti.sch.id";

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

function normalizeSubjects(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function hasAnyOwn(object, keys) {
  return keys.some((key) => hasOwn(object, key));
}

function isHomeroomSubjectLabel(value) {
  const text = String(value || "").trim().toLowerCase();
  return ["wali kelas", "guru wali kelas", "guru"].includes(text);
}

function normalizeSubjectInput(value) {
  return normalizeSubjects(value)
    .flatMap((item) => String(item).split(/[;+]/).map((part) => part.trim()).filter(Boolean))
    .filter((item) => !isHomeroomSubjectLabel(item));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value, maxLength = 120) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.slice(0, maxLength);
}

function normalizePhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

function buildPortalEmail(nisn, type) {
  const cleanNisn = String(nisn || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${cleanNisn || "akun"}.${type}@${PORTAL_EMAIL_DOMAIN}`;
}

function normalizeResetRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return RESET_REQUEST_ROLES.includes(role) ? role : "";
}

async function getStudentClassName(siswa) {
  if (!siswa?.kelas_id) return null;
  const kelas = await Kelas.findByPk(siswa.kelas_id);
  return kelas?.nama_kelas || null;
}

async function findLinkedPortalUser(siswaId, role) {
  if (!PortalAccountLink || !siswaId) return null;

  const link = await PortalAccountLink.findOne({
    where: { siswa_id: siswaId, link_type: role },
    order: [["id", "ASC"]]
  });
  if (!link) return null;

  return User.findOne({ where: { id: link.user_id, role } });
}

async function findStudentResetIdentity(nisn) {
  const siswa = await Siswa.findOne({ where: { nisn } });
  const matchedUser = siswa ? await findLinkedPortalUser(siswa.id, "siswa") : null;
  const className = siswa ? await getStudentClassName(siswa) : null;

  return {
    role: "siswa",
    email: matchedUser?.email || siswa?.email || buildPortalEmail(nisn, "siswa"),
    name: siswa?.nama || `Siswa ${nisn}`,
    nisn,
    class_name: className,
    notes: siswa
      ? (matchedUser ? "Akun siswa cocok otomatis dari NISN." : "Data siswa ditemukan, tetapi akun portal siswa belum cocok otomatis.")
      : "NISN belum cocok dengan data siswa.",
    matched_user_id: matchedUser?.id || null,
    matched: Boolean(matchedUser)
  };
}

async function findParentResetIdentity(email, phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const matchedUserCandidate = await User.findOne({ where: { email, role: "orangtua" } });
  const fallback = {
    role: "orangtua",
    email,
    name: "Orang Tua",
    nisn: null,
    class_name: null,
    notes: "Akun orang tua belum cocok otomatis dari email dan nomor HP.",
    matched_user_id: null,
    matched: false
  };

  if (!matchedUserCandidate || !PortalAccountLink) return fallback;

  const links = await PortalAccountLink.findAll({
    where: { user_id: matchedUserCandidate.id, link_type: "orangtua" },
    order: [["id", "ASC"]]
  });
  const studentIds = links.map((link) => Number(link.siswa_id)).filter(Boolean);
  if (!studentIds.length) {
    return {
      ...fallback,
      name: matchedUserCandidate.name,
      notes: "Email orang tua ditemukan, tetapi belum ada siswa yang terhubung."
    };
  }

  const students = await Siswa.findAll({ where: { id: { [Op.in]: studentIds } }, order: [["nama", "ASC"]] });
  const matchedStudent = students.find((student) => normalizePhoneNumber(student.no_telepon) === normalizedPhone);
  if (!matchedStudent) {
    return {
      ...fallback,
      name: matchedUserCandidate.name,
      notes: "Email orang tua ditemukan, tetapi nomor HP tidak cocok dengan siswa yang terhubung."
    };
  }

  const relatedStudents = students.filter((student) => normalizePhoneNumber(student.no_telepon) === normalizedPhone);
  const className = await getStudentClassName(matchedStudent);

  return {
    role: "orangtua",
    email: matchedUserCandidate.email,
    name: matchedUserCandidate.name,
    nisn: matchedStudent.nisn || null,
    class_name: className,
    notes: relatedStudents.length > 1
      ? `Akun orang tua cocok otomatis dan terhubung ke ${relatedStudents.length} siswa dengan nomor HP yang sama.`
      : "Akun orang tua cocok otomatis dari email dan nomor HP.",
    matched_user_id: matchedUserCandidate.id,
    matched: true
  };
}

async function findGuruResetIdentity(email) {
  const matchedUser = await User.findOne({ where: { email, role: "guru" } });
  return {
    role: "guru",
    email,
    name: matchedUser?.name || "Guru",
    nisn: null,
    class_name: null,
    notes: matchedUser ? "Akun guru cocok otomatis dari email." : "Email guru belum cocok dengan akun guru.",
    matched_user_id: matchedUser?.id || null,
    matched: Boolean(matchedUser)
  };
}

async function findKepalaSekolahResetIdentity(email) {
  const matchedUser = await User.findOne({ where: { email, role: "kepala_sekolah" } });
  return {
    role: "kepala_sekolah",
    email,
    name: matchedUser?.name || "Kepala Sekolah",
    nisn: null,
    class_name: null,
    notes: matchedUser ? "Akun kepala sekolah cocok otomatis dari email." : "Email kepala sekolah belum cocok dengan akun kepala sekolah.",
    matched_user_id: matchedUser?.id || null,
    matched: Boolean(matchedUser)
  };
}

exports.registerGuru = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      name,
      nama,
      email,
      password,
      kata_sandi,
      profession,
      teacher_type,
      tipe_guru,
      subject,
      subjects,
      mata_pelajaran,
      kelas_id,
      kelas_wali_id,
      homeroom_classroom_id
    } = req.body;

    const namaGuru = nama || name;
    const kataSandi = kata_sandi || password;
    const tipeGuru = tipe_guru || teacher_type;
    const explicitHomeroom = hasAnyOwn(req.body, ["wali_kelas", "is_homeroom"]);
    const explicitSubjectTeacher = hasAnyOwn(req.body, ["guru_mata_pelajaran", "is_subject_teacher"]);
    const isHomeroom = explicitHomeroom
      ? (toBoolean(req.body.wali_kelas) || toBoolean(req.body.is_homeroom))
      : tipeGuru === "wali_kelas";
    const subjectList = normalizeSubjectInput(mata_pelajaran ?? subjects ?? subject);
    const isSubjectTeacher = explicitSubjectTeacher
      ? (toBoolean(req.body.guru_mata_pelajaran) || toBoolean(req.body.is_subject_teacher))
      : (tipeGuru === "mapel" || subjectList.length > 0);
    const homeroomClassroomId = Number(kelas_wali_id || homeroom_classroom_id || kelas_id || 0);

    if (!namaGuru || !email || !kataSandi) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan kata sandi wajib diisi"
      });
    }

    if (!isHomeroom && !isSubjectTeacher) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Pilih minimal satu peran guru" });
    }

    if (isHomeroom && !homeroomClassroomId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Kelas wajib dipilih untuk guru wali kelas" });
    }

    if (isSubjectTeacher && !subjectList.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Minimal satu mata pelajaran wajib diisi untuk guru mata pelajaran" });
    }

    if (isHomeroom) {
      const kelas = await Kelas.findByPk(homeroomClassroomId, { transaction });
      if (!kelas) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Kelas wali tidak ditemukan" });
      }
    }

    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "Email sudah terdaftar" });
    }

    const hashedPassword = await bcrypt.hash(kataSandi, 10);
    const teacherProfession = [
      isHomeroom ? "Wali Kelas" : null,
      isSubjectTeacher ? subjectList.join(", ") : null
    ].filter(Boolean).join(" + ");
    const legacyTeacherType = isSubjectTeacher ? "mapel" : "wali_kelas";

    const user = await User.create({
      name: namaGuru,
      email,
      password: hashedPassword,
      role: "guru",
      profession: teacherProfession || profession || "Guru"
    }, { transaction });

    const profile = await GuruProfile.create({
      user_id: user.id,
      teacher_type: legacyTeacherType,
      subject: isSubjectTeacher ? subjectList.join(", ") : null,
      is_homeroom: isHomeroom,
      kelas_id: isHomeroom ? homeroomClassroomId : null,
      verification_status: "pending"
    }, { transaction });

    await logAudit(req, {
      action: "teacher.register",
      entityType: "teacher_profile",
      entityId: profile.id,
      metadata: { userId: user.id, isHomeroom, subjects: subjectList }
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Registrasi guru berhasil. Akun menunggu verifikasi administrator.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profession: user.profession,
        guruProfile: profile
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, kata_sandi, role, peran } = req.body;
    const kataSandi = kata_sandi || password;
    const peranAkun = peran || role;

    if (!email || !kataSandi || !peranAkun) {
      return res.status(400).json({ success: false, message: "Email, kata sandi, dan peran wajib diisi" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Email tidak ditemukan" });
    }

    if (user.role !== peranAkun) {
      return res.status(403).json({ success: false, message: "Peran tidak sesuai" });
    }

    const isValidPassword = await bcrypt.compare(kataSandi, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: "Kata sandi salah" });
    }

    let guruProfile = null;
    if (user.role === "guru") {
      guruProfile = await GuruProfile.findOne({ where: { user_id: user.id } });

      if (!guruProfile || guruProfile.verification_status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Akun guru belum diverifikasi administrator"
        });
      }
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Berhasil masuk",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profession: user.profession,
        must_change_password: Boolean(user.must_change_password),
        guruProfile
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const role = normalizeResetRole(req.body.peran || req.body.role);
    const email = normalizeEmail(req.body.email);
    const nisn = normalizeText(req.body.nisn, 40);
    const phone = normalizeText(req.body.no_telepon || req.body.nomor_hp || req.body.phone, 40);

    if (!role) {
      return res.status(400).json({ success: false, message: "Pilih jenis akun reset password" });
    }

    let identity = null;
    if (role === "siswa") {
      if (!nisn) return res.status(400).json({ success: false, message: "NISN siswa wajib diisi" });
      identity = await findStudentResetIdentity(nisn);
    }

    if (role === "orangtua") {
      if (!email || !phone) {
        return res.status(400).json({ success: false, message: "Email dan nomor HP orang tua wajib diisi" });
      }
      identity = await findParentResetIdentity(email, phone);
    }

    if (role === "guru") {
      if (!email) return res.status(400).json({ success: false, message: "Email guru wajib diisi" });
      identity = await findGuruResetIdentity(email);
    }

    if (role === "kepala_sekolah") {
      if (!email) return res.status(400).json({ success: false, message: "Email kepala sekolah wajib diisi" });
      identity = await findKepalaSekolahResetIdentity(email);
    }

    const payload = {
      role: identity.role,
      email: identity.email,
      name: identity.name,
      nisn: identity.nisn || null,
      class_name: identity.class_name || null,
      notes: identity.notes || null,
      matched_user_id: identity.matched_user_id || null,
      ip_address: getClientIp(req),
      user_agent: req.headers?.["user-agent"] || null
    };

    const existingRequest = await PasswordResetRequest.findOne({
      where: { role: payload.role, email: payload.email, status: "pending" },
      order: [["createdAt", "DESC"]]
    });

    const request = existingRequest
      ? await existingRequest.update(payload)
      : await PasswordResetRequest.create(payload);

    await logAudit(req, {
      action: "password.reset.request",
      entityType: "password_reset_request",
      entityId: request.id,
      metadata: { role: payload.role, matched: identity.matched }
    });

    return res.status(202).json({ success: true, message: RESET_REQUEST_MESSAGE });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengirim permintaan reset kata sandi" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, kata_sandi_lama, kata_sandi_baru } = req.body;
    const kataSandiLama = kata_sandi_lama || currentPassword;
    const kataSandiBaru = kata_sandi_baru || newPassword;

    if (!kataSandiLama || !kataSandiBaru) {
      return res.status(400).json({ success: false, message: "Kata sandi lama dan kata sandi baru wajib diisi" });
    }

    if (String(kataSandiBaru).length < 6) {
      return res.status(400).json({ success: false, message: "Kata sandi baru minimal 6 karakter" });
    }

    const user = await User.findByPk(req.user.id);
    const validCurrentPassword = await bcrypt.compare(kataSandiLama, user.password);
    if (!validCurrentPassword) {
      return res.status(401).json({ success: false, message: "Kata sandi lama tidak sesuai" });
    }

    await user.update({
      password: await bcrypt.hash(kataSandiBaru, 10),
      must_change_password: false
    });

    await logAudit(req, { action: "password.change", entityType: "user_account", entityId: user.id });

    return res.json({ success: true, message: "Kata sandi berhasil diganti. Silakan masuk kembali." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengganti kata sandi", error: error.message });
  }
};

