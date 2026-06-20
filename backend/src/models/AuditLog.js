const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "log_audit",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      actor_user_account_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "pelaku_akun_pengguna_id",
        references: { model: "akun_pengguna", key: "id" }
      },
      action: { type: DataTypes.STRING, allowNull: false, field: "aksi" },
      entity_type: { type: DataTypes.STRING, allowNull: false, field: "jenis_entitas" },
      entity_id: { type: DataTypes.STRING, allowNull: true, field: "entitas_id" },
      metadata: { type: DataTypes.TEXT, allowNull: true },
      ip_address: { type: DataTypes.STRING, allowNull: true, field: "alamat_ip" },
      user_agent: { type: DataTypes.TEXT, allowNull: true, field: "agen_pengguna" },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: "dibuat_pada" }
    },
    {
      tableName: "log_audit",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      updatedAt: false
    }
  );
};
