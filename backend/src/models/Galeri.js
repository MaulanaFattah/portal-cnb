const { DataTypes } = require("sequelize");

/**
 * Model Galeri (tabel: "galeri")
 * ------------------------------
 * Tabel ini menyimpan koleksi foto/gambar galeri sekolah yang ditampilkan
 * di situs publik. Setiap baris mewakili satu item galeri dengan judul,
 * gambar, deskripsi, dan kategori opsional.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "galeri",
    {
      // Primary key auto-increment, identitas unik tiap item galeri
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Judul item galeri (wajib), dipetakan ke kolom "judul"
      title: { type: DataTypes.STRING, allowNull: false, field: "judul" },
      // Data gambar (path atau base64) bertipe LONGTEXT (wajib), dipetakan ke "gambar"
      image: { type: DataTypes.TEXT("long"), allowNull: false, field: "gambar" },
      // Deskripsi item galeri (opsional), dipetakan ke "deskripsi"
      description: { type: DataTypes.TEXT, allowNull: true, field: "deskripsi" },
      // Kategori/pengelompokan galeri (opsional), dipetakan ke "kategori"
      category: { type: DataTypes.STRING, allowNull: true, field: "kategori" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "galeri",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
