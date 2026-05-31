const db = require("../models");

const User = db.User;

exports.dashboard = async (req, res) => {
  try {
    const totalGuru = await User.count({
      where: { role: "guru" }
    });

    const totalSiswa = await User.count({
      where: { role: "siswa" }
    });

    const totalAdmin = await User.count({
      where: { role: "admin" }
    });

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