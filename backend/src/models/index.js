const sequelize = require("../config/database");

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
const ProfilSekolah = require("./ProfilSekolah");
const GuruProfile = require("./GuruProfile");
const JadwalMengajar = require("./JadwalMengajar");
const AbsensiSiswa = require("./AbsensiSiswa");
const PortalAccountLink = require("./PortalAccountLink");
const AuditLog = require("./AuditLog");
const PasswordResetRequest = require("./PasswordResetRequest");

const db = {};

db.sequelize = sequelize;

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
db.ProfilSekolah = ProfilSekolah(sequelize);
db.GuruProfile = GuruProfile(sequelize);
db.JadwalMengajar = JadwalMengajar(sequelize);
db.AbsensiSiswa = AbsensiSiswa(sequelize);
db.PortalAccountLink = PortalAccountLink(sequelize);
db.AuditLog = AuditLog(sequelize);
db.PasswordResetRequest = PasswordResetRequest(sequelize);

const cascade = { onDelete: "CASCADE", onUpdate: "CASCADE" };
const setNull = { onDelete: "SET NULL", onUpdate: "CASCADE" };

db.Kelas.hasMany(db.Siswa, { foreignKey: "kelas_id", as: "students", ...setNull });
db.Siswa.belongsTo(db.Kelas, { foreignKey: "kelas_id", as: "kelas", ...setNull });

db.User.hasOne(db.GuruProfile, { foreignKey: "user_id", as: "guruProfile", ...cascade });
db.GuruProfile.belongsTo(db.User, { foreignKey: "user_id", as: "user", ...cascade });
db.User.hasMany(db.GuruProfile, { foreignKey: "approved_by", as: "approvedGuruProfiles", ...setNull });
db.GuruProfile.belongsTo(db.User, { foreignKey: "approved_by", as: "approvedBy", ...setNull });
db.Kelas.hasMany(db.GuruProfile, { foreignKey: "kelas_id", as: "homeroomProfiles", ...setNull });
db.GuruProfile.belongsTo(db.Kelas, { foreignKey: "kelas_id", as: "kelas", ...setNull });

db.User.hasMany(db.JadwalMengajar, { foreignKey: "guru_user_id", as: "teachingSchedules", ...cascade });
db.JadwalMengajar.belongsTo(db.User, { foreignKey: "guru_user_id", as: "guru", ...cascade });
db.Kelas.hasMany(db.JadwalMengajar, { foreignKey: "kelas_id", as: "teachingSchedules", ...cascade });
db.JadwalMengajar.belongsTo(db.Kelas, { foreignKey: "kelas_id", as: "kelas", ...cascade });

db.Siswa.hasMany(db.AbsensiSiswa, { foreignKey: "siswa_id", as: "attendances", ...cascade });
db.AbsensiSiswa.belongsTo(db.Siswa, { foreignKey: "siswa_id", as: "siswa", ...cascade });
db.Kelas.hasMany(db.AbsensiSiswa, { foreignKey: "kelas_id", as: "attendances", ...cascade });
db.AbsensiSiswa.belongsTo(db.Kelas, { foreignKey: "kelas_id", as: "kelas", ...cascade });
db.User.hasMany(db.AbsensiSiswa, { foreignKey: "guru_user_id", as: "attendanceRecords", ...cascade });
db.AbsensiSiswa.belongsTo(db.User, { foreignKey: "guru_user_id", as: "guru", ...cascade });
db.JadwalMengajar.hasMany(db.AbsensiSiswa, { foreignKey: "jadwal_id", as: "attendances", ...setNull });
db.AbsensiSiswa.belongsTo(db.JadwalMengajar, { foreignKey: "jadwal_id", as: "jadwal", ...setNull });

db.User.hasMany(db.PortalAccountLink, { foreignKey: "user_id", as: "portalLinks", ...cascade });
db.PortalAccountLink.belongsTo(db.User, { foreignKey: "user_id", as: "user", ...cascade });
db.Siswa.hasMany(db.PortalAccountLink, { foreignKey: "siswa_id", as: "portalLinks", ...cascade });
db.PortalAccountLink.belongsTo(db.Siswa, { foreignKey: "siswa_id", as: "siswa", ...cascade });
db.User.hasMany(db.AuditLog, { foreignKey: "actor_user_account_id", as: "auditLogs", ...setNull });
db.AuditLog.belongsTo(db.User, { foreignKey: "actor_user_account_id", as: "actor", ...setNull });

db.User.hasMany(db.PasswordResetRequest, { foreignKey: "matched_user_id", as: "passwordResetRequests", ...setNull });
db.PasswordResetRequest.belongsTo(db.User, { foreignKey: "matched_user_id", as: "matchedUser", ...setNull });
db.User.hasMany(db.PasswordResetRequest, { foreignKey: "processed_by", as: "processedPasswordResetRequests", ...setNull });
db.PasswordResetRequest.belongsTo(db.User, { foreignKey: "processed_by", as: "processedBy", ...setNull });

db.User.hasOne(db.KepalaSekolah, { foreignKey: "user_id", as: "kepalaSekolahProfile", ...setNull });
db.KepalaSekolah.belongsTo(db.User, { foreignKey: "user_id", as: "user", ...setNull });

module.exports = db;
