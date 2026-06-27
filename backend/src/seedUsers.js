/**
 * ============================================================================
 * SKRIP SEED: Pembuatan Akun Pengguna Uji (Siswa, Orang Tua, Kepala Sekolah)
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini membuat tiga akun pengguna untuk keperluan pengujian/awal: siswa,
 * orang tua, dan kepala sekolah. Email & kata sandi diambil dari environment
 * (SEED_*_EMAIL, SEED_*_PASSWORD); bila kata sandi tidak diset, dibangkitkan
 * sementara dan ditampilkan di konsol. Untuk akun siswa & orang tua, skrip juga
 * menautkannya ke siswa pertama (berdasarkan urutan nama) melalui
 * PortalAccountLink.
 *
 * KENAPA PERLU:
 * Memudahkan penyiapan lingkungan pengujian dengan akun-akun representatif tiap
 * peran. Skrip bersifat idempoten: akun/tautan yang sudah ada tidak diduplikasi.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH DATABASE (sequelize.sync() serta MEMBUAT baris akun_pengguna
 * dan tautan_akun_portal). Akun dibuat dengan flag wajib ganti kata sandi.
 * ============================================================================
 */

require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("./models");

const User = db.User;
const Siswa = db.Siswa;
const PortalAccountLink = db.PortalAccountLink;

/**
 * Membuat kata sandi sementara acak dengan prefix tertentu.
 *
 * @param {string} prefix Awalan kata sandi (mis. "SISWA", "ORTU", "KEPSEK").
 * @returns {string} Kata sandi sementara, mis. "SISWA-xxxxxxxx".
 * Efek samping: tidak ada (hanya membangkitkan string acak).
 */
function generateTemporaryPassword(prefix) {
  return `${prefix}-${crypto.randomBytes(8).toString("base64url")}`;
}

/**
 * Menentukan kata sandi seed: memakai nilai dari environment bila ada, atau
 * membangkitkan kata sandi sementara bila tidak.
 *
 * @param {string} envName Nama variabel environment yang dicek.
 * @param {string} prefix Awalan untuk kata sandi sementara bila dibangkitkan.
 * @returns {{value: string, envName: string, generated: boolean}} Objek berisi
 *   nilai kata sandi, nama env terkait, dan penanda apakah dibangkitkan.
 * Efek samping: tidak ada (hanya membaca env & membentuk objek).
 */
function seedPassword(envName, prefix) {
  return {
    value: process.env[envName] || generateTemporaryPassword(prefix),
    envName,
    generated: !process.env[envName]
  };
}

/**
 * Membuat akun pengguna uji untuk peran siswa, orang tua, dan kepala sekolah,
 * lalu menautkan akun siswa/orang tua ke siswa pertama.
 *
 * @returns {Promise<void>} Skrip mengakhiri proses (process.exit) di dalamnya.
 * Efek samping: MENGUBAH DATABASE — melakukan sequelize.sync(), MEMBUAT akun
 *   pengguna baru (bila email belum ada) dengan kata sandi ter-hash & flag
 *   wajib ganti kata sandi, serta MEMBUAT tautan PortalAccountLink. Mencetak
 *   kredensial/status ke konsol lalu menutup proses.
 */
async function seedUsers() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();

    // Siapkan kata sandi untuk masing-masing peran (dari env atau dibangkitkan).
    const siswaPassword = seedPassword("SEED_SISWA_PASSWORD", "SISWA");
    const orangtuaPassword = seedPassword("SEED_ORANGTUA_PASSWORD", "ORTU");
    const kepsekPassword = seedPassword("SEED_KEPSEK_PASSWORD", "KEPSEK");

    // Definisi tiga akun uji beserta peran dan profesinya.
    const users = [
      {
        name: "Siswa Testing",
        email: process.env.SEED_SISWA_EMAIL || "siswa@cnb.sch.id",
        password: siswaPassword,
        role: "siswa",
        profession: "Siswa"
      },
      {
        name: "Orang Tua Testing",
        email: process.env.SEED_ORANGTUA_EMAIL || "orangtua@cnb.sch.id",
        password: orangtuaPassword,
        role: "orangtua",
        profession: "Orang Tua"
      },
      {
        name: "Kepala Sekolah Testing",
        email: process.env.SEED_KEPSEK_EMAIL || "kepsek@cnb.sch.id",
        password: kepsekPassword,
        role: "kepala_sekolah",
        profession: "Kepala Sekolah"
      }
    ];

    // Ambil siswa pertama (urut nama) sebagai target tautan akun siswa/orangtua.
    const firstStudent = await Siswa.findOne({ order: [["nama", "ASC"]] });

    for (const item of users) {
      // Idempoten: cek apakah akun dengan email ini sudah ada.
      const existingUser = await User.findOne({
        where: { email: item.email }
      });
      let user = existingUser;

      if (!existingUser) {
        // Hash kata sandi lalu buat akun baru dengan flag wajib ganti sandi.
        const hashedPassword = await bcrypt.hash(item.password.value, 10);

        user = await User.create({
          name: item.name,
          email: item.email,
          password: hashedPassword,
          role: item.role,
          profession: item.profession,
          must_change_password: true
        });

        console.log(`${item.role} berhasil dibuat: ${item.email}`);
        if (item.password.generated) {
          console.log(`Kata sandi sementara ${item.role}: ${item.password.value}`);
        } else {
          console.log(`Kata sandi ${item.role} memakai ${item.password.envName} dari environment.`);
        }
      } else {
        console.log(`${item.role} sudah ada: ${item.email}`);
      }

      // Untuk peran siswa & orangtua, tautkan ke siswa pertama bila ada dan
      // belum ada tautan dengan jenis yang sama.
      if (firstStudent && ["siswa", "orangtua"].includes(item.role)) {
        const existingLink = await PortalAccountLink.findOne({ where: { user_id: user.id, link_type: item.role } });
        if (!existingLink) {
          await PortalAccountLink.create({ user_id: user.id, siswa_id: firstStudent.id, link_type: item.role });
          console.log(`Tautan ${item.role} -> ${firstStudent.nama} dibuat`);
        }
      }
    }

    process.exit();
  } catch (error) {
    // Cetak error dan keluar dengan kode non-nol agar kegagalan terdeteksi.
    console.error(error);
    process.exit(1);
  }
}

// Jalankan proses seeding pengguna uji.
seedUsers();