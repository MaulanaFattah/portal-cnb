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
    const isHomeroom = toBoolean(req.body.wali_kelas) || toBoolean(req.body.is_homeroom) || tipeGuru === "wali_kelas";
    const subjectList = normalizeSubjects(mata_pelajaran || subjects || subject || profession);
    const isSubjectTeacher = toBoolean(req.body.guru_mata_pelajaran) || toBoolean(req.body.is_subject_teacher) || tipeGuru === "mapel" || subjectList.length > 0;
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
