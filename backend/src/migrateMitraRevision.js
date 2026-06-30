/**
 * ============================================================================
 * Migrasi: Revisi Mitra (PPDB lengkap, Soft Delete, Kelas, Guru, Siswa)
 * ----------------------------------------------------------------------------
 * Skrip idempoten untuk menambahkan kolom-kolom baru sesuai kebutuhan revisi
 * mitra TANPA menghapus kolom/tabel yang sudah ada. Aman dijalankan berulang
 * (mengecek keberadaan kolom lebih dulu via information_schema).
 *
 * Cakupan:
 *  - pendaftaran_ppdb : field formulir mitra lengkap (calon, ortu, wali),
 *    berkas tambahan, nomor registrasi, status & tanggal daftar ulang, soft delete.
 *  - siswa            : nomor_registrasi (ID sementara), soft delete, status "berhenti".
 *  - guru             : tempat_lahir, jabatan, soft delete, status "resign".
 *  - kelas            : kapasitas, soft delete.
 *
 * Jalankan: node src/migrateMitraRevision.js
 * PERINGATAN: skrip ini MENGUBAH SKEMA database.
 * ============================================================================
 */
require("dotenv").config();
const db = require("./models");

const sequelize = db.sequelize;
const DB_NAME = process.env.DB_NAME;

/** Cek apakah sebuah kolom sudah ada pada tabel tertentu. */
async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?",
    { replacements: [DB_NAME, table, column] }
  );
  return Number(rows[0].c) > 0;
}

/** Tambah kolom bila belum ada (idempoten). */
async function addColumn(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`= ${table}.${column} sudah ada, dilewati`);
    return;
  }
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  console.log(`+ ${table}.${column} ditambahkan`);
}

/** Ubah definisi kolom (dipakai untuk memperluas enum status). */
async function modifyColumn(table, column, definition) {
  await sequelize.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${definition}`);
  console.log(`~ ${table}.${column} dimodifikasi`);
}

async function run() {
  await sequelize.authenticate();
  console.log("Terhubung ke database. Mulai migrasi revisi mitra...");

  // ---- pendaftaran_ppdb: data calon peserta didik ----
  await addColumn("pendaftaran_ppdb", "nik", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "no_kk", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "anak_ke", "INT NULL");
  await addColumn("pendaftaran_ppdb", "jumlah_saudara_kandung", "INT NULL");
  await addColumn("pendaftaran_ppdb", "jumlah_saudara_tiri", "INT NULL");
  await addColumn("pendaftaran_ppdb", "jumlah_saudara_angkat", "INT NULL");
  await addColumn("pendaftaran_ppdb", "jarak_ke_sekolah", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "transportasi", "VARCHAR(255) NULL");

  // ---- pendaftaran_ppdb: data orang tua kandung ----
  await addColumn("pendaftaran_ppdb", "tempat_lahir_ayah", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "tanggal_lahir_ayah", "DATE NULL");
  await addColumn("pendaftaran_ppdb", "tempat_lahir_ibu", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "tanggal_lahir_ibu", "DATE NULL");
  await addColumn("pendaftaran_ppdb", "pendidikan_ayah", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "pendidikan_ibu", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "penghasilan_ayah", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "penghasilan_ibu", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "alamat_orang_tua", "TEXT NULL");

  // ---- pendaftaran_ppdb: data wali ----
  await addColumn("pendaftaran_ppdb", "nama_wali", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "jenis_kelamin_wali", "VARCHAR(10) NULL");
  await addColumn("pendaftaran_ppdb", "tempat_lahir_wali", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "tanggal_lahir_wali", "DATE NULL");
  await addColumn("pendaftaran_ppdb", "pendidikan_wali", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "pekerjaan_wali", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "alamat_wali", "TEXT NULL");

  // ---- pendaftaran_ppdb: berkas tambahan ----
  await addColumn("pendaftaran_ppdb", "berkas_akta", "LONGTEXT NULL");
  await addColumn("pendaftaran_ppdb", "berkas_ktp_ortu", "LONGTEXT NULL");

  // ---- pendaftaran_ppdb: registrasi, daftar ulang, soft delete ----
  await addColumn("pendaftaran_ppdb", "nomor_registrasi", "VARCHAR(255) NULL");
  await addColumn("pendaftaran_ppdb", "status_daftar_ulang", "VARCHAR(20) NOT NULL DEFAULT 'belum'");
  await addColumn("pendaftaran_ppdb", "tanggal_daftar_ulang", "DATETIME NULL");
  await addColumn("pendaftaran_ppdb", "dihapus_pada", "DATETIME NULL");

  // ---- siswa: ID sementara, soft delete, status berhenti ----
  await addColumn("siswa", "nomor_registrasi", "VARCHAR(255) NULL");
  await addColumn("siswa", "dihapus_pada", "DATETIME NULL");
  await modifyColumn("siswa", "status", "ENUM('aktif','lulus','pindah','keluar','berhenti') NULL DEFAULT 'aktif'");

  // ---- guru: tempat lahir, jabatan, soft delete, status resign ----
  await addColumn("guru", "tempat_lahir", "VARCHAR(255) NULL");
  await addColumn("guru", "jabatan", "VARCHAR(255) NULL");
  await addColumn("guru", "dihapus_pada", "DATETIME NULL");
  await modifyColumn("guru", "status", "ENUM('aktif','non-aktif','resign') NULL DEFAULT 'aktif'");

  // ---- kelas: kapasitas, soft delete ----
  await addColumn("kelas", "kapasitas", "INT NULL");
  await addColumn("kelas", "dihapus_pada", "DATETIME NULL");

  console.log("Migrasi revisi mitra selesai.");
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migrasi gagal:", error);
    process.exit(1);
  });
