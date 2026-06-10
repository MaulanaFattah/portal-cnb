const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "teacher_profile",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: "user_account_id",
        references: { model: "user_account", key: "id" }
      },
      teacher_type: {
        type: DataTypes.ENUM("wali_kelas", "mapel"),
        allowNull: false,
        defaultValue: "mapel"
      },
      subject: { type: DataTypes.STRING, allowNull: true },
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "classroom_id",
        references: { model: "classroom", key: "id" }
      },
      verification_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending"
      },
      note: { type: DataTypes.TEXT, allowNull: true },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "approved_by_user_account_id",
        references: { model: "user_account", key: "id" }
      },
      approved_at: { type: DataTypes.DATE, allowNull: true }
    },
    {
      tableName: "teacher_profile",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
