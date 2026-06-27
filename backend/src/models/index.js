/**
 * Pusat inisialisasi ORM dan pendefinisian relasi antar tabel (models/index.js)
 * ----------------------------------------------------------------------------
 * Berkas ini:
 *  1) Mengimpor instance koneksi Sequelize dari config/database.
 *  2) Mengimpor seluruh definisi model (masing-masing berupa fungsi factory).
 *  3) Menginisialisasi setiap model dengan instance sequelize lalu menyimpannya
 *     ke objek `db` agar bisa dipakai di seluruh aplikasi.
 *  4) Mendefinisikan asosiasi/relasi antar model (hasMany/belongsTo/hasOne)
 *     beserta aturan onDelete/onUpdate-nya.
 *  5) Mengekspor objek `db` (berisi sequelize + semua model).
 */
const sequelize = require("../config/database");

// Impor fungsi factory tiap model (dipanggil dengan instance sequelize di bawah)
const User = require("./User");
const Kegiatan = require("./Kegiatan");
const Pengumuman = require("./Pengumuman");
const Galeri = require("./Galeri");
const Fasilitas = require("./Fasilitas");
const PPDB = require("./PPDB");
const Guru = require("./Guru");
const KepalaSekolah = require("./KepalaSekolah");
const Kelas = require("./Kelas");
const Siswa = require("./Siswa");
const RiwayatKelas = require("./RiwayatKelas");
const ProfilSekolah = require("./ProfilSekolah");
const GuruProfile = require("./GuruProfile");
const JadwalMengajar = require("./JadwalMengajar");
const AbsensiSiswa = require("./AbsensiSiswa");
const PortalAccountLink = require("./PortalAccountLink");
const AuditLog = require("./AuditLog");
const PasswordResetRequest = require("./PasswordResetRequest");

// Objek pusat yang menampung instance sequelize dan semua model yang sudah diinisialisasi
const db = {};

// Simpan instance koneksi agar bisa diakses (mis. untuk authenticate/sync/transaksi)
db.sequelize = sequelize;

// Inisialisasi setiap model dengan instance sequelize dan daftarkan ke objek db
db.User = User(sequelize);
db.Kegiatan = Kegiatan(sequelize);
db.Pengumuman = Pengumuman(sequelize);
db.Galeri = Galeri(sequelize);
db.Fasilitas = Fasilitas(sequelize);
db.PPDB = PPDB(sequelize);
db.Guru = Guru(sequelize);
db.KepalaSekolah = KepalaSekolah(sequelize);
db.Kelas = Kelas(sequelize);
db.Siswa = Siswa(sequelize);
db.RiwayatKelas = RiwayatKelas(sequelize);
db.ProfilSekolah = ProfilSekolah(sequelize);
db.GuruProfile = GuruProfile(sequelize);
db.JadwalMengajar = JadwalMengajar(sequelize);
db.AbsensiSiswa = AbsensiSiswa(sequelize);
db.PortalAccountLink = PortalAccountLink(sequelize);
db.AuditLog = AuditLog(sequelize);
db.PasswordResetRequest = PasswordResetRequest(sequelize);

// Opsi referensial yang dipakai ulang pada definisi relasi di bawah:
// - cascade: jika induk dihapus/diperbarui, baris anak ikut terhapus/terperbarui
// - setNull: jika induk dihapus, foreign key pada anak di-set NULL (data anak tetap ada)
const cascade = { onDelete: "CASCADE", onUpdate: "CASCADE" };
const setNull = { onDelete: "SET NULL", onUpdate: "CASCADE" };

// Relasi Kelas <-> Siswa: satu kelas memiliki banyak siswa; jika kelas dihapus,
// kelas_id pada siswa di-set NULL agar data siswa tidak ikut hilang.
db.Kelas.hasMany(db.Siswa, { foreignKey: "kelas_id", as: "students", ...setNull });
db.Siswa.belongsTo(db.Kelas, { foreignKey: "kelas_id", as: "kelas", ...setNull });

// Relasi Siswa <-> RiwayatKelas: satu siswa punya banyak riwayat perpindahan kelas;
// jika siswa dihapus, siswa_id pada riwayat di-set NULL agar histori tetap tersimpan.
db.Siswa.hasMany(db.RiwayatKelas, { foreignKey: "siswa_id", as: "riwayatKelas", ...setNull });
db.RiwayatKelas.belongsTo(db.Siswa, { foreignKey: "siswa_id", as: "siswa", ...setNull });

// Relasi User <-> GuruProfile (1-1): satu akun pengguna memiliki satu profil guru;
// jika akun dihapus, profil guru ikut terhapus (cascade).
db.User.hasOne(db.GuruProfile, { foreignKey: "user_id", as: "guruProfile", ...cascade });
db.GuruProfile.belongsTo(db.User, { foreignKey: "user_id", as: "user", ...cascade });
// Relasi User <-> GuruProfile via approved_by: mencatat akun (admin) yang menyetujui
// profil guru; jika akun penyetuju dihapus, kolom approved_by di-set NULL.
db.User.hasMany(db.GuruProfile, { foreignKey: "approved_by", as: "approvedGuruProfiles", ...setNull });
db.GuruProfile.belongsTo(db.User, { foreignKey: "approved_by", as: "approvedBy", ...setNull });
// Relasi Kelas <-> GuruProfile: satu kelas bisa menjadi kelas wali bagi beberapa profil guru;
// jika kelas dihapus, kelas_id pada profil guru di-set NULL.
db.Kelas.hasMany(db.GuruProfile, { foreignKey: "kelas_id", as: "homeroomProfiles", ...setNull });
db.GuruProfile.belongsTo(db.Kelas, { foreignKey: "kelas_id", as: "kelas", ...setNull });

