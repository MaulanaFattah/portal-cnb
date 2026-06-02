const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "siswa",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      nisn: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },

      nama: {
        type: DataTypes.STRING,
        allowNull: false
      },

      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      tempat_lahir: {
        type: DataTypes.STRING,
        allowNull: true
      },

      tanggal_lahir: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },

      jenis_kelamin: {
        type: DataTypes.ENUM("L", "P"),
        allowNull: false
      },

      agama: {
        type: DataTypes.STRING,
        allowNull: true
      },

      alamat: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      nama_ayah: {
        type: DataTypes.STRING,
        allowNull: true
      },

      nama_ibu: {
        type: DataTypes.STRING,
        allowNull: true
      },

      no_telepon: {
        type: DataTypes.STRING,
        allowNull: true
      },

      email: {
        type: DataTypes.STRING,
        allowNull: true
      },

      foto: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      status: {
        type: DataTypes.ENUM("aktif", "lulus", "pindah", "keluar"),
        defaultValue: "aktif"
      }
    },
    {
      timestamps: true
    }
  );
};
