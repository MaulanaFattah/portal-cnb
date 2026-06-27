/**
 * ============================================================================
 * SKRIP MIGRASI: Revisi RBAC & Absensi
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini menyiapkan kebutuhan revisi kontrol akses berbasis peran (RBAC) dan
 * fitur absensi:
 *  - Menambahkan kolom "wajib_ganti_kata_sandi" pada tabel "akun_pengguna"
 *    (memaksa ganti kata sandi setelah login pertama / reset).
 *  - Menambahkan kolom boolean "wali_kelas" pada tabel "profil_guru".
 *  - Membuat tabel "log_audit" bila belum ada (untuk mencatat jejak audit aksi).
 *  - Mengisi ulang nilai "wali_kelas" pada profil guru lama berdasarkan kolom
 *    "tipe_guru" warisan.
 *
 * KENAPA PERLU:
 * Migrasi ini menyelaraskan struktur data dengan model RBAC baru dan kebutuhan
 * pencatatan audit. Bersifat idempoten dan aman dijalankan berulang.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH SKEMA & DATA DATABASE (ALTER/CREATE TABLE + UPDATE) serta
 * memastikan folder upload tersedia. Jangan dijalankan tanpa backup.
 * ============================================================================
 */

require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("./config/database");
const { ensureUploadFolders } = require("./utils/uploadStorage");

// QueryInterface Sequelize untuk operasi skema tingkat rendah (DDL).
const queryInterface = sequelize.getQueryInterface();

/**
 * Memeriksa apakah sebuah tabel ada di database yang sedang aktif.
 *
 * @param {string} tableName Nama tabel yang diperiksa.
 * @returns {Promise<boolean>} true jika tabel ada, false jika tidak.
 * Efek samping: hanya membaca information_schema (tidak mengubah data).
 */
async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    { replacements: [tableName] }
  );
  return Number(rows[0].count) > 0;
}

/**
 * Memeriksa apakah sebuah kolom ada pada tabel tertentu.
 *
 * @param {string} tableName Nama tabel yang diperiksa.
 * @param {string} columnName Nama kolom yang dicari.
 * @returns {Promise<boolean>} true jika kolom ada, false jika tidak.
 * Efek samping: hanya membaca information_schema (tidak mengubah data).
 */
async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    { replacements: [tableName, columnName] }
  );
  return Number(rows[0].count) > 0;
}

/**
 * Menambahkan kolom hanya bila tabel ada DAN kolom belum ada (idempoten).
 *
 * @param {string} tableName Nama tabel target.
 * @param {string} columnName Nama kolom yang akan ditambahkan.
 * @param {object} definition Definisi kolom Sequelize (tipe, allowNull, dll).
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH SKEMA (ALTER TABLE ADD COLUMN) bila kondisi terpenuhi.
 */
async function addColumnIfMissing(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || await columnExists(tableName, columnName)) return;
  console.log(`Menambahkan kolom ${tableName}.${columnName}`);
  await queryInterface.addColumn(tableName, columnName, definition);
}

/**
 * Membuat tabel "log_audit" bila belum ada untuk menyimpan jejak audit aksi.
 *
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH SKEMA (CREATE TABLE) bila tabel belum ada. Tidak
 *   melakukan apa pun jika tabel sudah ada.
 */
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

/**
 * Mengisi ulang nilai kolom "wali_kelas" pada profil_guru lama berdasarkan
 * kolom warisan "tipe_guru". Guru bertipe 'wali_kelas' diberi nilai 1, sisanya
 * yang masih NULL disetel 0.
 *
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH DATA (UPDATE) pada tabel profil_guru. Tidak berjalan
 *   bila tabel profil_guru atau kolom wali_kelas tidak ada.
 */
async function migrateLegacyTeacherProfiles() {
  if (!(await tableExists("profil_guru")) || !(await columnExists("profil_guru", "wali_kelas"))) return;

  console.log("Mengisi ulang profil_guru.wali_kelas dari tipe_guru lama");
  await sequelize.query("UPDATE `profil_guru` SET `wali_kelas` = 1 WHERE `tipe_guru` = 'wali_kelas'");
  await sequelize.query("UPDATE `profil_guru` SET `wali_kelas` = 0 WHERE `wali_kelas` IS NULL");
}

/**
 * Menjalankan keseluruhan proses migrasi revisi RBAC & absensi.
 *
 * @returns {Promise<void>}
 * Efek samping: memastikan folder upload tersedia, lalu MENGUBAH SKEMA & DATA
 *   DATABASE — menambah kolom wajib_ganti_kata_sandi & wali_kelas, membuat
 *   tabel log_audit, dan mengisi ulang nilai wali_kelas dari data lama.
 */
async function migrate() {
  // Pastikan folder penyimpanan upload tersedia sebelum migrasi data.
  ensureUploadFolders();
  await sequelize.authenticate();

  // Kolom untuk memaksa pengguna mengganti kata sandi (mis. setelah reset).
  await addColumnIfMissing("akun_pengguna", "wajib_ganti_kata_sandi", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  // Penanda apakah guru berperan sebagai wali kelas.
  await addColumnIfMissing("profil_guru", "wali_kelas", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  // Siapkan tabel audit, lalu selaraskan data wali_kelas dari skema lama.
  await createAuditLog();
  await migrateLegacyTeacherProfiles();

  console.log("Migrasi revisi RBAC absensi selesai");
}

// Jalankan migrasi; cetak error (jika ada) lalu pastikan koneksi DB ditutup.
migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
