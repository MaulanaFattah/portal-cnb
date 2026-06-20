const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "pengumuman",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: { type: DataTypes.STRING, allowNull: false, field: "judul" },
      date: { type: DataTypes.DATEONLY, allowNull: false, field: "tanggal" },
      content: { type: DataTypes.TEXT, allowNull: false, field: "isi" },
      category: { type: DataTypes.STRING, allowNull: true, field: "kategori" },
      image: { type: DataTypes.TEXT, allowNull: true, field: "gambar" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "pengumuman",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
