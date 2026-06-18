const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "student_attendance",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      siswa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "student_id",
        references: { model: "student", key: "id" }
      },
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "classroom_id",
        references: { model: "classroom", key: "id" }
      },
      guru_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "teacher_user_account_id",
        references: { model: "user_account", key: "id" }
      },
      jadwal_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "teaching_schedule_id",
        references: { model: "teaching_schedule", key: "id" }
      },
      tanggal: { type: DataTypes.DATEONLY, allowNull: false, field: "attendance_date" },
      hari: { type: DataTypes.STRING, allowNull: false, field: "day_name" },
      tipe_guru: { type: DataTypes.ENUM("wali_kelas", "mapel"), allowNull: false, field: "teacher_type" },
      mapel: { type: DataTypes.STRING, allowNull: true, field: "subject" },
      status: {
        type: DataTypes.ENUM("hadir", "izin", "sakit", "alpha"),
        allowNull: false
      },
      keterangan: { type: DataTypes.TEXT, allowNull: true, field: "note" }
    },
    {
      tableName: "student_attendance",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
