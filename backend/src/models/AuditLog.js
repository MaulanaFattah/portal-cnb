const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "audit_log",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      actor_user_account_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "user_account", key: "id" }
      },
      action: { type: DataTypes.STRING, allowNull: false },
      entity_type: { type: DataTypes.STRING, allowNull: false },
      entity_id: { type: DataTypes.STRING, allowNull: true },
      metadata: { type: DataTypes.TEXT, allowNull: true },
      ip_address: { type: DataTypes.STRING, allowNull: true },
      user_agent: { type: DataTypes.TEXT, allowNull: true }
    },
    {
      tableName: "audit_log",
      freezeTableName: true,
      underscored: true,
      timestamps: true,
      updatedAt: false
    }
  );
};
