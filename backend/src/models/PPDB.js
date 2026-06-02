const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "ppdb",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      nama_lengkap: {
        type: DataTypes.STRING,
        allowNull: false
      },

      nisn: {
        type: DataTypes.STRING,
        allowNull: true
      },

      tempat_lahir: {
        type: DataTypes.STRING,
        allowNull: false
      },

      tanggal_lahir: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },

      jenis_kelamin: {
        type: DataTypes.ENUM("L", "P"),
        allowNull: false
      },

      agama: {
        type: DataTypes.STRING,
        allowNull: false
      },

      alamat: {
        type: DataTypes.TEXT,
        allowNull: false
      },

      nama_ayah: {
        type: DataTypes.STRING,
        allowNull: false
      },

      nama_ibu: {
        type: DataTypes.STRING,
        allowNull: false
      },

      pekerjaan_ayah: {
        type: DataTypes.STRING,
        allowNull: true
      },

      pekerjaan_ibu: {
        type: DataTypes.STRING,
        allowNull: true
      },

      no_telepon: {
        type: DataTypes.STRING,
        allowNull: false
      },

      email: {
        type: DataTypes.STRING,
        allowNull: true
      },

      asal_sekolah: {
        type: DataTypes.STRING,
        allowNull: true
      },

      status: {
        type: DataTypes.ENUM("pending", "diterima", "ditolak"),
        defaultValue: "pending"
      },

      tahun_ajaran: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      timestamps: true
    }
  );
};
