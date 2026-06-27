/**
 * ============================================================================
 * SKRIP UTILITAS: Penggabungan Akun Orang Tua Duplikat Berdasarkan Nomor HP
 * ============================================================================
 *
 * TUJUAN:
 * Skrip ini membersihkan data akun "orangtua" yang terduplikasi di portal.
 * Pada kondisi tertentu, satu orang tua (dengan satu nomor HP yang sama pada
 * data siswanya) bisa memiliki lebih dari satu akun pengguna (User) bertipe
 * "orangtua". Hal ini menyebabkan tautan (PortalAccountLink) ke siswa
 * tersebar di beberapa akun. Skrip ini menyatukan tautan-tautan tersebut ke
 * satu akun kanonik (canonical) dan menghapus akun duplikat yang sudah tidak
 * memiliki tautan tersisa.
 *
 * KENAPA PERLU:
 * Agar setiap orang tua hanya memiliki satu akun login yang merangkum semua
 * anak/siswa yang menjadi tanggungannya, sehingga tidak terjadi kebingungan
 * data dan login ganda.
 *
 * CARA KERJA (RINGKAS):
 * 1. Kumpulkan semua tautan akun portal bertipe "orangtua".
 * 2. Kelompokkan berdasarkan nomor HP siswa yang sudah dinormalisasi.
 * 3. Untuk nomor HP yang memiliki >1 akun orang tua, pilih akun dengan id
 *    terkecil sebagai akun kanonik; sisanya dianggap duplikat.
 * 4. Pindahkan tautan dari akun duplikat ke akun kanonik (atau hapus tautan
 *    jika sudah ada tautan kembar di akun kanonik), lalu hapus akun duplikat
 *    yang sudah tidak memiliki tautan.
 *
 * MODE EKSEKUSI:
 * - Tanpa argumen  : DRY-RUN (hanya menampilkan rencana, perubahan di-rollback).
 * - Dengan --apply : Menerapkan perubahan ke database secara permanen (commit).
 *
 * PERINGATAN:
 * Skrip ini MENGUBAH DATABASE saat dijalankan dengan --apply (memindahkan
 * tautan dan MENGHAPUS akun pengguna duplikat). Jangan jalankan sembarangan
 * di lingkungan produksi tanpa backup.
 * ============================================================================
 */

require("dotenv").config();

const { Op } = require("sequelize");
const db = require("./models");

// Flag mode penerapan. Jika argumen "--apply" diberikan saat menjalankan skrip,
// perubahan akan benar-benar disimpan (commit). Jika tidak, skrip hanya dry-run.
const APPLY_CHANGES = process.argv.includes("--apply");

const Siswa = db.Siswa;
const User = db.User;
const PortalAccountLink = db.PortalAccountLink;

/**
 * Menormalkan nomor HP menjadi format lokal Indonesia yang konsisten.
 * Menghapus semua karakter non-digit, lalu mengubah prefix "62" menjadi "0"
 * sehingga nomor seperti "+62 812-3456" dan "0812 3456" dianggap sama.
 *
 * @param {*} value Nilai nomor HP mentah (boleh string/null/undefined).
 * @returns {string} Nomor HP yang sudah dinormalisasi (hanya digit, prefix "0").
 * Efek samping: tidak ada (fungsi murni).
 */
function normalizePhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * Membuat label ringkas yang menggambarkan sebuah akun pengguna untuk log.
 *
 * @param {object} user Instance User dengan properti id, name, email.
 * @returns {string} Teks deskripsi, contoh: "#12 Budi <budi@mail.com>".
 * Efek samping: tidak ada (hanya membentuk string).
 */
function describeUser(user) {
  return `#${user.id} ${user.name} <${user.email}>`;
}

/**
 * Membuat label ringkas yang menggambarkan seorang siswa untuk log.
 *
 * @param {object} student Instance Siswa dengan properti id, nama, nisn.
 * @returns {string} Teks deskripsi, contoh: "#5 Andi (1234567890)".
 * Efek samping: tidak ada (hanya membentuk string).
 */
function describeStudent(student) {
  return `#${student.id} ${student.nama} (${student.nisn || "tanpa NISN"})`;
}

