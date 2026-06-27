const db = require("./models");

async function run() {
  try {
    await db.sequelize.authenticate();
    console.log("Database terhubung");

    // Tambah kolom yang belum ada pada tabel riwayat_kelas tanpa mengubah tabel lain.
    await db.RiwayatKelas.sync({ alter: true });

    console.log("Tabel riwayat_kelas berhasil disinkronkan (kolom status ditambahkan jika belum ada).");
    process.exit(0);
  } catch (error) {
    console.error("Gagal migrasi riwayat_kelas:", error.message);
    process.exit(1);
  }
}

run();
