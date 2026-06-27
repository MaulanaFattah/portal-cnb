/**
 * ============================================================================
 * Service Log Audit (auditLogService)
 * ----------------------------------------------------------------------------
 * Menyediakan utilitas untuk mencatat aktivitas pengguna (audit trail) ke
 * tabel AuditLog. Termasuk normalisasi istilah aksi/entitas dari bahasa Inggris
 * ke bahasa Indonesia agar konsisten saat ditampilkan.
 * ============================================================================
 */
const db = require("../models");

/**
 * auditValueMap
 * Peta padanan istilah (Inggris -> Indonesia) untuk menormalkan nilai aksi dan
 * tipe entitas pada log audit, sehingga catatan lebih konsisten dan mudah dibaca.
 * @type {Object<string, string>}
 */
const auditValueMap = {
  user_account: "akun_pengguna",
  teacher_profile: "profil_guru",
  teaching_schedule: "jadwal_mengajar",
  student_attendance: "absensi_siswa",
  attendance_report: "laporan_absensi",
  student: "siswa",
  teacher: "guru",
  activity: "kegiatan",
  gallery: "galeri",
  password: "kata_sandi",
  register: "registrasi",
  registration: "registrasi",
  verify: "verifikasi",
  create: "tambah",
  update: "ubah",
  delete: "hapus",
  submit: "simpan",
  force_reset: "atur_ulang_paksa",
  change: "ganti",
  schedule: "jadwal",
  attendance: "absensi",
  report: "laporan",
  export: "ekspor"
};

/**
 * normalizeAuditValue
 * Menormalkan sebuah nilai (mis. "create_user" atau "teacher-profile") dengan
 * cara memecahnya berdasarkan pemisah titik/garis bawah/strip, lalu menerjemahkan
 * tiap bagian memakai auditValueMap (bila ada padanannya), dan menggabungkannya
 * kembali dengan garis bawah.
 *
 * @param {*} value Nilai mentah yang akan dinormalkan (akan dikonversi ke string).
 * @returns {string} Nilai yang sudah dinormalkan, mis. "tambah_akun_pengguna".
 */
function normalizeAuditValue(value) {
  return String(value || "")
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => auditValueMap[part] || part)
    .join("_");
}

/**
 * logAudit
 * Mencatat satu entri log audit ke tabel AuditLog. Mengambil identitas aktor
 * dari req.user, serta menormalkan nilai action dan entityType. Fungsi ini
 * "aman gagal" (fail-safe): bila terjadi error saat menulis log, error hanya
 * dicatat ke console dan tidak dilempar agar tidak mengganggu alur utama.
 *
 * @param {import("express").Request} req Objek request Express; dipakai untuk
 *        mengambil id aktor (req.user.id), IP, dan user-agent.
 * @param {Object} entry Data entri audit.
 * @param {string} entry.action Aksi yang dilakukan (mis. "create", "update").
 * @param {string} entry.entityType Tipe entitas yang terdampak (mis. "student").
 * @param {string|number|null} [entry.entityId=null] ID entitas terkait (opsional).
 * @param {Object|null} [entry.metadata=null] Data tambahan yang akan disimpan
 *        sebagai JSON (opsional).
 * @param {Object} [options={}] Opsi tambahan yang diteruskan ke AuditLog.create
 *        (mis. { transaction }).
 * @returns {Promise<void>} Tidak mengembalikan nilai. Efek samping: membuat baris
 *          baru pada tabel AuditLog (atau mencatat error ke console bila gagal).
 *          Akan berhenti lebih awal (tanpa menulis) bila model AuditLog, action,
 *          atau entityType tidak tersedia.
 */
async function logAudit(req, { action, entityType, entityId = null, metadata = null }, options = {}) {
  try {
    if (!db.AuditLog || !action || !entityType) return;

    await db.AuditLog.create({
      actor_user_account_id: req?.user?.id || null,
      action: normalizeAuditValue(action),
      entity_type: normalizeAuditValue(entityType),
      entity_id: entityId === null || entityId === undefined ? null : String(entityId),
      metadata: metadata ? JSON.stringify(metadata) : null,
      ip_address: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      user_agent: req?.headers?.["user-agent"] || null
    }, options);
  } catch (error) {
    console.error("Log audit gagal:", error.message);
  }
}

module.exports = { logAudit, normalizeAuditValue };
