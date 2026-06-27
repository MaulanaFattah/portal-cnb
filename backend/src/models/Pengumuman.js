const { DataTypes } = require("sequelize");

/**
 * Model Pengumuman (tabel: "pengumuman")
 * --------------------------------------
 * Tabel ini menyimpan pengumuman sekolah yang ditampilkan di situs publik.
 * Setiap baris mewakili satu pengumuman dengan judul, tanggal, isi, kategori,
 * dan gambar opsional.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "pengumuman",
    {
      // Primary key auto-increment, identitas unik tiap pengumuman
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Judul pengumuman (wajib), dipetakan ke kolom "judul"
      title: { type: DataTypes.STRING, allowNull: false, field: "judul" },
      // Tanggal pengumuman (wajib, hanya tanggal), dipetakan ke "tanggal"
      date: { type: DataTypes.DATEONLY, allowNull: false, field: "tanggal" },
      // Isi/konten pengumuman (wajib), dipetakan ke kolom "isi"
      content: { type: DataTypes.TEXT, allowNull: false, field: "isi" },
      // Kategori pengumuman (opsional), dipetakan ke kolom "kategori"
      category: { type: DataTypes.STRING, allowNull: true, field: "kategori" },
      // Gambar pendukung (path atau base64), opsional, dipetakan ke "gambar"
      image: { type: DataTypes.TEXT, allowNull: true, field: "gambar" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "pengumuman",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
