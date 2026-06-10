const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "user_account",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM("admin", "guru", "siswa", "orangtua"),
        defaultValue: "siswa"
      },
      profession: { type: DataTypes.STRING, allowNull: true }
    },
    {
      tableName: "user_account",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
