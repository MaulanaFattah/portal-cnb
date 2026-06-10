const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "activity",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: false },
      image: { type: DataTypes.STRING, allowNull: true }
    },
    {
      tableName: "activity",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
