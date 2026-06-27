// Konfigurasi koneksi database (config/database.js)
// Berkas ini membuat dan mengekspor satu instance Sequelize yang dipakai
// bersama di seluruh aplikasi untuk terhubung ke database MySQL. Kredensial
// dan parameter koneksi dibaca dari variabel lingkungan (process.env).

const { Sequelize } = require("sequelize");

// Inisialisasi instance Sequelize dengan nama database, user, dan password
// dari env, beserta opsi koneksi (host, port, dialect MySQL, logging dimatikan).
const sequelize = new Sequelize(
  process.env.DB_NAME,      // Nama database
  process.env.DB_USER,      // Username database
  process.env.DB_PASSWORD,  // Password database
  {
    host: process.env.DB_HOST,  // Host/alamat server database
    port: process.env.DB_PORT,  // Port server database
    dialect: "mysql",           // Jenis database yang digunakan (MySQL)
    logging: false              // Nonaktifkan log query SQL ke konsol
  }
);

// Ekspor instance agar dipakai ulang oleh model dan modul lain
module.exports = sequelize;
