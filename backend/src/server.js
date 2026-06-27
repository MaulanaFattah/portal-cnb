// Entry point utama backend (server.js)
// Berkas ini memuat variabel lingkungan, menyiapkan koneksi database melalui
// Sequelize, lalu menjalankan server HTTP Express pada host & port yang
// ditentukan.

// Muat variabel lingkungan dari berkas .env ke process.env
require("dotenv").config();

// Impor instance aplikasi Express yang sudah dikonfigurasi
const app = require("./app");
// Impor objek db (berisi instance sequelize + semua model & relasinya)
const db = require("./models");

// Port server, diambil dari env APP_PORT atau default 4000
const PORT = process.env.APP_PORT || 4000;
// Host server, diambil dari env APP_HOST atau default 0.0.0.0 (semua antarmuka)
const HOST = process.env.APP_HOST || "0.0.0.0";

/**
 * Fungsi startServer
 * ------------------
 * Menyiapkan dan menjalankan server secara berurutan:
 *  1) Memverifikasi koneksi ke database (authenticate).
 *  2) Menyinkronkan model ke skema database (sync).
 *  3) Menjalankan server Express agar siap menerima permintaan.
 * Jika terjadi kesalahan pada salah satu tahap, error dicetak ke konsol.
 */
async function startServer() {
  try {
    // Uji koneksi ke database; melempar error bila gagal terhubung
    await db.sequelize.authenticate();

    console.log("Database terhubung");

    // Sinkronkan definisi model dengan tabel di database
    await db.sequelize.sync();

    console.log("Database tersinkronisasi");

    // Jalankan server HTTP dan mulai mendengarkan permintaan
    app.listen(PORT, HOST, () => {
      console.log(
        `Backend berjalan di http://${HOST}:${PORT}`
      );
    });

  } catch (error) {
    // Tangani kegagalan saat startup (mis. koneksi DB gagal) dengan mencetak error
    console.error(error);
  }
}

// Mulai proses startup server
startServer();
