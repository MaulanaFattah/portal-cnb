const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "kelas",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      nama_kelas: {
        type: DataTypes.STRING,
        allowNull: false
      },

      tingkat: {
        type: DataTypes.STRING,
        allowNull: false
      },

      wali_kelas: {
        type: DataTypes.STRING,
        allowNull: true
      },

      tahun_ajaran: {
        type: DataTypes.STRING,
        allowNull: false
      },

      jumlah_siswa: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },

      ruangan: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      timestamps: true
    }
  );
};
