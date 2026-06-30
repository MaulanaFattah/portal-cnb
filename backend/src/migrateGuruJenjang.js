/**
 * ============================================================================
 * SKRIP MIGRASI: Penambahan Kolom "jenjang" pada Profil Guru
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini menambahkan kolom "jenjang" (ENUM 'sd'/'smp') pada tabel
 * "profil_guru". Kolom ini menandai pada jenjang mana seorang guru mengajar.
 *
 * KENAPA PERLU:
 * Aplikasi perlu membedakan guru jenjang SD dan SMP untuk keperluan
 * pengelompokan, hak akses, dan pelaporan. Migrasi bersifat idempoten: bila
 * kolom sudah ada, skrip berhenti tanpa melakukan perubahan.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH SKEMA DATABASE (ALTER TABLE ADD COLUMN). Jangan
 * dijalankan tanpa backup.
 * ============================================================================
 */

require("dotenv").config();
const sequelize = require("./config/database");

/**
 * Memeriksa apakah sebuah kolom ada pada tabel tertentu.
 *
 * @param {string} table Nama tabel yang diperiksa.
 * @param {string} column Nama kolom yang dicari.
 * @returns {Promise<boolean>} true jika kolom ada, false jika tidak.
 * Efek samping: hanya membaca information_schema (tidak mengubah data).
 */
async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    { replacements: [table, column] }
  );
  return Number(rows[0].count) > 0;
}

/**
 * Menjalankan migrasi penambahan kolom "jenjang" pada tabel profil_guru.
 *
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH SKEMA DATABASE — menambahkan kolom ENUM 'sd'/'smp'
 *   setelah kolom mata_pelajaran. Tidak melakukan apa pun jika kolom sudah ada.
 */
async function migrate() {
  await sequelize.authenticate();

  // Idempoten untuk tabel profil_guru.
  if (await columnExists("profil_guru", "jenjang")) {
    console.log("Kolom jenjang sudah ada di profil_guru");
  } else {
    await sequelize.query(
      "ALTER TABLE `profil_guru` ADD COLUMN `jenjang` ENUM('sd','smp') NULL AFTER `mata_pelajaran`"
    );
    console.log("Kolom jenjang berhasil ditambahkan ke profil_guru");
  }

  // Idempoten untuk tabel master guru.
  if (await columnExists("guru", "jenjang")) {
    console.log("Kolom jenjang sudah ada di guru");
  } else {
    await sequelize.query(
      "ALTER TABLE `guru` ADD COLUMN `jenjang` ENUM('sd','smp') NULL AFTER `jabatan`"
    );
    console.log("Kolom jenjang berhasil ditambahkan ke guru");
  }
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
