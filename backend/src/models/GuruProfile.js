const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "profil_guru",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        field: "akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      teacher_type: {
        type: DataTypes.ENUM("wali_kelas", "mapel"),
        allowNull: false,
        field: "tipe_guru",
        defaultValue: "mapel"
      },
      subject: { type: DataTypes.STRING, allowNull: true, field: "mata_pelajaran" },
      is_homeroom: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "wali_kelas" },
      kelas_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "kelas_id",
        references: { model: "kelas", key: "id" }
      },
      verification_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        field: "status_verifikasi",
        defaultValue: "pending"
      },
      note: { type: DataTypes.TEXT, allowNull: true, field: "catatan" },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "disetujui_oleh_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      approved_at: { type: DataTypes.DATE, allowNull: true, field: "disetujui_pada" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "profil_guru",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
