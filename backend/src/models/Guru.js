const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "guru",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nip: { type: DataTypes.STRING, allowNull: false, unique: true },
      nama: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: true },
      no_telepon: { type: DataTypes.STRING, allowNull: true },
      mata_pelajaran: { type: DataTypes.STRING, allowNull: true },
      pendidikan_terakhir: { type: DataTypes.STRING, allowNull: true },
      foto: { type: DataTypes.TEXT, allowNull: true },
      alamat: { type: DataTypes.TEXT, allowNull: true },
      tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: true },
      jenis_kelamin: { type: DataTypes.ENUM("L", "P"), allowNull: true },
      status: { type: DataTypes.ENUM("aktif", "non-aktif"), defaultValue: "aktif" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "guru",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
