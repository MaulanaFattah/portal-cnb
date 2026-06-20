const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "tautan_akun_portal",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      siswa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "siswa_id",
        references: { model: "siswa", key: "id" }
      },
      link_type: {
        type: DataTypes.ENUM("siswa", "orangtua"),
        field: "jenis_tautan",
        allowNull: false
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "tautan_akun_portal",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
