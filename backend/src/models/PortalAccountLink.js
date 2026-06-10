const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "portal_account_link",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_account_id",
        references: { model: "user_account", key: "id" }
      },
      siswa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "student_id",
        references: { model: "student", key: "id" }
      },
      link_type: {
        type: DataTypes.ENUM("siswa", "orangtua"),
        allowNull: false
      }
    },
    {
      tableName: "portal_account_link",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
