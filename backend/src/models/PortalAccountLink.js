const { DataTypes } = require("sequelize");

/**
 * Model PortalAccountLink (tabel: "tautan_akun_portal")
 * -----------------------------------------------------
 * Tabel penghubung (junction) antara akun pengguna portal dengan data siswa.
 * Setiap baris menautkan satu akun (akun_pengguna) ke satu siswa, dengan
 * keterangan jenis tautan: apakah akun tersebut milik siswa itu sendiri atau
 * milik orang tua/wali siswa.
 *
 * Tabel ini memungkinkan satu akun orang tua terhubung ke beberapa anak, dan
 * sebaliknya, sekaligus mengatur hak akses portal berdasarkan jenis tautan.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "tautan_akun_portal",
    {
      // Primary key auto-increment, identitas unik tiap tautan
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Foreign key ke "akun_pengguna": akun yang ditautkan (wajib)
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      // Foreign key ke "siswa": siswa yang ditautkan ke akun (wajib)
      siswa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "siswa_id",
        references: { model: "siswa", key: "id" }
      },
      // Enum jenis tautan: "siswa" (akun milik siswa) atau "orangtua" (akun milik orang tua/wali), wajib
      link_type: {
        type: DataTypes.ENUM("siswa", "orangtua"),
        field: "jenis_tautan",
        allowNull: false
      },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "tautan_akun_portal",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
