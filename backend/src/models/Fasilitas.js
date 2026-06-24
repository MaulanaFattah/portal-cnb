const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "fasilitas",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false, field: "nama" },
      description: { type: DataTypes.TEXT, allowNull: false, field: "deskripsi" },
      image: { type: DataTypes.TEXT("long"), allowNull: true, field: "gambar" },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "urutan" },
      status: { type: DataTypes.ENUM("tampil", "sembunyi"), allowNull: false, defaultValue: "tampil" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "fasilitas",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};