const { DataTypes } = require("sequelize");

/**
 * Model RiwayatKelas (tabel: "riwayat_kelas")
 * -------------------------------------------
 * Tabel ini mencatat riwayat perpindahan kelas siswa, terutama saat kenaikan
 * kelas. Setiap baris merekam perubahan dari kelas lama ke kelas baru pada
 * tahun ajaran tertentu.
 *
 * Catatan: nama siswa, NISN, serta nama kelas lama/baru disimpan sebagai teks
 * (snapshot) agar riwayat tetap terbaca walau data kelas asli berubah atau
 * dihapus. Kolom id kelas lama/baru tidak diberi foreign key agar histori
 * tidak ikut terhapus ketika kelas dihapus.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "riwayat_kelas",
    {
      // Primary key auto-increment, identitas unik tiap baris riwayat
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Foreign key opsional ke "siswa": siswa yang berpindah kelas (boleh kosong
      // bila data siswa asli sudah tidak ada)
      siswa_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "siswa_id",
        references: { model: "siswa", key: "id" }
      },
      // Snapshot nama siswa saat riwayat dibuat (wajib)
      siswa_nama: { type: DataTypes.STRING, allowNull: false },
      // Snapshot NISN siswa (opsional)
      nisn: { type: DataTypes.STRING, allowNull: true },
      // ID kelas asal (opsional, tanpa foreign key agar histori tetap aman)
      kelas_lama_id: { type: DataTypes.INTEGER, allowNull: true },
      // Snapshot nama kelas asal (opsional)
      kelas_lama_nama: { type: DataTypes.STRING, allowNull: true },
      // ID kelas tujuan (opsional, tanpa foreign key agar histori tetap aman)
      kelas_baru_id: { type: DataTypes.INTEGER, allowNull: true },
      // Snapshot nama kelas tujuan (opsional)
      kelas_baru_nama: { type: DataTypes.STRING, allowNull: true },
      // Status perpindahan (mis. "Naik Kelas"), default "Naik Kelas"
      status: { type: DataTypes.STRING, allowNull: true, defaultValue: "Naik Kelas" },
      // Tahun ajaran saat perpindahan terjadi (opsional)
      tahun_ajaran: { type: DataTypes.STRING, allowNull: true },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "riwayat_kelas",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
