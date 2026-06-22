require("dotenv").config();
const sequelize = require("./config/database");

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    { replacements: [table, column] }
  );
  return Number(rows[0].count) > 0;
}

async function migrate() {
  await sequelize.authenticate();

  if (await columnExists("profil_guru", "jenjang")) {
    console.log("Kolom jenjang sudah ada");
    return;
  }

  await sequelize.query(
    "ALTER TABLE `profil_guru` ADD COLUMN `jenjang` ENUM('sd','smp') NULL AFTER `mata_pelajaran`"
  );
  console.log("Kolom jenjang berhasil ditambahkan");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
