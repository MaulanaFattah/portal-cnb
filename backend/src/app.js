const express = require("express");
const cors = require("cors");

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

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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

module.exports = app;
