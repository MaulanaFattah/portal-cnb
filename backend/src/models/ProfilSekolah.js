const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  return sequelize.define(
    "school_profile",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      nama_sekolah: { type: DataTypes.STRING, allowNull: false, field: "school_name" },
      npsn: { type: DataTypes.STRING, allowNull: true },
      alamat: { type: DataTypes.TEXT, allowNull: true, field: "address" },
      telepon: { type: DataTypes.STRING, allowNull: true, field: "phone_number" },
      email: { type: DataTypes.STRING, allowNull: true },
      website: { type: DataTypes.STRING, allowNull: true },
      logo: { type: DataTypes.TEXT, allowNull: true },
      visi: { type: DataTypes.TEXT, allowNull: true, field: "vision" },
      misi: { type: DataTypes.TEXT, allowNull: true, field: "mission" },
      sejarah: { type: DataTypes.TEXT, allowNull: true, field: "history" },
      fasilitas: { type: DataTypes.TEXT, allowNull: true, field: "facility" },
      struktur_sekolah: { type: DataTypes.TEXT, allowNull: true, field: "school_structure" },
      akreditasi: { type: DataTypes.STRING, allowNull: true, field: "accreditation" }
    },
    {
      tableName: "school_profile",
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  );
};
