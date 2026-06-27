const { DataTypes } = require("sequelize");

/**
 * Model Kegiatan (tabel: "kegiatan")
 * ----------------------------------
 * Tabel ini menyimpan daftar kegiatan/acara sekolah yang ditampilkan di situs
 * publik. Setiap baris mewakili satu kegiatan beserta judul, tanggal,
 * deskripsi, gambar, dan status tampil.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "kegiatan",
    {
      // Primary key auto-increment, identitas unik tiap kegiatan
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Judul kegiatan (wajib), dipetakan ke kolom "judul"
      title: { type: DataTypes.STRING, allowNull: false, field: "judul" },
      // Tanggal pelaksanaan kegiatan (wajib, hanya tanggal), dipetakan ke "tanggal"
      date: { type: DataTypes.DATEONLY, allowNull: false, field: "tanggal" },
      // Deskripsi kegiatan (wajib), dipetakan ke kolom "deskripsi"
      description: { type: DataTypes.TEXT, allowNull: false, field: "deskripsi" },
      // Data gambar (path atau base64) bertipe LONGTEXT (opsional), dipetakan ke "gambar"
      image: { type: DataTypes.TEXT("long"), allowNull: true, field: "gambar" },
      // Enum status tampil: "tampil" atau "tidak_tampil" (default "tampil")
      status: { type: DataTypes.ENUM("tampil", "tidak_tampil"), allowNull: false, defaultValue: "tampil" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "kegiatan",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
