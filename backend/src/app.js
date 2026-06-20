const express = require("express");
const cors = require("cors");
const { uploadRoot } = require("./utils/uploadStorage");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const kegiatanRoutes = require("./routes/kegiatanRoutes");
const pengumumanRoutes = require("./routes/pengumumanRoutes");
const galeriRoutes = require("./routes/galeriRoutes");
const ppdbRoutes = require("./routes/ppdbRoutes");
const guruRoutes = require("./routes/guruRoutes");
const kepalaSekolahRoutes = require("./routes/kepalaSekolahRoutes");
const kelasRoutes = require("./routes/kelasRoutes");
const siswaRoutes = require("./routes/siswaRoutes");
const profilSekolahRoutes = require("./routes/profilSekolahRoutes");
const adminGuruPortalRoutes = require("./routes/adminGuruPortalRoutes");
const guruPortalRoutes = require("./routes/guruPortalRoutes");
const portalRoutes = require("./routes/portalRoutes");

const app = express();

const allowedOrigins = [
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.some((pattern) => pattern.test(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin tidak diizinkan oleh CORS"));
  },
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/uploads", express.static(uploadRoot));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend Portal Cipta Nusa Bakti berjalan"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/kegiatan", kegiatanRoutes);
app.use("/api/pengumuman", pengumumanRoutes);
app.use("/api/galeri", galeriRoutes);
app.use("/api/ppdb", ppdbRoutes);
app.use("/api/guru", guruRoutes);
app.use("/api/kepala-sekolah", kepalaSekolahRoutes);
app.use("/api/kelas", kelasRoutes);
app.use("/api/siswa", siswaRoutes);
app.use("/api/profil-sekolah", profilSekolahRoutes);
app.use("/api/admin-guru", adminGuruPortalRoutes);
app.use("/api/guru-portal", guruPortalRoutes);
app.use("/api/portal", portalRoutes);

module.exports = app;
