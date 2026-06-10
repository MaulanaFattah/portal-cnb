const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "student",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nisn: { type: DataTypes.STRING, allowNull: false, unique: true, field: "national_student_id" },
      nama: { type: DataTypes.STRING, allowNull: false, field: "name" },
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "classroom_id",
        references: { model: "classroom", key: "id" }
      },
      tempat_lahir: { type: DataTypes.STRING, allowNull: true, field: "birthplace" },
      tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: true, field: "birth_date" },
      jenis_kelamin: { type: DataTypes.ENUM("L", "P"), allowNull: false, field: "gender" },
      agama: { type: DataTypes.STRING, allowNull: true, field: "religion" },
      alamat: { type: DataTypes.TEXT, allowNull: true, field: "address" },
      nama_ayah: { type: DataTypes.STRING, allowNull: true, field: "father_name" },
      nama_ibu: { type: DataTypes.STRING, allowNull: true, field: "mother_name" },
      no_telepon: { type: DataTypes.STRING, allowNull: true, field: "phone_number" },
      email: { type: DataTypes.STRING, allowNull: true },
      foto: { type: DataTypes.TEXT, allowNull: true, field: "photo" },
      status: { type: DataTypes.ENUM("aktif", "lulus", "pindah", "keluar"), defaultValue: "aktif" }
    },
    {
      tableName: "student",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