/**
 * Menyusun rencana penggabungan (merge plan) tanpa mengubah data.
 * Mengambil semua tautan orang tua, mengelompokkannya berdasarkan nomor HP
 * siswa, lalu menentukan akun kanonik dan akun duplikat untuk tiap kelompok.
 *
 * @param {object} transaction Transaksi Sequelize yang dipakai untuk query.
 * @returns {Promise<{groups: Array, allLinks: Array}>} Daftar kelompok duplikat
 *   beserta seluruh tautan yang dibaca. Tiap kelompok berisi: phone,
 *   canonicalUser (akun dipertahankan), duplicateUsers, movedRows (tautan yang
 *   harus dipindahkan), dan allRows.
 * Efek samping: hanya MEMBACA database (SELECT), tidak melakukan perubahan.
 */
async function buildMergePlan(transaction) {
  // Ambil seluruh tautan akun portal bertipe "orangtua".
  const links = await PortalAccountLink.findAll({ where: { link_type: "orangtua" }, transaction });
  // Kumpulkan id siswa & id user unik dari tautan untuk query massal.
  const studentIds = [...new Set(links.map((link) => Number(link.siswa_id)).filter(Boolean))];
  const userIds = [...new Set(links.map((link) => Number(link.user_id)).filter(Boolean))];

  // Ambil data siswa dan data user (hanya yang berperan "orangtua") secara paralel.
  const [students, users] = await Promise.all([
    studentIds.length ? Siswa.findAll({ where: { id: { [Op.in]: studentIds } }, transaction }) : [],
    userIds.length ? User.findAll({ where: { id: { [Op.in]: userIds }, role: "orangtua" }, transaction }) : []
  ]);

  // Buat peta lookup id -> entitas agar pencarian cepat saat iterasi tautan.
  const studentMap = new Map(students.map((student) => [Number(student.id), student]));
  const userMap = new Map(users.map((user) => [Number(user.id), user]));
  const rowsByPhone = new Map();

  // Kelompokkan tiap baris (tautan + siswa + user) berdasarkan nomor HP siswa
  // yang sudah dinormalisasi. Lewati baris yang datanya tidak lengkap.
  links.forEach((link) => {
    const student = studentMap.get(Number(link.siswa_id));
    const user = userMap.get(Number(link.user_id));
    const phone = normalizePhoneNumber(student?.no_telepon);
    if (!student || !user || !phone) return;

    const rows = rowsByPhone.get(phone) || [];
    rows.push({ link, student, user });
    rowsByPhone.set(phone, rows);
  });

  // Untuk tiap nomor HP, tentukan apakah ada akun orang tua duplikat (>1 user).
  const groups = [];
  rowsByPhone.forEach((rows, phone) => {
    const parentUsers = [...new Map(rows.map((row) => [Number(row.user.id), row.user])).values()];
    if (parentUsers.length <= 1) return;

    // Akun kanonik = akun dengan id terkecil; sisanya dianggap duplikat.
    const canonicalUser = [...parentUsers].sort((first, second) => Number(first.id) - Number(second.id))[0];
    const duplicateUsers = parentUsers.filter((user) => Number(user.id) !== Number(canonicalUser.id));
    // movedRows = tautan milik akun duplikat yang harus dipindahkan ke kanonik.
    const movedRows = rows.filter((row) => Number(row.user.id) !== Number(canonicalUser.id));

    groups.push({ phone, canonicalUser, duplicateUsers, movedRows, allRows: rows });
  });

  return { groups, allLinks: links };
}

/**
 * Menerapkan rencana penggabungan ke database (operasi tulis).
 * Memindahkan tautan dari akun duplikat ke akun kanonik dan menghapus akun
 * duplikat yang sudah tidak memiliki tautan tersisa.
 *
 * @param {Array} groups Daftar kelompok hasil buildMergePlan().
 * @param {object} transaction Transaksi Sequelize untuk menjamin atomisitas.
 * @returns {Promise<{movedLinkCount: number, deletedUsers: number[]}>} Jumlah
 *   tautan yang dipindahkan dan daftar id akun duplikat yang dihapus.
 * Efek samping: MENGUBAH DATABASE — memperbarui/menghapus baris
 *   tautan_akun_portal dan MENGHAPUS baris akun_pengguna duplikat.
 */
