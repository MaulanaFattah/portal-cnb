const { DataTypes } = require("sequelize");

/**
 * Model KepalaSekolah (tabel: "kepala_sekolah")
 * ---------------------------------------------
 * Tabel ini menyimpan data kepala sekolah beserta periode jabatannya.
 * Setiap baris mewakili satu kepala sekolah, yang dapat ditautkan ke sebuah
 * akun login (akun_pengguna) untuk akses portal kepala sekolah.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "kepala_sekolah",
    {
      // Primary key auto-increment, identitas unik tiap data kepala sekolah
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Foreign key unik & opsional ke "akun_pengguna": menautkan kepala sekolah
      // ke akun login (relasi 1-1). Boleh kosong jika belum punya akun portal
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true,
        field: "akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      // Nomor Induk Pegawai (wajib & unik) sebagai identitas resmi
      nip: { type: DataTypes.STRING, allowNull: false, unique: true },
      // Nama lengkap kepala sekolah (wajib)
      nama: { type: DataTypes.STRING, allowNull: false },
      // Enum jenjang yang dipimpin: "sd" atau "smp" (opsional)
      jenjang: { type: DataTypes.ENUM("sd", "smp"), allowNull: true, field: "jenjang" },
      // Alamat email (opsional)
      email: { type: DataTypes.STRING, allowNull: true },
      // Nomor telepon (opsional)
      no_telepon: { type: DataTypes.STRING, allowNull: true },
      // Foto (path atau base64), opsional
      foto: { type: DataTypes.TEXT, allowNull: true },
      // Tanggal mulai periode jabatan (wajib, hanya tanggal)
      periode_mulai: { type: DataTypes.DATEONLY, allowNull: false },
      // Tanggal akhir periode jabatan (opsional; kosong berarti masih menjabat)
      periode_akhir: { type: DataTypes.DATEONLY, allowNull: true },
      // Alamat domisili (opsional)
      alamat: { type: DataTypes.TEXT, allowNull: true },
      // Pendidikan terakhir (opsional)
      pendidikan_terakhir: { type: DataTypes.STRING, allowNull: true },
      // Enum status: "aktif" atau "non-aktif" (default "aktif")
      status: { type: DataTypes.ENUM("aktif", "non-aktif"), defaultValue: "aktif" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "kepala_sekolah",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
