/**
 * ============================================================================
 * SKRIP UTILITAS/SINKRONISASI: Migrasi Pendaftaran Guru dari Skema Lama (Legacy)
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini menyinkronkan data guru dari tabel-tabel skema lama (legacy)
 * berbahasa Inggris — yaitu "user_account" (peran 'guru') dan "teacher_profile"
 * — ke struktur model terbaru (User & GuruProfile). Untuk tiap guru lama yang
 * belum ada di tabel User, skrip membuat akun User baru dan profil GuruProfile
 * yang sesuai, termasuk pemetaan tipe guru (wali_kelas/mapel) dan relasi kelas.
 *
 * KENAPA PERLU:
 * Setelah migrasi penamaan skema, data guru lama perlu "diangkat" ke struktur
 * baru agar tidak hilang. Skrip bersifat idempoten: guru yang akunnya sudah ada
 * akan dilewati (skipped), dan profil hanya dibuat bila belum ada.
 *
 * MODE PENGGUNAAN:
 * - Sebagai modul   : mengekspor fungsi syncLegacyGuruRegistrations() untuk
 *   dipanggil dari skrip lain (tidak otomatis menutup koneksi).
 * - Sebagai skrip CLI: bila dijalankan langsung (require.main === module),
 *   skrip mengautentikasi DB, menjalankan sinkronisasi, mencetak ringkasan,
 *   menutup koneksi, dan keluar.
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH DATABASE (MEMBUAT baris User & GuruProfile baru). Jangan
 * dijalankan tanpa backup.
 * ============================================================================
 */

require("dotenv").config();

const db = require("./models");

const User = db.User;
const GuruProfile = db.GuruProfile;
const Kelas = db.Kelas;

/**
 * Memeriksa apakah sebuah tabel ada di database yang sedang aktif.
 *
 * @param {string} tableName Nama tabel yang diperiksa.
 * @returns {Promise<boolean>} true jika tabel ada, false jika tidak.
 * Efek samping: hanya membaca information_schema.
 */
async function tableExists(tableName) {
  const [rows] = await db.sequelize.query(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    { replacements: [tableName] }
  );
  return rows.length > 0;
}

/**
 * Mengambil satu baris profil guru lama dari tabel "teacher_profile"
 * berdasarkan id akun pengguna lama.
 *
 * @param {number|string} legacyUserId Id akun pengguna pada skema lama.
 * @returns {Promise<object|null>} Baris profil guru legacy, atau null bila
 *   tabel tidak ada / data tidak ditemukan.
 * Efek samping: hanya membaca data (SELECT).
 */
async function findLegacyTeacherProfile(legacyUserId) {
  if (!(await tableExists("teacher_profile"))) return null;
  const [rows] = await db.sequelize.query(
    "SELECT * FROM `teacher_profile` WHERE `user_account_id` = ? LIMIT 1",
    { replacements: [legacyUserId] }
  );
  return rows[0] || null;
}

/**
 * Menentukan apakah label mata pelajaran lama sebenarnya menandakan peran
 * "wali kelas" (bukan mata pelajaran sungguhan).
 *
 * @param {*} value Nilai label/mata pelajaran dari data lama.
 * @returns {boolean} true jika label mengindikasikan wali kelas/guru umum.
 * Efek samping: tidak ada (fungsi murni).
 */
function isHomeroomSubjectLabel(value) {
  const text = String(value || "").trim().toLowerCase();
  return ["wali kelas", "guru wali kelas", "guru"].includes(text);
}

/**
 * Menyinkronkan seluruh pendaftaran guru dari skema lama ke struktur baru.
 * Mengiterasi setiap baris user_account berperan 'guru', membuat akun User &
 * profil GuruProfile bila belum ada, sambil memetakan tipe guru dan kelas.
 *
 * @returns {Promise<{imported: number, skipped: number}>} Ringkasan jumlah guru
 *   yang berhasil diimpor dan yang dilewati.
 * Efek samping: MENGUBAH DATABASE — MEMBUAT baris User & GuruProfile baru.
 *   Tidak melakukan apa pun bila tabel legacy user_account tidak ada.
 */
async function syncLegacyGuruRegistrations() {
  // Bila tabel legacy tidak ada, tidak ada yang perlu disinkronkan.
  if (!(await tableExists("user_account"))) {
    console.log("Tabel legacy user_account tidak ditemukan. Tidak ada data guru lama yang perlu disinkronkan.");
    return { imported: 0, skipped: 0 };
  }

  // Ambil semua akun guru lama, diurutkan dari yang paling lama dibuat.
  const [legacyUsers] = await db.sequelize.query(
    "SELECT * FROM `user_account` WHERE `role` = 'guru' ORDER BY `created_at` ASC"
  );

  let imported = 0;
  let skipped = 0;

  for (const legacyUser of legacyUsers) {
    // Validasi email; lewati baris tanpa email yang valid.
    const email = String(legacyUser.email || "").trim().toLowerCase();
    if (!email) {
      skipped += 1;
      continue;
    }

    // Buat akun User baru bila belum ada; jika sudah ada, lewati (idempoten).
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        name: legacyUser.name || "Guru",
        email,
        password: legacyUser.password,
        role: "guru",
        profession: legacyUser.profession || "Guru",
        must_change_password: false,
        createdAt: legacyUser.created_at || new Date(),
        updatedAt: legacyUser.updated_at || new Date()
      });
      imported += 1;
    } else {
      skipped += 1;
    }

    // Bila profil guru untuk user ini sudah ada, jangan buat ulang.
    const existingProfile = await GuruProfile.findOne({ where: { user_id: user.id } });
    if (existingProfile) continue;

    // Ambil profil legacy untuk memetakan tipe guru, mata pelajaran, dan kelas.
    const legacyProfile = await findLegacyTeacherProfile(legacyUser.id);
    const legacyClassId = Number(legacyProfile?.classroom_id || 0);
    const kelas = legacyClassId ? await Kelas.findByPk(legacyClassId) : null;
    const teacherType = legacyProfile?.teacher_type || "mapel";
    const legacySubject = legacyProfile?.subject || legacyUser.profession || null;
    // Wali kelas tidak memiliki mata pelajaran spesifik -> set subject null.
    const subject = teacherType === "wali_kelas" || isHomeroomSubjectLabel(legacySubject) ? null : legacySubject;

    // Buat profil guru baru pada struktur model terbaru.
    await GuruProfile.create({
      user_id: user.id,
      teacher_type: teacherType === "wali_kelas" ? "wali_kelas" : "mapel",
      subject,
      is_homeroom: teacherType === "wali_kelas",
      kelas_id: kelas ? kelas.id : null,
      verification_status: legacyProfile?.verification_status || "pending",
      note: legacyProfile?.note || null,
      approved_at: legacyProfile?.approved_at || null,
      createdAt: legacyProfile?.created_at || legacyUser.created_at || new Date(),
      updatedAt: legacyProfile?.updated_at || legacyUser.updated_at || new Date()
    });
  }

  return { imported, skipped };
}

// Mode CLI: bila file dijalankan langsung (bukan di-require), jalankan
// sinkronisasi end-to-end lalu cetak ringkasan dan tutup koneksi.
if (require.main === module) {
  (async () => {
    try {
      await db.sequelize.authenticate();
      const result = await syncLegacyGuruRegistrations();
      console.log(`Sinkronisasi guru legacy selesai. Diimpor: ${result.imported}, dilewati: ${result.skipped}.`);
      await db.sequelize.close();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  })();
}

// Ekspor fungsi agar dapat dipakai sebagai modul oleh skrip lain.
module.exports = { syncLegacyGuruRegistrations };
