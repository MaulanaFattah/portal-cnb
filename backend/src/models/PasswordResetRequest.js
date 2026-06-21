const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "permintaan_reset_password",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      role: {
        type: DataTypes.ENUM("guru", "siswa", "orangtua", "kepala_sekolah"),
        allowNull: false,
        field: "peran"
      },
      email: { type: DataTypes.STRING, allowNull: false },
      name: { type: DataTypes.STRING, allowNull: false, field: "nama" },
      nisn: { type: DataTypes.STRING, allowNull: true },
      class_name: { type: DataTypes.STRING, allowNull: true, field: "kelas" },
      notes: { type: DataTypes.TEXT, allowNull: true, field: "catatan" },
      status: {
        type: DataTypes.ENUM("pending", "completed", "rejected"),
        allowNull: false,
        defaultValue: "pending"
      },
      matched_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "akun_pengguna_terkait_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      processed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "diproses_oleh_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      rejection_reason: { type: DataTypes.TEXT, allowNull: true, field: "alasan_penolakan" },
      ip_address: { type: DataTypes.STRING, allowNull: true, field: "alamat_ip" },
      user_agent: { type: DataTypes.TEXT, allowNull: true, field: "agen_pengguna" },
      processed_at: { type: DataTypes.DATE, allowNull: true, field: "diproses_pada" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: "diperbarui_pada" }
    },
    {
      tableName: "permintaan_reset_password",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["status"] },
        { fields: ["peran", "email", "status"] }
      ]
    }
  );
};
