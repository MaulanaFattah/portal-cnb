/**
 * ============================================================================
 * SKRIP MIGRASI: Menghapus Kolom jarak_ke_sekolah, transportasi,
 *                dan alamat_orang_tua dari tabel pendaftaran_ppdb
 * ============================================================================
 *
 * TUJUAN:
 * Atas permintaan mitra, field "Jarak ke Sekolah", "Transportasi", dan
 * "Alamat Orang Tua" dihapus dari formulir PPDB. Skrip ini membersihkan kolom
 * terkait dari basis data agar tidak lagi disimpan.
 *
 * SIFAT: Idempoten. Kolom hanya di-DROP bila masih ada.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH SKEMA DATABASE (ALTER TABLE DROP COLUMN) dan menghapus
 * data pada kolom tersebut secara permanen. Lakukan backup sebelum menjalankan.
 * ============================================================================
 */

require("dotenv").config();
const sequelize = require("./config/database");

const TABLE = "pendaftaran_ppdb";
const COLUMNS = ["jarak_ke_sekolah", "transportasi", "alamat_orang_tua"];

/**
 * Memeriksa apakah sebuah kolom ada pada tabel tertentu.
 * @param {string} table Nama tabel.
 * @param {string} column Nama kolom.
 * @returns {Promise<boolean>} true bila kolom ada.
 */
async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    { replacements: [table, column] }
  );
  return Number(rows[0].count) > 0;
}

/**
 * Menjalankan migrasi: drop kolom yang sudah tidak dipakai.
 * @returns {Promise<void>}
 */
async function migrate() {
  await sequelize.authenticate();
  for (const column of COLUMNS) {
    if (await columnExists(TABLE, column)) {
      await sequelize.query(`ALTER TABLE \`${TABLE}\` DROP COLUMN \`${column}\``);
      console.log(`Kolom ${column} dihapus dari ${TABLE}`);
    } else {
      console.log(`Kolom ${column} tidak ada di ${TABLE} (lewati)`);
    }
  }
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
