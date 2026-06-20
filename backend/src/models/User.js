const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "akun_pengguna",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false, field: "nama" },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false, field: "kata_sandi" },
      role: {
        type: DataTypes.ENUM("admin", "guru", "siswa", "orangtua", "kepala_sekolah"),
        field: "peran",
        defaultValue: "siswa"
      },
      profession: { type: DataTypes.STRING, allowNull: true, field: "profesi" },
      must_change_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "wajib_ganti_kata_sandi" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "akun_pengguna",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
