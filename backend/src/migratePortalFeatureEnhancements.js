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

  if (await tableExists("akun_pengguna")) {
    console.log("Memperbarui enum akun_pengguna.peran");
    await sequelize.query("ALTER TABLE `akun_pengguna` MODIFY `peran` ENUM('admin','guru','siswa','orangtua','kepala_sekolah') NOT NULL DEFAULT 'siswa'");
  }

  if (await tableExists("kegiatan")) {
    await addColumnIfMissing("kegiatan", "status", {
      type: DataTypes.ENUM("tampil", "tidak_tampil"),
      allowNull: false,
      defaultValue: "tampil"
    });
    console.log("Memperbarui kolom kegiatan.gambar");
    await queryInterface.changeColumn("kegiatan", "gambar", { type: DataTypes.TEXT("long"), allowNull: true });
  }

  if (await tableExists("absensi_siswa")) {
    console.log("Memperbarui kolom absensi_siswa.status");
    await sequelize.query("ALTER TABLE `absensi_siswa` MODIFY `status` ENUM('hadir','izin','sakit','alpha') NOT NULL");
  }

  console.log("Migrasi peningkatan fitur portal selesai");
}

migrate()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
