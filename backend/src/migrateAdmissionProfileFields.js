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

async function changeColumnIfExists(tableName, columnName, definition) {
  if (!(await tableExists(tableName)) || !(await columnExists(tableName, columnName))) return;
  console.log(`Mengubah kolom ${tableName}.${columnName}`);
  await queryInterface.changeColumn(tableName, columnName, definition);
}

async function migrate() {
  await sequelize.authenticate();

  await addColumnIfMissing("admission_application", "registration_type", {
    type: DataTypes.ENUM("pendaftaran_baru", "siswa_pindahan"),
    allowNull: false,
    defaultValue: "pendaftaran_baru"
  });
  await addColumnIfMissing("admission_application", "target_level", {
    type: DataTypes.ENUM("tk", "sd", "smp"),
    allowNull: false,
    defaultValue: "tk"
  });
  await addColumnIfMissing("admission_application", "parent_name", { type: DataTypes.STRING, allowNull: true });
  await addColumnIfMissing("admission_application", "family_card_file", { type: DataTypes.TEXT("long"), allowNull: true });
  await addColumnIfMissing("admission_application", "report_file", { type: DataTypes.TEXT("long"), allowNull: true });
  await addColumnIfMissing("admission_application", "student_photo_file", { type: DataTypes.TEXT("long"), allowNull: true });
  await addColumnIfMissing("admission_application", "transfer_letter_file", { type: DataTypes.TEXT("long"), allowNull: true });
  await addColumnIfMissing("admission_application", "notification_note", { type: DataTypes.TEXT, allowNull: true });

  await sequelize.query("UPDATE admission_application SET parent_name = COALESCE(parent_name, father_name, mother_name, 'Orang Tua/Wali') WHERE parent_name IS NULL");
  await sequelize.query("UPDATE admission_application SET email = CONCAT('orangtua-', id, '@example.local') WHERE email IS NULL OR email = ''");
  await changeColumnIfExists("admission_application", "parent_name", { type: DataTypes.STRING, allowNull: false });
  await changeColumnIfExists("admission_application", "birthplace", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("admission_application", "religion", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("admission_application", "father_name", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("admission_application", "mother_name", { type: DataTypes.STRING, allowNull: true });
  await changeColumnIfExists("admission_application", "email", { type: DataTypes.STRING, allowNull: false });

  await addColumnIfMissing("school_profile", "facility", { type: DataTypes.TEXT, allowNull: true });
  await addColumnIfMissing("school_profile", "school_structure", { type: DataTypes.TEXT, allowNull: true });
  await changeColumnIfExists("gallery", "image", { type: DataTypes.TEXT("long"), allowNull: false });

  console.log("Migrasi field penerimaan dan profil sekolah selesai");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