async function applyMergePlan(groups, transaction) {
  const movedLinkIds = new Set();
  const duplicateUserIds = new Set();

  // Tahap 1: pindahkan setiap tautan dari akun duplikat ke akun kanonik.
  for (const group of groups) {
    group.duplicateUsers.forEach((user) => duplicateUserIds.add(Number(user.id)));

    for (const row of group.movedRows) {
      // Cek apakah akun kanonik sudah punya tautan ke siswa yang sama.
      const existingCanonicalLink = await PortalAccountLink.findOne({
        where: {
          user_id: group.canonicalUser.id,
          siswa_id: row.student.id,
          link_type: "orangtua"
        },
        transaction
      });

      if (existingCanonicalLink) {
        // Sudah ada tautan kembar di kanonik -> hapus tautan duplikat ini.
        await row.link.destroy({ transaction });
      } else {
        // Belum ada -> pindahkan kepemilikan tautan ke akun kanonik.
        await row.link.update({ user_id: group.canonicalUser.id }, { transaction });
      }
      movedLinkIds.add(Number(row.link.id));
    }
  }

  // Tahap 2: hapus akun duplikat yang sudah tidak memiliki tautan tersisa.
  const deletedUsers = [];
  for (const userId of duplicateUserIds) {
    const remainingLinks = await PortalAccountLink.count({ where: { user_id: userId }, transaction });
    if (remainingLinks > 0) continue;

    const deleted = await User.destroy({ where: { id: userId, role: "orangtua" }, transaction });
    if (deleted) deletedUsers.push(userId);
  }

  return { movedLinkCount: movedLinkIds.size, deletedUsers };
}

/**
 * Mencetak rencana penggabungan ke konsol agar dapat ditinjau (mode dry-run).
 *
 * @param {Array} groups Daftar kelompok duplikat hasil buildMergePlan().
 * @returns {void}
 * Efek samping: hanya menulis ke console.log (tidak mengubah data).
 */
function printPlan(groups) {
  if (!groups.length) {
    console.log("Tidak ada akun orang tua duplikat berdasarkan nomor HP siswa.");
    return;
  }

  console.log(`Ditemukan ${groups.length} nomor HP dengan akun orang tua duplikat.`);
  groups.forEach((group, index) => {
    console.log("\n" + `${index + 1}. Nomor HP: ${group.phone}`);
    console.log(`   Dipertahankan: ${describeUser(group.canonicalUser)}`);
    console.log(`   Duplikat: ${group.duplicateUsers.map(describeUser).join(", ")}`);
    console.log(`   Siswa dipindahkan: ${group.movedRows.map((row) => describeStudent(row.student)).join(", ")}`);
  });
}

/**
 * Titik masuk utama skrip. Menjalankan alur lengkap: koneksi DB, susun rencana,
 * cetak rencana, lalu (opsional) terapkan perubahan sesuai mode eksekusi.
 *
 * @returns {Promise<void>}
 * Efek samping:
 *   - Membuka koneksi & transaksi database.
 *   - Mode dry-run: melakukan ROLLBACK (tidak ada perubahan permanen).
 *   - Mode --apply: melakukan COMMIT (perubahan disimpan permanen).
 *   - Selalu menutup koneksi database di akhir.
 */
async function main() {
  await db.sequelize.authenticate();
  const transaction = await db.sequelize.transaction();

  try {
    // Susun rencana penggabungan lalu tampilkan untuk ditinjau.
    const { groups } = await buildMergePlan(transaction);
    printPlan(groups);

    // Mode dry-run: batalkan transaksi sehingga tidak ada perubahan tersimpan.
    if (!APPLY_CHANGES) {
      await transaction.rollback();
      console.log("\nMode dry-run. Jalankan dengan --apply untuk benar-benar menggabungkan data.");
      return;
    }

    // Mode --apply: terapkan perubahan dan simpan secara permanen.
    const result = await applyMergePlan(groups, transaction);
    await transaction.commit();
    console.log("\nCleanup selesai.");
    console.log(`Link dipindahkan: ${result.movedLinkCount}`);
    console.log(`Akun duplikat dihapus: ${result.deletedUsers.length ? result.deletedUsers.join(", ") : "tidak ada"}`);
  } catch (error) {
    // Bila terjadi error, batalkan seluruh perubahan agar data tetap konsisten.
    await transaction.rollback();
    throw error;
  } finally {
    // Pastikan koneksi database selalu ditutup.
    await db.sequelize.close();
  }
}

// Jalankan skrip; jika ada error tak tertangani, cetak dan set exit code = 1.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
