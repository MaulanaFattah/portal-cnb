const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "absensi_siswa",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      siswa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "siswa_id",
        references: { model: "siswa", key: "id" }
      },
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "kelas_id",
        references: { model: "kelas", key: "id" }
      },
      guru_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "guru_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      jadwal_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "jadwal_mengajar_id",
        references: { model: "jadwal_mengajar", key: "id" }
      },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      hari: { type: DataTypes.STRING, allowNull: false },
      tipe_guru: { type: DataTypes.ENUM("wali_kelas", "mapel"), allowNull: false },
      mapel: { type: DataTypes.STRING, allowNull: true, field: "mata_pelajaran" },
      status: {
        type: DataTypes.ENUM("hadir", "izin", "sakit", "alpha"),
        allowNull: false
      },
      keterangan: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "absensi_siswa",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
