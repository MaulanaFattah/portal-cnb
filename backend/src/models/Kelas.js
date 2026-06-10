const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "classroom",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nama_kelas: { type: DataTypes.STRING, allowNull: false, field: "class_name" },
      tingkat: { type: DataTypes.STRING, allowNull: false, field: "grade_level" },
      wali_kelas: { type: DataTypes.STRING, allowNull: true, field: "homeroom_teacher" },
      tahun_ajaran: { type: DataTypes.STRING, allowNull: false, field: "academic_year" },
      jumlah_siswa: { type: DataTypes.INTEGER, defaultValue: 0, field: "student_count" },
      ruangan: { type: DataTypes.STRING, allowNull: true, field: "room" }
    },
    {
      tableName: "classroom",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
