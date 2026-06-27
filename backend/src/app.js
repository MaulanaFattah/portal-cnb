// Entry point konfigurasi aplikasi Express (app.js)
// Berkas ini membangun instance Express, memasang middleware global (CORS,
// parser body, static file), dan mendaftarkan seluruh rute API. Instance app
// yang dihasilkan diekspor untuk dijalankan oleh server.js.

const express = require("express");
const cors = require("cors");
// Direktori root tempat menyimpan/menyajikan berkas yang diunggah (uploads)
const { uploadRoot } = require("./utils/uploadStorage");

// Impor seluruh modul rute (router) per fitur untuk didaftarkan ke aplikasi
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const kegiatanRoutes = require("./routes/kegiatanRoutes");
const pengumumanRoutes = require("./routes/pengumumanRoutes");
const galeriRoutes = require("./routes/galeriRoutes");
const fasilitasRoutes = require("./routes/fasilitasRoutes");
const ppdbRoutes = require("./routes/ppdbRoutes");
const guruRoutes = require("./routes/guruRoutes");
const kepalaSekolahRoutes = require("./routes/kepalaSekolahRoutes");
const kelasRoutes = require("./routes/kelasRoutes");
const siswaRoutes = require("./routes/siswaRoutes");
const profilSekolahRoutes = require("./routes/profilSekolahRoutes");
const adminGuruPortalRoutes = require("./routes/adminGuruPortalRoutes");
const guruPortalRoutes = require("./routes/guruPortalRoutes");
const portalRoutes = require("./routes/portalRoutes");

// Buat instance aplikasi Express
const app = express();

// Daftar pola origin (regex) yang diizinkan mengakses API lewat CORS.
// Mencakup localhost, alamat IP jaringan lokal (10.x, 192.168.x, 172.16-31.x),
// serta domain resmi sekolah (ciptanusabakti.sch.id).
const allowedOrigins = [
  /^http:\/\/localhost(?::\d+)?$/,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
  /^https?:\/\/(www\.)?ciptanusabakti\.sch\.id$/,
];

// Pasang middleware CORS dengan validasi origin dinamis.
// Mengizinkan permintaan tanpa origin (mis. tools/cURL) atau yang cocok dengan
// salah satu pola di allowedOrigins; selain itu permintaan ditolak.
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

// Parser body JSON dengan batas ukuran 50mb (mendukung payload base64 berkas)
app.use(express.json({ limit: "50mb" }));
// Parser body form URL-encoded dengan batas ukuran 50mb
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
// Sajikan berkas yang diunggah secara statis di endpoint "/uploads"
app.use("/uploads", express.static(uploadRoot));

// Endpoint root sederhana untuk health-check / memastikan backend berjalan
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend Portal Cipta Nusa Bakti berjalan"
  });
});

// Pendaftaran rute API berdasarkan prefiks path per fitur
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/kegiatan", kegiatanRoutes);
app.use("/api/pengumuman", pengumumanRoutes);
app.use("/api/galeri", galeriRoutes);
app.use("/api/fasilitas", fasilitasRoutes);
app.use("/api/ppdb", ppdbRoutes);
app.use("/api/guru", guruRoutes);
app.use("/api/kepala-sekolah", kepalaSekolahRoutes);
app.use("/api/kelas", kelasRoutes);
app.use("/api/siswa", siswaRoutes);
app.use("/api/profil-sekolah", profilSekolahRoutes);
app.use("/api/admin-guru", adminGuruPortalRoutes);
app.use("/api/guru-portal", guruPortalRoutes);
app.use("/api/portal", portalRoutes);

// Ekspor instance app agar dapat dijalankan oleh server.js
module.exports = app;
