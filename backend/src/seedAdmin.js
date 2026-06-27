/**
 * ============================================================================
 * SKRIP SEED: Pembuatan Akun Administrator Awal
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini membuat satu akun pengguna dengan peran "admin" sebagai akun
 * administrator awal sistem. Email dan kata sandi diambil dari environment
 * (ADMIN_EMAIL, ADMIN_PASSWORD); bila ADMIN_PASSWORD tidak diset, skrip akan
 * membuat kata sandi sementara acak dan menampilkannya di konsol.
 *
 * KENAPA PERLU:
 * Saat sistem baru dipasang, dibutuhkan minimal satu akun admin untuk login
 * pertama kali dan mengelola data. Skrip bersifat idempoten: bila admin dengan
 * email tersebut sudah ada, skrip berhenti tanpa membuat duplikat.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH DATABASE (menyinkronkan model & MEMBUAT baris akun_pengguna
 * baru). Akun dibuat dengan flag wajib ganti kata sandi pada login pertama.
 * ============================================================================
 */

require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./models");

const User = db.User;

/**
 * Membuat kata sandi sementara acak yang aman untuk akun admin.
 *
 * @returns {string} Kata sandi sementara, mis. "ADMIN-xxxxxxxx".
 * Efek samping: tidak ada (hanya membangkitkan string acak).
 */
function generateTemporaryPassword() {
  return `ADMIN-${crypto.randomBytes(9).toString("base64url")}`;
}

/**
 * Membuat akun administrator awal bila belum ada.
 *
 * @returns {Promise<void>} Skrip mengakhiri proses (process.exit) di dalamnya.
 * Efek samping: MENGUBAH DATABASE — melakukan sequelize.sync() dan MEMBUAT
 *   baris User baru berperan admin (bila email belum terdaftar). Mencetak
 *   kredensial ke konsol dan menutup proses.
 */
async function seedAdmin() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();

    // Tentukan kredensial: dari environment, atau bangkitkan sementara.
    const adminEmail = process.env.ADMIN_EMAIL || "admin@cnb.sch.id";
    const adminPassword = process.env.ADMIN_PASSWORD || generateTemporaryPassword();
    const isGeneratedPassword = !process.env.ADMIN_PASSWORD;

    // Idempoten: jangan buat duplikat bila admin dengan email ini sudah ada.
    const existingAdmin = await User.findOne({
      where: {
        email: adminEmail
      }
    });

    if (existingAdmin) {
      console.log("Administrator sudah ada");
      process.exit();
    }

    // Hash kata sandi sebelum disimpan (tidak menyimpan plaintext).
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Buat akun admin dengan flag wajib ganti kata sandi pada login pertama.
    await User.create({
      name: "Administrator",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      profession: "Administrator Sekolah",
      must_change_password: true
    });

    // Tampilkan informasi akun; tampilkan kata sandi hanya bila dibangkitkan.
    console.log("Administrator berhasil dibuat");
    console.log(`Email: ${adminEmail}`);
    if (isGeneratedPassword) {
      console.log(`Kata sandi sementara: ${adminPassword}`);
      console.log("Simpan kata sandi ini dan ganti setelah login pertama.");
    } else {
      console.log("Kata sandi memakai ADMIN_PASSWORD dari environment.");
    }

    process.exit();
  } catch (error) {
    // Cetak error dan keluar dengan kode non-nol agar kegagalan terdeteksi.
    console.error(error);
    process.exit(1);
  }
}

// Jalankan proses seeding admin.
seedAdmin();