const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "pendaftaran_ppdb",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      jenis_pendaftaran: {
        type: DataTypes.ENUM("pendaftaran_baru", "siswa_pindahan"),
        allowNull: false,
        defaultValue: "pendaftaran_baru",
        field: "jenis_pendaftaran"
      },
      target_jenjang: {
        type: DataTypes.ENUM("tk", "sd", "smp"),
        allowNull: false,
        defaultValue: "tk",
        field: "target_jenjang"
      },
      nama_lengkap: { type: DataTypes.STRING, allowNull: false, field: "nama_lengkap" },
      nisn: { type: DataTypes.STRING, allowNull: true, field: "nisn" },
      tempat_lahir: { type: DataTypes.STRING, allowNull: true, field: "tempat_lahir" },
      tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: false, field: "tanggal_lahir" },
      jenis_kelamin: { type: DataTypes.ENUM("L", "P"), allowNull: false, field: "jenis_kelamin" },
      agama: { type: DataTypes.STRING, allowNull: true, field: "agama" },
      alamat: { type: DataTypes.TEXT, allowNull: false, field: "alamat" },
      nama_orang_tua: { type: DataTypes.STRING, allowNull: false, field: "nama_orang_tua" },
      nama_ayah: { type: DataTypes.STRING, allowNull: true, field: "nama_ayah" },
      nama_ibu: { type: DataTypes.STRING, allowNull: true, field: "nama_ibu" },
      pekerjaan_ayah: { type: DataTypes.STRING, allowNull: true, field: "pekerjaan_ayah" },
      pekerjaan_ibu: { type: DataTypes.STRING, allowNull: true, field: "pekerjaan_ibu" },
      no_telepon: { type: DataTypes.STRING, allowNull: false, field: "no_telepon" },
      email: { type: DataTypes.STRING, allowNull: false },
      asal_sekolah: { type: DataTypes.STRING, allowNull: true, field: "asal_sekolah" },
      status: { type: DataTypes.ENUM("pending", "diterima", "ditolak"), defaultValue: "pending" },
      tahun_ajaran: { type: DataTypes.STRING, allowNull: false, field: "tahun_ajaran" },
      berkas_kk: { type: DataTypes.TEXT("long"), allowNull: true, field: "berkas_kk" },
      berkas_raport: { type: DataTypes.TEXT("long"), allowNull: true, field: "berkas_raport" },
      foto_siswa: { type: DataTypes.TEXT("long"), allowNull: true, field: "foto_siswa" },
      berkas_surat_pindah: { type: DataTypes.TEXT("long"), allowNull: true, field: "berkas_surat_pindah" },
      notification_note: { type: DataTypes.TEXT, allowNull: true, field: "catatan_notifikasi" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "pendaftaran_ppdb",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
