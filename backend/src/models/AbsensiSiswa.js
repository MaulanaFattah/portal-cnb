const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "absensi_siswa",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      siswa_id: { type: DataTypes.INTEGER, allowNull: false },
      kelas_id: { type: DataTypes.INTEGER, allowNull: false },
      guru_user_id: { type: DataTypes.INTEGER, allowNull: false },
      jadwal_id: { type: DataTypes.INTEGER, allowNull: true },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false },
      hari: { type: DataTypes.STRING, allowNull: false },
      tipe_guru: { type: DataTypes.ENUM("wali_kelas", "mapel"), allowNull: false },
      mapel: { type: DataTypes.STRING, allowNull: true },
      status: {
        type: DataTypes.ENUM("hadir", "izin", "sakit", "alpha"),
        allowNull: false,
        defaultValue: "hadir"
      },
      keterangan: { type: DataTypes.TEXT, allowNull: true }
    },
    { timestamps: true }
  );
};
