/**
 * ============================================================================
 * SKRIP MIGRASI: Tabel Permintaan Reset Password
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini menyiapkan tabel "permintaan_reset_password" yang menampung
 * permintaan reset kata sandi dari berbagai peran pengguna (guru, siswa,
 * orangtua, kepala_sekolah). Jika tabel belum ada, skrip membuat tabel beserta
 * indeksnya. Jika tabel sudah ada, skrip hanya memastikan ENUM kolom "peran"
 * sudah mencakup nilai "kepala_sekolah".
 *
 * KENAPA PERLU:
 * Fitur reset password berbasis pengajuan ke admin membutuhkan tabel khusus
 * untuk menyimpan status pengajuan, pemroses, alasan penolakan, serta metadata
 * audit (alamat IP & user agent). Migrasi bersifat idempoten.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH SKEMA DATABASE (CREATE TABLE / ALTER TABLE). Jangan
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
 * Memastikan ENUM kolom "peran" pada tabel permintaan_reset_password mencakup
 * keempat peran yang didukung (termasuk kepala_sekolah).
 *
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH SKEMA (ALTER TABLE MODIFY) pada kolom peran.
 */
async function ensurePasswordResetRoleEnum() {
  await sequelize.query(
    "ALTER TABLE `permintaan_reset_password` MODIFY `peran` ENUM('guru','siswa','orangtua','kepala_sekolah') NOT NULL"
  );
}

/**
 * Menjalankan migrasi tabel permintaan reset password.
 *
 * @returns {Promise<void>}
 * Efek samping: MENGUBAH SKEMA DATABASE — bila tabel sudah ada hanya
 *   memperbarui ENUM peran; bila belum ada, membuat tabel lengkap beserta dua
 *   indeks pendukung, lalu memastikan ENUM peran.
 */
async function migrate() {
  await sequelize.authenticate();

  // Idempoten: jika tabel sudah ada, cukup pastikan ENUM peran mutakhir.
  if (await tableExists("permintaan_reset_password")) {
    console.log("Tabel permintaan_reset_password sudah ada");
    await ensurePasswordResetRoleEnum();
    console.log("Enum peran reset password sudah mendukung kepala sekolah");
    return;
  }

  // Buat tabel beserta seluruh kolom: data pengaju, status, pemroses,
  // relasi opsional ke akun_pengguna, metadata audit, dan timestamp.
  console.log("Membuat tabel permintaan_reset_password");
  await queryInterface.createTable("permintaan_reset_password", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    peran: { type: DataTypes.ENUM("guru", "siswa", "orangtua", "kepala_sekolah"), allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    nama: { type: DataTypes.STRING, allowNull: false },
    nisn: { type: DataTypes.STRING, allowNull: true },
    kelas: { type: DataTypes.STRING, allowNull: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "completed", "rejected"),
      allowNull: false,
      defaultValue: "pending"
    },
    akun_pengguna_terkait_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "akun_pengguna", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    diproses_oleh_akun_pengguna_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "akun_pengguna", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    alasan_penolakan: { type: DataTypes.TEXT, allowNull: true },
    alamat_ip: { type: DataTypes.STRING, allowNull: true },
    agen_pengguna: { type: DataTypes.TEXT, allowNull: true },
    diproses_pada: { type: DataTypes.DATE, allowNull: true },
    dibuat_pada: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
    },
    diperbarui_pada: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
    }
  });

  // Tambahkan indeks untuk mempercepat query berdasarkan status dan kombinasi
  // peran+email+status (dipakai saat memeriksa pengajuan yang sedang berjalan).
  await queryInterface.addIndex("permintaan_reset_password", ["status"], {
    name: "idx_permintaan_reset_password_status"
  });
  await queryInterface.addIndex("permintaan_reset_password", ["peran", "email", "status"], {
    name: "idx_permintaan_reset_password_peran_email_status"
  });

  // Pastikan ENUM peran sudah final (mencakup kepala_sekolah).
  await ensurePasswordResetRoleEnum();

  console.log("Migrasi permintaan reset password selesai");
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
