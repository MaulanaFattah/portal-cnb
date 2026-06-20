require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("./config/database");
const { ensureUploadFolders } = require("./utils/uploadStorage");

const queryInterface = sequelize.getQueryInterface();

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    { replacements: [tableName] }
  );
  return Number(rows[0].count) > 0;
}

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    { replacements: [tableName, columnName] }
  );
  return Number(rows[0].count) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || await columnExists(tableName, columnName)) return;
  console.log(`Menambahkan kolom ${tableName}.${columnName}`);
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function createAuditLog() {
  if (await tableExists("log_audit")) return;

  console.log("Membuat tabel log_audit");
  await queryInterface.createTable("log_audit", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pelaku_akun_pengguna_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "akun_pengguna", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    aksi: { type: DataTypes.STRING, allowNull: false },
    jenis_entitas: { type: DataTypes.STRING, allowNull: false },
    entitas_id: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.TEXT, allowNull: true },
    alamat_ip: { type: DataTypes.STRING, allowNull: true },
    agen_pengguna: { type: DataTypes.TEXT, allowNull: true },
    dibuat_pada: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
    }
  });
}

async function migrateLegacyTeacherProfiles() {
  if (!(await tableExists("profil_guru")) || !(await columnExists("profil_guru", "wali_kelas"))) return;

  console.log("Mengisi ulang profil_guru.wali_kelas dari tipe_guru lama");
  await sequelize.query("UPDATE `profil_guru` SET `wali_kelas` = 1 WHERE `tipe_guru` = 'wali_kelas'");
  await sequelize.query("UPDATE `profil_guru` SET `wali_kelas` = 0 WHERE `wali_kelas` IS NULL");
}

async function migrate() {
  ensureUploadFolders();
  await sequelize.authenticate();

  await addColumnIfMissing("akun_pengguna", "wajib_ganti_kata_sandi", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  await addColumnIfMissing("profil_guru", "wali_kelas", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  await createAuditLog();
  await migrateLegacyTeacherProfiles();

  console.log("Migrasi revisi RBAC absensi selesai");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
