const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models");
const { logAudit } = require("../services/auditLogService");

const User = db.User;
const GuruProfile = db.GuruProfile;
const Kelas = db.Kelas;

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

exports.registerGuru = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      name,
      email,
      password,
      profession,
      teacher_type,
      subject,
      subjects,
      kelas_id,
      homeroom_classroom_id
    } = req.body;

    const isHomeroom = toBoolean(req.body.is_homeroom) || teacher_type === "wali_kelas";
    const subjectList = normalizeSubjects(subjects || subject || profession);
    const isSubjectTeacher = toBoolean(req.body.is_subject_teacher) || teacher_type === "mapel" || subjectList.length > 0;
    const homeroomClassroomId = Number(homeroom_classroom_id || kelas_id || 0);

    if (!name || !email || !password) {
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
      return res.status(400).json({ success: false, message: "Minimal satu mata pelajaran wajib diisi untuk guru mapel" });
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const teacherProfession = [
      isHomeroom ? "Wali Kelas" : null,
      isSubjectTeacher ? subjectList.join(", ") : null
    ].filter(Boolean).join(" + ");
    const legacyTeacherType = isSubjectTeacher ? "mapel" : "wali_kelas";

    const user = await User.create({
      name,
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
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: "Email, kata sandi, dan peran wajib diisi" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Email tidak ditemukan" });
    }

    if (user.role !== role) {
      return res.status(403).json({ success: false, message: "Peran tidak sesuai" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
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

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Kata sandi lama dan kata sandi baru wajib diisi" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "Kata sandi baru minimal 6 karakter" });
    }

    const user = await User.findByPk(req.user.id);
    const validCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validCurrentPassword) {
      return res.status(401).json({ success: false, message: "Kata sandi lama tidak sesuai" });
    }

    await user.update({
      password: await bcrypt.hash(newPassword, 10),
      must_change_password: false
    });

    await logAudit(req, { action: "password.change", entityType: "user_account", entityId: user.id });

    return res.json({ success: true, message: "Kata sandi berhasil diganti. Silakan masuk kembali." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengganti password", error: error.message });
  }
};
