const { DataTypes } = require("sequelize");

/**
 * Model Guru (tabel: "guru")
 * --------------------------
 * Tabel ini menyimpan data master/biodata guru sekolah. Setiap baris mewakili
 * satu guru beserta data kepegawaian dan pribadinya (NIP, nama, kontak, mata
 * pelajaran, dll). Tabel ini berfokus pada profil guru, terpisah dari akun
 * login pengguna (lihat tabel "akun_pengguna").
 */
module.exports = (sequelize) => {
  return sequelize.define(
    "guru",
    {
      // Primary key auto-increment, identitas unik tiap guru
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      // Nomor Induk Pegawai (wajib & unik) sebagai identitas resmi guru
      nip: { type: DataTypes.STRING, allowNull: false, unique: true },
      // Nama lengkap guru (wajib)
      nama: { type: DataTypes.STRING, allowNull: false },
      // Alamat email guru (opsional)
      email: { type: DataTypes.STRING, allowNull: true },
      // Nomor telepon guru (opsional)
      no_telepon: { type: DataTypes.STRING, allowNull: true },
      // Mata pelajaran yang diampu (opsional)
      mata_pelajaran: { type: DataTypes.STRING, allowNull: true },
      // Jenjang pendidikan terakhir guru (opsional)
      pendidikan_terakhir: { type: DataTypes.STRING, allowNull: true },
      // Foto guru (path atau base64), opsional
      foto: { type: DataTypes.TEXT, allowNull: true },
      // Alamat domisili guru (opsional)
      alamat: { type: DataTypes.TEXT, allowNull: true },
      // Tanggal lahir guru (opsional, hanya tanggal)
      tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: true },
      // Tempat lahir guru (opsional)
      tempat_lahir: { type: DataTypes.STRING, allowNull: true },
      // Jabatan guru di sekolah (opsional)
      jabatan: { type: DataTypes.STRING, allowNull: true },
      // Jenjang penempatan guru: "sd" atau "smp" (opsional) untuk membedakan guru SD/SMP
      jenjang: { type: DataTypes.ENUM("sd", "smp"), allowNull: true },
      // Enum jenis kelamin: "L" (laki-laki) atau "P" (perempuan), opsional
      jenis_kelamin: { type: DataTypes.ENUM("L", "P"), allowNull: true },
      // Enum status kepegawaian: "aktif" / "non-aktif" / "resign" (default "aktif")
      status: { type: DataTypes.ENUM("aktif", "non-aktif", "resign"), defaultValue: "aktif" },
      // Timestamp pembuatan baris, dipetakan ke kolom "dibuat_pada"
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      // Timestamp pembaruan terakhir, dipetakan ke kolom "diperbarui_pada"
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" },
      // Timestamp soft delete (paranoid). Null = belum dihapus.
      deletedAt: { type: DataTypes.DATE, allowNull: true, field: "dihapus_pada" }
    },
    {
      tableName: "guru",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      paranoid: true
    }
  );
};
