const { DataTypes } = require("sequelize");

/**
 * Model Siswa (tabel: "siswa")
 * ----------------------------
 * Tabel ini menyimpan data master/biodata siswa. Setiap baris mewakili satu
 * siswa beserta data pribadi, data orang tua, dan kelas tempat ia terdaftar.
 * Tabel ini menjadi acuan bagi absensi, riwayat kelas, dan tautan akun portal.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "siswa",
    {
      // Primary key auto-increment, identitas unik tiap siswa
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // NISN siswa (wajib & unik) sebagai identitas resmi nasional
      nisn: { type: DataTypes.STRING, allowNull: false, unique: true },
      // Nama lengkap siswa (wajib)
      nama: { type: DataTypes.STRING, allowNull: false },
      // Foreign key opsional ke "kelas": kelas siswa saat ini (boleh kosong jika
      // belum ditempatkan di kelas)
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "kelas_id",
        references: { model: "kelas", key: "id" }
      },
      // Tempat lahir siswa (opsional)
      tempat_lahir: { type: DataTypes.STRING, allowNull: true },
      // Tanggal lahir siswa (opsional, hanya tanggal)
      tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: true },
      // Enum jenis kelamin: "L" (laki-laki) atau "P" (perempuan), wajib
      jenis_kelamin: { type: DataTypes.ENUM("L", "P"), allowNull: false },
      // Agama siswa (opsional)
      agama: { type: DataTypes.STRING, allowNull: true },
      // Alamat domisili siswa (opsional)
      alamat: { type: DataTypes.TEXT, allowNull: true },
      // Nama ayah (opsional)
      nama_ayah: { type: DataTypes.STRING, allowNull: true },
      // Nama ibu (opsional)
      nama_ibu: { type: DataTypes.STRING, allowNull: true },
      // Nomor telepon kontak (opsional)
      no_telepon: { type: DataTypes.STRING, allowNull: true },
      // Alamat email siswa (opsional)
      email: { type: DataTypes.STRING, allowNull: true },
      // Foto siswa (path atau base64), opsional
      foto: { type: DataTypes.TEXT, allowNull: true },
      // Enum status siswa: aktif / lulus / pindah / keluar / berhenti (default "aktif")
      status: { type: DataTypes.ENUM("aktif", "lulus", "pindah", "keluar", "berhenti"), defaultValue: "aktif" },
      // Nomor registrasi / ID sementara untuk login sebelum NIS resmi terbit
      nomor_registrasi: { type: DataTypes.STRING, allowNull: true },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" },
      // Timestamp soft delete (paranoid). Null = belum dihapus.
      deletedAt: { type: DataTypes.DATE, allowNull: true, field: "dihapus_pada" }
    },
    {
      tableName: "siswa",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      paranoid: true
    }
  );
};
