require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("./config/database");

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

async function changeColumnIfExists(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || !(await columnExists(tableName, columnName))) return;
  console.log(`Mengubah kolom ${tableName}.${columnName}`);
  await queryInterface.changeColumn(tableName, columnName, definition);
}

async function migrate() {
  await sequelize.authenticate();

  await addColumnIfMissing("pendaftaran_ppdb", "jenis_pendaftaran", {
    type: DataTypes.ENUM("pendaftaran_baru", "siswa_pindahan"),
    allowNull: false,
    defaultValue: "pendaftaran_baru"
  });
  await addColumnIfMissing("pendaftaran_ppdb", "target_jenjang", {
    type: DataTypes.ENUM("tk", "sd", "smp"),
    allowNull: false,
    defaultValue: "tk"
  });
  await addColumnIfMissing("pendaftaran_ppdb", "nama_orang_tua", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing("pendaftaran_ppdb", "berkas_kk", { type: DataTypes.TEXT("long"), allowNull: true });
  await addColumnIfMissing("pendaftaran_ppdb", "berkas_raport", { type: DataTypes.TEXT("long"), allowNull: true });
  await addColumnIfMissing("pendaftaran_ppdb", "foto_siswa", { type: DataTypes.TEXT("long"), allowNull: true });
  await addColumnIfMissing("pendaftaran_ppdb", "berkas_surat_pindah", { type: DataTypes.TEXT("long"), allowNull: true });
  await addColumnIfMissing("pendaftaran_ppdb", "catatan_notifikasi", { type: DataTypes.TEXT, allowNull: true });

  if (await tableExists("pendaftaran_ppdb")) {
    await sequelize.query("UPDATE pendaftaran_ppdb SET nama_orang_tua = COALESCE(nama_orang_tua, nama_ayah, nama_ibu, 'Orang Tua/Wali') WHERE nama_orang_tua IS NULL");
    await sequelize.query("UPDATE pendaftaran_ppdb SET email = CONCAT('orangtua-', id, '@example.local') WHERE email IS NULL OR email = ''");
  }

  await changeColumnIfExists("pendaftaran_ppdb", "nama_orang_tua", { type: DataTypes.STRING, allowNull: false });
  await changeColumnIfExists("pendaftaran_ppdb", "tempat_lahir", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("pendaftaran_ppdb", "agama", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("pendaftaran_ppdb", "nama_ayah", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("pendaftaran_ppdb", "nama_ibu", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("pendaftaran_ppdb", "email", { type: DataTypes.STRING, allowNull: false });

  await addColumnIfMissing("profil_sekolah", "fasilitas", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing("profil_sekolah", "struktur_sekolah", { type: DataTypes.TEXT, allowNull: true });
  await changeColumnIfExists("galeri", "gambar", { type: DataTypes.TEXT("long"), allowNull: false });

  console.log("Migrasi field penerimaan dan profil sekolah selesai");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
