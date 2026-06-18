const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "activity",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      image: { type: DataTypes.TEXT("long"), allowNull: true },
      status: { type: DataTypes.ENUM("tampil", "tidak_tampil"), allowNull: false, defaultValue: "tampil" }
    },
    {
      tableName: "activity",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
