const { DataTypes } = require("sequelize");

/**
 * Model PasswordResetRequest (tabel: "permintaan_reset_password")
 * ---------------------------------------------------------------
 * Tabel ini menyimpan permintaan reset kata sandi yang diajukan pengguna
 * (guru/siswa/orang tua/kepala sekolah). Setiap baris mewakili satu permintaan
 * yang akan diproses secara manual oleh admin: dicocokkan ke akun pengguna,
 * lalu diselesaikan (completed) atau ditolak (rejected).
 *
 * Tabel ini juga menyimpan jejak siapa yang memproses, kapan, beserta info
 * keamanan (IP & user agent) saat permintaan dibuat.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "permintaan_reset_password",
    {
      // Primary key auto-increment, identitas unik tiap permintaan
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Enum peran pemohon: guru / siswa / orangtua / kepala_sekolah (wajib), dipetakan ke "peran"
      role: {
        type: DataTypes.ENUM("guru", "siswa", "orangtua", "kepala_sekolah"),
        allowNull: false,
        field: "peran"
      },
      // Email pemohon (wajib), dipakai untuk mencocokkan akun
      email: { type: DataTypes.STRING, allowNull: false },
      // Nama pemohon (wajib), dipetakan ke "nama"
      name: { type: DataTypes.STRING, allowNull: false, field: "nama" },
      // NISN pemohon (opsional, relevan untuk peran siswa/orang tua)
      nisn: { type: DataTypes.STRING, allowNull: true },
      // Nama kelas pemohon (opsional), dipetakan ke "kelas"
      class_name: { type: DataTypes.STRING, allowNull: true, field: "kelas" },
      // Catatan tambahan dari pemohon (opsional), dipetakan ke "catatan"
      notes: { type: DataTypes.TEXT, allowNull: true, field: "catatan" },
      // Enum status proses: pending / completed / rejected (default "pending")
      status: {
        type: DataTypes.ENUM("pending", "completed", "rejected"),
        allowNull: false,
        defaultValue: "pending"
      },
      // Foreign key opsional ke "akun_pengguna": akun yang berhasil dicocokkan dengan permintaan
      matched_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "akun_pengguna_terkait_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      // Foreign key opsional ke "akun_pengguna": admin yang memproses permintaan
      processed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "diproses_oleh_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      // Alasan penolakan jika status "rejected" (opsional), dipetakan ke "alasan_penolakan"
      rejection_reason: { type: DataTypes.TEXT, allowNull: true, field: "alasan_penolakan" },
      // Alamat IP saat permintaan dibuat (opsional), untuk keperluan keamanan
      ip_address: { type: DataTypes.STRING, allowNull: true, field: "alamat_ip" },
      // User-Agent (browser/perangkat) saat permintaan dibuat (opsional)
      user_agent: { type: DataTypes.TEXT, allowNull: true, field: "agen_pengguna" },
      // Timestamp kapan permintaan diproses (opsional), dipetakan ke "diproses_pada"
      processed_at: { type: DataTypes.DATE, allowNull: true, field: "diproses_pada" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "permintaan_reset_password",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      // Indeks untuk mempercepat pencarian berdasarkan status dan kombinasi peran+email+status
      indexes: [
        { fields: ["status"] },
        { fields: ["peran", "email", "status"] }
      ]
    }
  );
};
