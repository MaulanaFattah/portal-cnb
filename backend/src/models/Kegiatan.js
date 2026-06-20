const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "kegiatan",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false, field: "judul" },
      date: { type: DataTypes.DATEONLY, allowNull: false, field: "tanggal" },
      description: { type: DataTypes.TEXT, allowNull: false, field: "deskripsi" },
      image: { type: DataTypes.TEXT("long"), allowNull: true, field: "gambar" },
      status: { type: DataTypes.ENUM("tampil", "tidak_tampil"), allowNull: false, defaultValue: "tampil" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "kegiatan",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
