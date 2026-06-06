const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "portal_account_links",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      siswa_id: { type: DataTypes.INTEGER, allowNull: false },
      link_type: {
        type: DataTypes.ENUM("siswa", "orangtua"),
        allowNull: false
      }
    },
    { timestamps: true }
  );
};
