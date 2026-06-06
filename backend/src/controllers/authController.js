const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models");

const User = db.User;
const GuruProfile = db.GuruProfile;

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

exports.registerGuru = async (req, res) => {
  try {
    const { name, email, password, profession, teacher_type, subject } = req.body;

    if (!name || !email || !password || !profession || !teacher_type) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, password, jabatan, dan tipe guru wajib diisi"
      });
    }

    if (!["wali_kelas", "mapel"].includes(teacher_type)) {
      return res.status(400).json({ success: false, message: "Tipe guru tidak valid" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email sudah terdaftar" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role: "guru", profession });

    const profile = await GuruProfile.create({
      user_id: user.id,
      teacher_type,
      subject: subject || profession,
      verification_status: "pending"
    });

    return res.status(201).json({
      success: true,
      message: "Registrasi guru berhasil. Akun menunggu verifikasi admin.",
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
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: "Email, password, dan role wajib diisi" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Email tidak ditemukan" });
    }

    if (user.role !== role) {
      return res.status(403).json({ success: false, message: "Role tidak sesuai" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: "Password salah" });
    }

    let guruProfile = null;
    if (user.role === "guru") {
      guruProfile = await GuruProfile.findOne({ where: { user_id: user.id } });

      if (!guruProfile || guruProfile.verification_status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Akun guru belum diverifikasi admin"
        });
      }
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profession: user.profession,
        guruProfile
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};
