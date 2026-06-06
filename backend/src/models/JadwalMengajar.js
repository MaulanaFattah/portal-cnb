const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "jadwal_mengajar",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      guru_user_id: { type: DataTypes.INTEGER, allowNull: false },
      kelas_id: { type: DataTypes.INTEGER, allowNull: false },
      mapel: { type: DataTypes.STRING, allowNull: false },
      hari: {
        type: DataTypes.ENUM("senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"),
        allowNull: false
      },
      jam_mulai: { type: DataTypes.TIME, allowNull: false },
      jam_selesai: { type: DataTypes.TIME, allowNull: false },
      status: {
        type: DataTypes.ENUM("aktif", "non-aktif"),
        defaultValue: "aktif"
      }
    },
    { timestamps: true }
  );
};
