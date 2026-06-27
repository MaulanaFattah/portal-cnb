/**
 * ============================================================================
 * SKRIP MIGRASI: Penambahan Field Profil Penerimaan (PPDB) & Profil Sekolah
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini menyesuaikan struktur tabel database agar mendukung fitur
 * penerimaan peserta didik baru (PPDB) yang lebih lengkap serta profil sekolah.
 * Secara spesifik skrip menambahkan kolom-kolom baru pada tabel
 * "pendaftaran_ppdb" (jenis pendaftaran, jenjang target, data orang tua, berkas
 * dokumen, dll), mengisi nilai default untuk data lama, lalu memperketat aturan
 * NOT NULL pada kolom tertentu. Skrip juga menambahkan kolom pada tabel
 * "profil_sekolah" dan menyesuaikan tipe kolom gambar pada tabel "galeri".
 *
 * KENAPA PERLU:
 * Aplikasi versi baru membutuhkan field tambahan untuk menampung data
 * pendaftaran (mis. berkas KK, raport, foto siswa, surat pindah) serta profil
 * sekolah (fasilitas, struktur). Migrasi ini bersifat idempoten: kolom hanya
 * ditambahkan bila belum ada, sehingga aman dijalankan berulang.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH SKEMA & DATA DATABASE (DDL ALTER TABLE + UPDATE). Jangan
 * dijalankan tanpa pemahaman dan backup yang memadai.
 * ============================================================================
 */

require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("./config/database");

// QueryInterface Sequelize: antarmuka tingkat rendah untuk operasi skema (DDL)
// seperti addColumn/changeColumn.
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
 * Mengubah definisi kolom hanya bila tabel dan kolom tersebut ada (idempoten).
 *
 * @param {string} tableName Nama tabel target.
 * @param {string} columnName Nama kolom yang akan diubah.
 * @param {object} definition Definisi kolom baru Sequelize.
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH SKEMA (ALTER TABLE MODIFY COLUMN) bila kondisi terpenuhi.
 */
async function changeColumnIfExists(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || !(await columnExists(tableName, columnName))) return;
  console.log(`Mengubah kolom ${tableName}.${columnName}`);
  await queryInterface.changeColumn(tableName, columnName, definition);
}

/**
 * Menjalankan keseluruhan proses migrasi field penerimaan dan profil sekolah.
 *
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH SKEMA & DATA DATABASE — menambah kolom baru, mengisi
 *   nilai default pada baris lama, dan memperketat constraint NOT NULL.
 */
async function migrate() {
  await sequelize.authenticate();

  // Tahap 1: tambahkan kolom-kolom baru pada tabel pendaftaran_ppdb (bila belum ada).
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

  // Tahap 2: isi nilai default untuk baris lama agar tidak melanggar NOT NULL
  // saat constraint diperketat. nama_orang_tua diambil dari nama ayah/ibu, dan
  // email kosong diisi placeholder unik berbasis id.
  if (await tableExists("pendaftaran_ppdb")) {
    await sequelize.query("UPDATE pendaftaran_ppdb SET nama_orang_tua = COALESCE(nama_orang_tua, nama_ayah, nama_ibu, 'Orang Tua/Wali') WHERE nama_orang_tua IS NULL");
    await sequelize.query("UPDATE pendaftaran_ppdb SET email = CONCAT('orangtua-', id, '@example.local') WHERE email IS NULL OR email = ''");
  }

  // Tahap 3: perketat/sesuaikan definisi kolom (mis. jadikan NOT NULL) setelah
  // data lama dipastikan terisi.
  await changeColumnIfExists("pendaftaran_ppdb", "nama_orang_tua", { type: DataTypes.STRING, allowNull: false });
  await changeColumnIfExists("pendaftaran_ppdb", "tempat_lahir", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("pendaftaran_ppdb", "agama", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("pendaftaran_ppdb", "nama_ayah", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("pendaftaran_ppdb", "nama_ibu", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("pendaftaran_ppdb", "email", { type: DataTypes.STRING, allowNull: false });

  // Tahap 4: tambahkan kolom profil sekolah dan sesuaikan tipe kolom gambar galeri.
  await addColumnIfMissing("profil_sekolah", "fasilitas", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing("profil_sekolah", "struktur_sekolah", { type: DataTypes.TEXT, allowNull: true });
  await changeColumnIfExists("galeri", "gambar", { type: DataTypes.TEXT("long"), allowNull: false });

  console.log("Migrasi field penerimaan dan profil sekolah selesai");
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
