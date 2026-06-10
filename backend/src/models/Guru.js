const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "teacher",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nip: { type: DataTypes.STRING, allowNull: false, unique: true, field: "employee_number" },
      nama: { type: DataTypes.STRING, allowNull: false, field: "name" },
      email: { type: DataTypes.STRING, allowNull: true },
      no_telepon: { type: DataTypes.STRING, allowNull: true, field: "phone_number" },
      mata_pelajaran: { type: DataTypes.STRING, allowNull: true, field: "subject" },
      pendidikan_terakhir: { type: DataTypes.STRING, allowNull: true, field: "last_education" },
      foto: { type: DataTypes.TEXT, allowNull: true, field: "photo" },
      alamat: { type: DataTypes.TEXT, allowNull: true, field: "address" },
      tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: true, field: "birth_date" },
      jenis_kelamin: { type: DataTypes.ENUM("L", "P"), allowNull: true, field: "gender" },
      status: { type: DataTypes.ENUM("aktif", "non-aktif"), defaultValue: "aktif" }
    },
    {
      tableName: "teacher",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
