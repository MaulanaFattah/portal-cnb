const sequelize = require("../config/database");

const User = require("./User");
const Kegiatan = require("./Kegiatan");
const Pengumuman = require("./Pengumuman");
const Galeri = require("./Galeri");
const PPDB = require("./PPDB");
const Guru = require("./Guru");
const KepalaSekolah = require("./KepalaSekolah");
const Kelas = require("./Kelas");
const Siswa = require("./Siswa");
const ProfilSekolah = require("./ProfilSekolah");
const GuruProfile = require("./GuruProfile");
const JadwalMengajar = require("./JadwalMengajar");
const AbsensiSiswa = require("./AbsensiSiswa");
const PortalAccountLink = require("./PortalAccountLink");

const db = {};

db.sequelize = sequelize;

db.User = User(sequelize);
db.Kegiatan = Kegiatan(sequelize);
db.Pengumuman = Pengumuman(sequelize);
db.Galeri = Galeri(sequelize);
db.PPDB = PPDB(sequelize);
db.Guru = Guru(sequelize);
db.KepalaSekolah = KepalaSekolah(sequelize);
db.Kelas = Kelas(sequelize);
db.Siswa = Siswa(sequelize);
db.ProfilSekolah = ProfilSekolah(sequelize);
db.GuruProfile = GuruProfile(sequelize);
db.JadwalMengajar = JadwalMengajar(sequelize);
db.AbsensiSiswa = AbsensiSiswa(sequelize);
db.PortalAccountLink = PortalAccountLink(sequelize);

module.exports = db;
