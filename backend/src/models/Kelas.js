const { DataTypes } = require("sequelize");

/**
 * Model Kelas (tabel: "kelas")
 * ----------------------------
 * Tabel ini menyimpan data kelas/rombongan belajar. Setiap baris mewakili
 * satu kelas pada tahun ajaran tertentu, beserta tingkat, wali kelas, dan
 * jumlah siswa. Tabel ini menjadi acuan bagi siswa, jadwal mengajar, dan
 * absensi.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "kelas",
    {
      // Primary key auto-increment, identitas unik tiap kelas
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Nama kelas (mis. "VII-A"), wajib
      nama_kelas: { type: DataTypes.STRING, allowNull: false },
      // Tingkat/jenjang kelas (mis. "7", "VIII"), wajib
      tingkat: { type: DataTypes.STRING, allowNull: false },
      // Nama wali kelas (opsional, disimpan sebagai teks)
      wali_kelas: { type: DataTypes.STRING, allowNull: true },
      // Tahun ajaran kelas (mis. "2024/2025"), wajib
      tahun_ajaran: { type: DataTypes.STRING, allowNull: false },
      // Jumlah siswa pada kelas ini (default 0), umumnya diperbarui mengikuti data siswa
      jumlah_siswa: { type: DataTypes.INTEGER, defaultValue: 0 },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "kelas",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
