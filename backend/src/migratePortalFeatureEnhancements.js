/**
 * ============================================================================
 * SKRIP MIGRASI: Peningkatan Fitur Portal
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini melakukan sejumlah penyesuaian skema untuk mendukung fitur portal
 * terbaru:
 *  - Memperluas ENUM kolom "peran" pada tabel "akun_pengguna" agar mencakup
 *    peran kepala_sekolah (selain admin, guru, siswa, orangtua).
 *  - Menambahkan kolom "status" (tampil/tidak_tampil) pada tabel "kegiatan" dan
 *    memperbesar tipe kolom gambarnya menjadi LONGTEXT.
 *  - Memperluas ENUM kolom "status" pada tabel "absensi_siswa" menjadi
 *    hadir/izin/sakit/alpha.
 *
 * KENAPA PERLU:
 * Penambahan peran, kontrol tampil/sembunyi kegiatan, dan opsi status absensi
 * merupakan kebutuhan fitur baru. Migrasi bersifat idempoten dan hanya
 * menyentuh tabel yang sudah ada.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH SKEMA DATABASE (ALTER TABLE). Jangan dijalankan tanpa
 * backup.
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
 * Menjalankan migrasi peningkatan fitur portal.
 *
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH SKEMA DATABASE — memperluas ENUM peran akun_pengguna,
 *   menambah kolom status & memperbesar kolom gambar pada kegiatan, serta
 *   memperluas ENUM status pada absensi_siswa. Hanya menyentuh tabel yang ada.
 */
async function migrate() {
  await sequelize.authenticate();

  // Perluas ENUM peran agar mendukung kepala_sekolah.
  if (await tableExists("akun_pengguna")) {
    console.log("Memperbarui enum akun_pengguna.peran");
    await sequelize.query("ALTER TABLE `akun_pengguna` MODIFY `peran` ENUM('admin','guru','siswa','orangtua','kepala_sekolah') NOT NULL DEFAULT 'siswa'");
  }

  // Tambahkan kontrol tampil/sembunyi kegiatan dan perbesar kolom gambar.
  if (await tableExists("kegiatan")) {
    await addColumnIfMissing("kegiatan", "status", {
      type: DataTypes.ENUM("tampil", "tidak_tampil"),
      allowNull: false,
      defaultValue: "tampil"
    });
    console.log("Memperbarui kolom kegiatan.gambar");
    await queryInterface.changeColumn("kegiatan", "gambar", { type: DataTypes.TEXT("long"), allowNull: true });
  }

  // Perluas pilihan status absensi siswa.
  if (await tableExists("absensi_siswa")) {
    console.log("Memperbarui kolom absensi_siswa.status");
    await sequelize.query("ALTER TABLE `absensi_siswa` MODIFY `status` ENUM('hadir','izin','sakit','alpha') NOT NULL");
  }

  console.log("Migrasi peningkatan fitur portal selesai");
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
