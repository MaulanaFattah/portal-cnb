const { DataTypes } = require("sequelize");

/**
 * Model ProfilSekolah (tabel: "profil_sekolah")
 * ---------------------------------------------
 * Tabel ini menyimpan informasi profil sekolah yang ditampilkan di situs
 * publik, seperti identitas sekolah, kontak, visi-misi, sejarah, fasilitas,
 * struktur organisasi, dan akreditasi. Umumnya tabel ini hanya berisi satu
 * baris data utama profil sekolah.
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "profil_sekolah",
    {
      // Primary key auto-increment, identitas unik tiap baris profil
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Nama sekolah (wajib)
      nama_sekolah: { type: DataTypes.STRING, allowNull: false },
      // Nomor Pokok Sekolah Nasional (opsional)
      npsn: { type: DataTypes.STRING, allowNull: true },
      // Alamat sekolah (opsional)
      alamat: { type: DataTypes.TEXT, allowNull: true },
      // Nomor telepon sekolah (opsional)
      telepon: { type: DataTypes.STRING, allowNull: true },
      // Email sekolah (opsional)
      email: { type: DataTypes.STRING, allowNull: true },
      // Alamat website sekolah (opsional)
      website: { type: DataTypes.STRING, allowNull: true },
      // Logo sekolah (path atau base64), opsional
      logo: { type: DataTypes.TEXT, allowNull: true },
      // Visi sekolah (opsional)
      visi: { type: DataTypes.TEXT, allowNull: true },
      // Misi sekolah (opsional)
      misi: { type: DataTypes.TEXT, allowNull: true },
      // Sejarah sekolah (opsional)
      sejarah: { type: DataTypes.TEXT, allowNull: true },
      // Deskripsi fasilitas sekolah (opsional)
      fasilitas: { type: DataTypes.TEXT, allowNull: true },
      // Struktur organisasi sekolah (opsional)
      struktur_sekolah: { type: DataTypes.TEXT, allowNull: true },
      // Status akreditasi sekolah (opsional)
      akreditasi: { type: DataTypes.STRING, allowNull: true },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "profil_sekolah",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
