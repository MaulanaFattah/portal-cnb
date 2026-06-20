const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "kepala_sekolah",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nip: { type: DataTypes.STRING, allowNull: false, unique: true },
      nama: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: true },
      no_telepon: { type: DataTypes.STRING, allowNull: true },
      foto: { type: DataTypes.TEXT, allowNull: true },
      periode_mulai: { type: DataTypes.DATEONLY, allowNull: false },
      periode_akhir: { type: DataTypes.DATEONLY, allowNull: true },
      alamat: { type: DataTypes.TEXT, allowNull: true },
      pendidikan_terakhir: { type: DataTypes.STRING, allowNull: true },
      status: { type: DataTypes.ENUM("aktif", "non-aktif"), defaultValue: "aktif" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "kepala_sekolah",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
