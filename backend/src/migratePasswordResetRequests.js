require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("./config/database");

const queryInterface = sequelize.getQueryInterface();

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    { replacements: [tableName] }
  );
  return Number(rows[0].count) > 0;
}

async function migrate() {
  await sequelize.authenticate();

  if (await tableExists("permintaan_reset_password")) {
    console.log("Tabel permintaan_reset_password sudah ada");
    return;
  }

  console.log("Membuat tabel permintaan_reset_password");
  await queryInterface.createTable("permintaan_reset_password", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    peran: { type: DataTypes.ENUM("guru", "siswa", "orangtua"), allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    nama: { type: DataTypes.STRING, allowNull: false },
    nisn: { type: DataTypes.STRING, allowNull: true },
    kelas: { type: DataTypes.STRING, allowNull: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "completed", "rejected"),
      allowNull: false,
      defaultValue: "pending"
    },
    akun_pengguna_terkait_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "akun_pengguna", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    diproses_oleh_akun_pengguna_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "akun_pengguna", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    alasan_penolakan: { type: DataTypes.TEXT, allowNull: true },
    alamat_ip: { type: DataTypes.STRING, allowNull: true },
    agen_pengguna: { type: DataTypes.TEXT, allowNull: true },
    diproses_pada: { type: DataTypes.DATE, allowNull: true },
    dibuat_pada: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
    },
    diperbarui_pada: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP")
    }
  });

  await queryInterface.addIndex("permintaan_reset_password", ["status"], {
    name: "idx_permintaan_reset_password_status"
  });
  await queryInterface.addIndex("permintaan_reset_password", ["peran", "email", "status"], {
    name: "idx_permintaan_reset_password_peran_email_status"
  });

  console.log("Migrasi permintaan reset password selesai");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
