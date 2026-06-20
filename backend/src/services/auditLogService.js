const db = require("../models");

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

function normalizeAuditValue(value) {
  return String(value || "")
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => auditValueMap[part] || part)
    .join("_");
}

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
