const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "pengumuman",
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

      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },

      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },

      category: {
        type: DataTypes.STRING,
        allowNull: true
      },

      image: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      timestamps: true
    }
  );
};
