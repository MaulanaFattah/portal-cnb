const bcrypt = require("bcryptjs");
const db = require("../models");

const User = db.User;

const SAFE_ATTRS = ["id", "name", "email", "role", "profession", "createdAt", "updatedAt"];

exports.dashboard = async (req, res) => {
  try {
    const totalGuru = await User.count({ where: { role: "guru" } });
    const totalSiswa = await User.count({ where: { role: "siswa" } });
    const totalAdmin = await User.count({ where: { role: "admin" } });

    return res.json({
      success: true,
      message: "Dashboard admin berhasil diambil",
      data: {
        admin: req.user.name,
        totalGuru,
        totalSiswa,
        totalAdmin,
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

    return res.json({
      success: true,
      message: "Data user berhasil diambil",
      data: users
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
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan password wajib diisi"
      });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "siswa"
    });

    return res.status(201).json({
      success: true,
      message: "User berhasil ditambahkan",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
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
    const { name, email, password, role } = req.body;

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

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    await user.update(updateData);

    return res.json({
      success: true,
      message: "User berhasil diperbarui",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
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