// Relasi User(guru) <-> JadwalMengajar: satu guru memiliki banyak jadwal mengajar;
// jika akun guru dihapus, jadwalnya ikut terhapus (cascade).
db.User.hasMany(db.JadwalMengajar, { foreignKey: "guru_user_id", as: "teachingSchedules", ...cascade });
db.JadwalMengajar.belongsTo(db.User, { foreignKey: "guru_user_id", as: "guru", ...cascade });
// Relasi Kelas <-> JadwalMengajar: satu kelas memiliki banyak jadwal mengajar;
// jika kelas dihapus, jadwal terkait ikut terhapus (cascade).
db.Kelas.hasMany(db.JadwalMengajar, { foreignKey: "kelas_id", as: "teachingSchedules", ...cascade });
db.JadwalMengajar.belongsTo(db.Kelas, { foreignKey: "kelas_id", as: "kelas", ...cascade });

// Relasi Siswa <-> AbsensiSiswa: satu siswa punya banyak catatan absensi;
// jika siswa dihapus, absensinya ikut terhapus (cascade).
db.Siswa.hasMany(db.AbsensiSiswa, { foreignKey: "siswa_id", as: "attendances", ...cascade });
db.AbsensiSiswa.belongsTo(db.Siswa, { foreignKey: "siswa_id", as: "siswa", ...cascade });
// Relasi Kelas <-> AbsensiSiswa: satu kelas punya banyak catatan absensi;
// jika kelas dihapus, absensinya ikut terhapus (cascade).
db.Kelas.hasMany(db.AbsensiSiswa, { foreignKey: "kelas_id", as: "attendances", ...cascade });
db.AbsensiSiswa.belongsTo(db.Kelas, { foreignKey: "kelas_id", as: "kelas", ...cascade });
// Relasi User(guru) <-> AbsensiSiswa: satu guru membuat banyak catatan absensi;
// jika akun guru dihapus, catatan absensi yang dibuatnya ikut terhapus (cascade).
db.User.hasMany(db.AbsensiSiswa, { foreignKey: "guru_user_id", as: "attendanceRecords", ...cascade });
db.AbsensiSiswa.belongsTo(db.User, { foreignKey: "guru_user_id", as: "guru", ...cascade });
// Relasi JadwalMengajar <-> AbsensiSiswa: satu jadwal bisa mendasari banyak absensi;
// jika jadwal dihapus, jadwal_id pada absensi di-set NULL agar absensi tetap tersimpan.
db.JadwalMengajar.hasMany(db.AbsensiSiswa, { foreignKey: "jadwal_id", as: "attendances", ...setNull });
db.AbsensiSiswa.belongsTo(db.JadwalMengajar, { foreignKey: "jadwal_id", as: "jadwal", ...setNull });

// Relasi User <-> PortalAccountLink: satu akun bisa memiliki banyak tautan portal
// (mis. orang tua dengan beberapa anak); jika akun dihapus, tautannya ikut terhapus (cascade).
db.User.hasMany(db.PortalAccountLink, { foreignKey: "user_id", as: "portalLinks", ...cascade });
db.PortalAccountLink.belongsTo(db.User, { foreignKey: "user_id", as: "user", ...cascade });
// Relasi Siswa <-> PortalAccountLink: satu siswa bisa ditautkan ke banyak akun
// (mis. akun siswa sendiri dan akun orang tua); jika siswa dihapus, tautannya ikut terhapus (cascade).
db.Siswa.hasMany(db.PortalAccountLink, { foreignKey: "siswa_id", as: "portalLinks", ...cascade });
db.PortalAccountLink.belongsTo(db.Siswa, { foreignKey: "siswa_id", as: "siswa", ...cascade });
// Relasi User <-> AuditLog: satu akun (pelaku) bisa menghasilkan banyak entri log audit;
// jika akun pelaku dihapus, kolom pelaku pada log di-set NULL agar jejak audit tetap utuh.
db.User.hasMany(db.AuditLog, { foreignKey: "actor_user_account_id", as: "auditLogs", ...setNull });
db.AuditLog.belongsTo(db.User, { foreignKey: "actor_user_account_id", as: "actor", ...setNull });

// Relasi User <-> PasswordResetRequest via matched_user_id: akun yang dicocokkan dengan
// permintaan reset; jika akun dihapus, kolom pencocokan di-set NULL agar permintaan tetap ada.
db.User.hasMany(db.PasswordResetRequest, { foreignKey: "matched_user_id", as: "passwordResetRequests", ...setNull });
db.PasswordResetRequest.belongsTo(db.User, { foreignKey: "matched_user_id", as: "matchedUser", ...setNull });
// Relasi User <-> PasswordResetRequest via processed_by: admin yang memproses permintaan;
// jika akun pemroses dihapus, kolom pemroses di-set NULL agar permintaan tetap tersimpan.
db.User.hasMany(db.PasswordResetRequest, { foreignKey: "processed_by", as: "processedPasswordResetRequests", ...setNull });
db.PasswordResetRequest.belongsTo(db.User, { foreignKey: "processed_by", as: "processedBy", ...setNull });

// Relasi User <-> KepalaSekolah (1-1): satu akun pengguna dapat ditautkan ke satu data
// kepala sekolah; jika akun dihapus, user_id pada kepala sekolah di-set NULL agar datanya tetap ada.
db.User.hasOne(db.KepalaSekolah, { foreignKey: "user_id", as: "kepalaSekolahProfile", ...setNull });
db.KepalaSekolah.belongsTo(db.User, { foreignKey: "user_id", as: "user", ...setNull });

// Ekspor objek db agar seluruh aplikasi dapat mengakses model dan koneksi sequelize
module.exports = db;
