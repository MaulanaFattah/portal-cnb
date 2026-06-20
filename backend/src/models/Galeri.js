const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "galeri",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false, field: "judul" },
      image: { type: DataTypes.TEXT("long"), allowNull: false, field: "gambar" },
      description: { type: DataTypes.TEXT, allowNull: true, field: "deskripsi" },
      category: { type: DataTypes.STRING, allowNull: true, field: "kategori" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "galeri",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
