const { DataTypes } = require("sequelize");

/**
 * Model User (tabel: "akun_pengguna")
 * -----------------------------------
 * Tabel ini menyimpan akun pengguna sistem yang dapat login ke portal.
 * Satu baris mewakili satu akun beserta kredensial dan perannya. Tabel ini
 * menjadi pusat autentikasi & otorisasi: hampir semua tabel lain merujuk ke
 * akun_pengguna (mis. guru, kepala sekolah, absensi, audit log, tautan portal).
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "akun_pengguna",
    {
      // Primary key auto-increment, identitas unik tiap akun
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Nama lengkap pengguna (wajib), dipetakan ke kolom "nama"
      name: { type: DataTypes.STRING, allowNull: false, field: "nama" },
      // Email pengguna (wajib & unik), dipakai sebagai identitas login
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      // Kata sandi ter-hash (wajib), dipetakan ke kolom "kata_sandi"
      password: { type: DataTypes.STRING, allowNull: false, field: "kata_sandi" },
      // Enum peran pengguna: admin / guru / siswa / orangtua / kepala_sekolah
      // (default "siswa"), menentukan hak akses. Dipetakan ke kolom "peran"
      role: {
        type: DataTypes.ENUM("admin", "guru", "siswa", "orangtua", "kepala_sekolah"),
        field: "peran",
        defaultValue: "siswa"
      },
      // Profesi pengguna (opsional), dipetakan ke kolom "profesi"
      profession: { type: DataTypes.STRING, allowNull: true, field: "profesi" },
      // Penanda apakah pengguna wajib mengganti kata sandi saat login berikutnya
      // (default false), dipetakan ke "wajib_ganti_kata_sandi"
      must_change_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "wajib_ganti_kata_sandi" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "akun_pengguna",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
