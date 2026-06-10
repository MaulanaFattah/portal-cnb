const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "teaching_schedule",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      guru_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "teacher_user_account_id",
        references: { model: "user_account", key: "id" }
      },
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "classroom_id",
        references: { model: "classroom", key: "id" }
      },
      mapel: { type: DataTypes.STRING, allowNull: false, field: "subject" },
      hari: {
        type: DataTypes.ENUM("senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"),
        allowNull: false,
        field: "day_name"
      },
      jam_mulai: { type: DataTypes.TIME, allowNull: false, field: "start_time" },
      jam_selesai: { type: DataTypes.TIME, allowNull: false, field: "end_time" },
      status: { type: DataTypes.ENUM("aktif", "non-aktif"), defaultValue: "aktif" }
    },
    {
      tableName: "teaching_schedule",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
