/**
 * ============================================================================
 * SKRIP MIGRASI: PPDB Revisi Berkas
 * ============================================================================
 *
 * TUJUAN:
 * Menyiapkan fitur "revisi berkas" pada PPDB:
 *  - Menambah nilai "revisi_berkas" pada ENUM kolom "status" tabel
 *    "pendaftaran_ppdb" (status baru: berkas tidak valid, perlu unggah ulang).
 *  - Menambah kolom "catatan_revisi" (alasan berkas tidak valid dari admin).
 *  - Menambah kolom "berkas_revisi" (daftar berkas yang diminta diperbaiki,
 *    disimpan sebagai JSON string array).
 *
 * KENAPA PERLU:
 * Memisahkan "ditolak final" dari "berkas perlu diperbaiki" sehingga calon
 * siswa yang berkasnya bermasalah dapat mengunggah ulang tanpa mendaftar dari
 * awal. Bersifat idempoten dan aman dijalankan berulang.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH SKEMA DATABASE (MODIFY/ALTER TABLE). Jangan dijalankan
 * tanpa backup.
 * ============================================================================
 */

require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("./config/database");

const queryInterface = sequelize.getQueryInterface();
const TABLE = "pendaftaran_ppdb";

/**
 * Memeriksa apakah sebuah kolom ada pada tabel tertentu.
 * @param {string} tableName Nama tabel.
 * @param {string} columnName Nama kolom.
 * @returns {Promise<boolean>} true bila kolom ada.
 */
async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    { replacements: [tableName, columnName] }
  );
  return Number(rows[0].count) > 0;
}

/**
 * Menambah kolom hanya bila belum ada (idempoten).
 * @param {string} columnName Nama kolom.
 * @param {object} definition Definisi kolom Sequelize.
 * @returns {Promise<void>}
 */
async function addColumnIfMissing(columnName, definition) {
  if (await columnExists(TABLE, columnName)) return;
  console.log(`Menambahkan kolom ${TABLE}.${columnName}`);
  await queryInterface.addColumn(TABLE, columnName, definition);
}

/**
 * Menjalankan migrasi: perluas ENUM status dan tambah kolom revisi.
 * @returns {Promise<void>} Efek samping: MENGUBAH SKEMA DATABASE.
 */
async function migrate() {
  await sequelize.authenticate();

  // Perluas ENUM status agar memuat "revisi_berkas" (idempoten: MODIFY menimpa definisi).
  console.log(`Memperbarui ENUM ${TABLE}.status (+revisi_berkas)`);
  await sequelize.query(
    "ALTER TABLE `pendaftaran_ppdb` MODIFY COLUMN `status` ENUM('pending','diterima','ditolak','revisi_berkas') NULL DEFAULT 'pending'"
  );

  await addColumnIfMissing("catatan_revisi", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing("berkas_revisi", { type: DataTypes.TEXT, allowNull: true });

  console.log("Migrasi PPDB revisi berkas selesai");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
