require("dotenv").config();

const { DataTypes } = require("sequelize");
const sequelize = require("./config/database");
const { ensureUploadFolders } = require("./utils/uploadStorage");

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

async function createAuditLog() {
  if (await tableExists("audit_log")) return;

  console.log("Membuat tabel audit_log");
  await queryInterface.createTable("audit_log", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    actor_user_account_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "user_account", key: "id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    },
    action: { type: DataTypes.STRING, allowNull: false },
    entity_type: { type: DataTypes.STRING, allowNull: false },
    entity_id: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.TEXT, allowNull: true },
    ip_address: { type: DataTypes.STRING, allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false }
  });
}

async function migrateLegacyTeacherProfiles() {
  if (!(await tableExists("teacher_profile")) || !(await columnExists("teacher_profile", "is_homeroom"))) return;

  console.log("Mengisi ulang teacher_profile.is_homeroom dari teacher_type lama");
  await sequelize.query("UPDATE `teacher_profile` SET `is_homeroom` = 1 WHERE `teacher_type` = 'wali_kelas'");
  await sequelize.query("UPDATE `teacher_profile` SET `is_homeroom` = 0 WHERE `is_homeroom` IS NULL");
}

async function migrate() {
  ensureUploadFolders();
  await sequelize.authenticate();

  await addColumnIfMissing("user_account", "must_change_password", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  await addColumnIfMissing("teacher_profile", "is_homeroom", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  await createAuditLog();
  await migrateLegacyTeacherProfiles();

  console.log("Migrasi revisi RBAC absensi selesai");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
