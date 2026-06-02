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

module.exports = db;
