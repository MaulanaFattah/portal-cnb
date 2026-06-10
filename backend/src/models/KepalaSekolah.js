const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "principal",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nip: { type: DataTypes.STRING, allowNull: false, unique: true, field: "employee_number" },
      nama: { type: DataTypes.STRING, allowNull: false, field: "name" },
      email: { type: DataTypes.STRING, allowNull: true },
      no_telepon: { type: DataTypes.STRING, allowNull: true, field: "phone_number" },
      foto: { type: DataTypes.TEXT, allowNull: true, field: "photo" },
      periode_mulai: { type: DataTypes.DATEONLY, allowNull: false, field: "start_period" },
      periode_akhir: { type: DataTypes.DATEONLY, allowNull: true, field: "end_period" },
      alamat: { type: DataTypes.TEXT, allowNull: true, field: "address" },
      pendidikan_terakhir: { type: DataTypes.STRING, allowNull: true, field: "last_education" },
      status: { type: DataTypes.ENUM("aktif", "non-aktif"), defaultValue: "aktif" }
    },
    {
      tableName: "principal",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
