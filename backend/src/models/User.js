const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "user_account",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      password: { type: DataTypes.STRING, allowNull: false },
      role: {
        type: DataTypes.ENUM("admin", "guru", "siswa", "orangtua", "kepala_sekolah"),
        defaultValue: "siswa"
      },
      profession: { type: DataTypes.STRING, allowNull: true },
      must_change_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
    },
    {
      tableName: "user_account",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
