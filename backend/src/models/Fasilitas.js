const { DataTypes } = require("sequelize");

/**
 * Model Fasilitas (tabel: "fasilitas")
 * ------------------------------------
 * Tabel ini menyimpan daftar fasilitas sekolah (mis. perpustakaan, lab,
 * lapangan) yang ditampilkan di situs publik. Setiap baris mewakili satu
 * fasilitas beserta deskripsi, gambar, urutan tampil, dan status visibilitas.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "fasilitas",
    {
      // Primary key auto-increment, identitas unik tiap fasilitas
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Nama fasilitas (wajib), dipetakan ke kolom "nama"
      name: { type: DataTypes.STRING, allowNull: false, field: "nama" },
      // Deskripsi fasilitas (wajib), dipetakan ke kolom "deskripsi"
      description: { type: DataTypes.TEXT, allowNull: false, field: "deskripsi" },
      // Data gambar (path atau base64) bertipe LONGTEXT (opsional), dipetakan ke "gambar"
      image: { type: DataTypes.TEXT("long"), allowNull: true, field: "gambar" },
      // Urutan tampil fasilitas pada halaman (default 0), dipetakan ke "urutan"
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "urutan" },
      // Enum status visibilitas: "tampil" (ditampilkan) atau "sembunyi" (disembunyikan), default "tampil"
      status: { type: DataTypes.ENUM("tampil", "sembunyi"), allowNull: false, defaultValue: "tampil" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "fasilitas",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
