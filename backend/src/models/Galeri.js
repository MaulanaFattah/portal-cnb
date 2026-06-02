const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "galeri",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      title: {
        type: DataTypes.STRING,
        allowNull: false
      },

      image: {
        type: DataTypes.TEXT,
        allowNull: false
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      category: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      timestamps: true
    }
  );
};
