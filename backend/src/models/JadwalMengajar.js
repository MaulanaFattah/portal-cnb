const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "jadwal_mengajar",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      guru_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "guru_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "kelas_id",
        references: { model: "kelas", key: "id" }
      },
      mapel: { type: DataTypes.STRING, allowNull: false, field: "mata_pelajaran" },
      hari: {
        type: DataTypes.ENUM("senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"),
        allowNull: false,
        field: "hari"
      },
      jam_mulai: { type: DataTypes.TIME, allowNull: false },
      jam_selesai: { type: DataTypes.TIME, allowNull: false },
      status: { type: DataTypes.ENUM("aktif", "non-aktif"), defaultValue: "aktif" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "jadwal_mengajar",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
