const jwt = require("jsonwebtoken");
const db = require("../models");

const User = db.User;

exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Token tidak ditemukan" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "User tidak valid" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token tidak valid" });
  }
};

exports.onlyAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Akses hanya untuk admin" });
  }

  next();
};

exports.onlyGuru = (req, res, next) => {
  if (req.user.role !== "guru") {
    return res.status(403).json({ success: false, message: "Akses hanya untuk guru" });
  }

  next();
};


exports.onlySiswa = (req, res, next) => {
  if (req.user.role !== "siswa") {
    return res.status(403).json({ success: false, message: "Akses hanya untuk siswa" });
  }

  next();
};

exports.onlyOrangTua = (req, res, next) => {
  if (req.user.role !== "orangtua") {
    return res.status(403).json({ success: false, message: "Akses hanya untuk orang tua" });
  }

  next();
};
