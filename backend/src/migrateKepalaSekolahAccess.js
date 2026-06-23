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

async function columnExists(tableName, columnName) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    { replacements: [tableName, columnName] }
  );
  return Number(rows[0].count) > 0;
}

async function addColumnIfMissing(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || await columnExists(tableName, columnName)) return;
  console.log(`Menambahkan kolom ${tableName}.${columnName}`);
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function migrate() {
  await sequelize.authenticate();

  await addColumnIfMissing("kepala_sekolah", "akun_pengguna_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
    references: { model: "akun_pengguna", key: "id" },
    onDelete: "SET NULL",
    onUpdate: "CASCADE"
  });

  await addColumnIfMissing("kepala_sekolah", "jenjang", {
    type: DataTypes.ENUM("sd", "smp"),
    allowNull: true
  });

  console.log("Migrasi akses kepala sekolah selesai");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
