const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "guru_profiles",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      teacher_type: {
        type: DataTypes.ENUM("wali_kelas", "mapel"),
        allowNull: false,
        defaultValue: "mapel"
      },
      subject: { type: DataTypes.STRING, allowNull: true },
      kelas_id: { type: DataTypes.INTEGER, allowNull: true },
      verification_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending"
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      approved_by: { type: DataTypes.INTEGER, allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true }
    },
    { timestamps: true }
  );
};
