/**
 * ============================================================================
 * SKRIP MIGRASI: Akses Akun Kepala Sekolah
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini menambahkan dua kolom pada tabel "kepala_sekolah":
 *  - "akun_pengguna_id": relasi (foreign key) ke tabel "akun_pengguna" agar
 *    data kepala sekolah dapat ditautkan ke sebuah akun login portal.
 *  - "jenjang": ENUM 'sd'/'smp' untuk menandai jenjang yang dipimpin.
 *
 * KENAPA PERLU:
 * Fitur baru memungkinkan kepala sekolah login ke portal dan dibatasi sesuai
 * jenjangnya. Migrasi bersifat idempoten: kolom hanya ditambahkan bila belum
 * ada, sehingga aman dijalankan berulang.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH SKEMA DATABASE (ALTER TABLE ADD COLUMN + FK). Jangan
 * dijalankan tanpa backup.
 * ============================================================================
 */

require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("./config/database");

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
 * Menjalankan migrasi penambahan akses akun kepala sekolah.
 *
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH SKEMA DATABASE — menambahkan kolom akun_pengguna_id
 *   (dengan foreign key ke akun_pengguna, ON DELETE SET NULL) dan kolom jenjang.
 */
async function migrate() {
  await sequelize.authenticate();

  // Tautan opsional ke akun login; unik agar satu akun hanya untuk satu kepsek.
  await addColumnIfMissing("kepala_sekolah", "akun_pengguna_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
    references: { model: "akun_pengguna", key: "id" },
    onDelete: "SET NULL",
    onUpdate: "CASCADE"
  });

  // Jenjang yang dipimpin kepala sekolah (boleh NULL).
  await addColumnIfMissing("kepala_sekolah", "jenjang", {
    type: DataTypes.ENUM("sd", "smp"),
    allowNull: true
  });

  console.log("Migrasi akses kepala sekolah selesai");
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
