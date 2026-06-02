const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "profil_sekolah",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      nama_sekolah: {
        type: DataTypes.STRING,
        allowNull: false
      },

      npsn: {
        type: DataTypes.STRING,
        allowNull: true
      },

      alamat: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      telepon: {
        type: DataTypes.STRING,
        allowNull: true
      },

      email: {
        type: DataTypes.STRING,
        allowNull: true
      },

      website: {
        type: DataTypes.STRING,
        allowNull: true
      },

      logo: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      visi: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      misi: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      sejarah: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      akreditasi: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      timestamps: true
    }
  );
};
