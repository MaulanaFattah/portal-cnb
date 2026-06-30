const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const db = require("../models");

const User = db.User;
const GuruProfile = db.GuruProfile;
const JadwalMengajar = db.JadwalMengajar;
const AbsensiSiswa = db.AbsensiSiswa;
const Kelas = db.Kelas;
const Siswa = db.Siswa;
const ProfilSekolah = db.ProfilSekolah;
const Pengumuman = db.Pengumuman;
const PortalAccountLink = db.PortalAccountLink;
const { logAudit } = require("../services/auditLogService");

const VALID_ABSENSI = ["hadir", "izin", "sakit", "alpha"];
const VALID_JADWAL_STATUS = ["aktif", "non-aktif"];
const DAY_NAMES = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Menyaring objek user agar hanya field aman yang dikirim ke klien, menghindari
 * bocornya data sensitif seperti hash kata sandi.
 *
 * @param {object|null} user - Instance/objek user mentah.
 * @returns {object|null} Objek user berisi field aman, atau null bila input kosong.
 *   Tanpa efek samping.
 */
function safeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profession: user.profession,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Menentukan nama hari (bahasa Indonesia, huruf kecil) dari sebuah tanggal berformat
 * "YYYY-MM-DD". Dipakai untuk mencocokkan tanggal absensi dengan hari jadwal mengajar.
 *
 * @param {string} tanggal - Tanggal format "YYYY-MM-DD".
 * @returns {string} Nama hari (mis. "senin"). Tanpa efek samping.
 */
function getHari(tanggal) {
  const [year, month, day] = String(tanggal).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return DAY_NAMES[date.getDay()];
}

/**
 * Mengubah array nilai menjadi daftar angka unik yang truthy (membuang nol/NaN/duplikat).
 *
 * @param {Array<*>} values - Daftar nilai yang akan dikonversi.
 * @returns {Array<number>} Array angka unik. Tanpa efek samping.
 */
function uniqueNumbers(values) {
  return [...new Set(values.map((value) => Number(value)).filter(Boolean))];
}

/**
 * Menormalkan alamat email: memangkas spasi dan mengubah ke huruf kecil.
 *
 * @param {*} email - Nilai email mentah.
 * @returns {string} Email yang sudah dinormalisasi. Tanpa efek samping.
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Menormalkan input mata pelajaran menjadi array string bersih (menerima array atau
 * string dipisah koma).
 *
 * @param {string|Array<*>} value - Daftar mapel mentah.
 * @returns {Array<string>} Array nama mapel yang sudah dirapikan. Tanpa efek samping.
 */
function normalizeSubjects(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

/**
 * Mengonversi berbagai representasi nilai menjadi boolean (true untuk true, "true", "1", 1).
 *
 * @param {*} value - Nilai yang akan diinterpretasikan.
 * @returns {boolean} Hasil interpretasi boolean. Tanpa efek samping.
 */
function toBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

/**
 * Memeriksa apakah objek memiliki properti tertentu sebagai milik sendiri, aman terhadap null.
 *
 * @param {object} object - Objek yang diperiksa.
 * @param {string} key - Nama properti yang dicari.
 * @returns {boolean} true bila properti dimiliki langsung. Tanpa efek samping.
 */
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

/**
 * Memeriksa apakah objek memiliki minimal satu dari sekumpulan properti tertentu.
 *
 * @param {object} object - Objek yang diperiksa.
 * @param {Array<string>} keys - Daftar nama properti yang dicari.
 * @returns {boolean} true bila salah satu properti ada. Tanpa efek samping.
 */
function hasAnyOwn(object, keys) {
  return keys.some((key) => hasOwn(object, key));
}

/**
 * Menentukan apakah sebuah label sebenarnya menandakan peran wali kelas/guru, bukan
 * nama mata pelajaran sungguhan.
 *
 * @param {*} value - Label yang diperiksa.
 * @returns {boolean} true bila label menandai wali kelas/guru. Tanpa efek samping.
 */
function isHomeroomSubjectLabel(value) {
  const text = String(value || "").trim().toLowerCase();
  return ["wali kelas", "guru wali kelas", "guru"].includes(text);
}

/**
 * Menormalkan input mapel secara agresif: memecah tiap entri pada ";" atau "+", merapikan,
 * dan membuang label yang menandai wali kelas. Menghasilkan daftar mapel murni.
 *
 * @param {string|Array<*>} value - Daftar mapel mentah.
 * @returns {Array<string>} Array nama mapel bersih. Tanpa efek samping.
 */
function normalizeSubjectInput(value) {
  return normalizeSubjects(value)
    .flatMap((item) => String(item).split(/[;+]/).map((part) => part.trim()).filter(Boolean))
    .filter((item) => !isHomeroomSubjectLabel(item));
}

/**
 * Menentukan apakah sebuah profil guru berperan sebagai wali kelas (berdasarkan flag
 * is_homeroom atau teacher_type "wali_kelas").
 *
 * @param {object} profile - Objek GuruProfile.
 * @returns {boolean} true bila profil adalah wali kelas. Tanpa efek samping.
 */
function isHomeroomProfile(profile) {
  return Boolean(profile?.is_homeroom) || profile?.teacher_type === "wali_kelas";
}

/**
 * Menentukan apakah sebuah profil guru berperan sebagai guru mata pelajaran (teacher_type
 * "mapel" dan memiliki minimal satu mapel valid).
 *
 * @param {object} profile - Objek GuruProfile.
 * @returns {boolean} true bila profil adalah guru mapel. Tanpa efek samping.
 */
function isSubjectTeacherProfile(profile) {
  return profile?.teacher_type === "mapel" && normalizeSubjectInput(profile?.subject).length > 0;
}

/**
 * Menebak jenjang (sd/smp) sebuah kelas dari teks tingkat dan nama kelasnya menggunakan
 * pola angka/romawi. Dipakai untuk memvalidasi kecocokan jenjang guru dengan kelas wali.
 *
 * @param {object} kelas - Objek kelas dengan properti tingkat dan/atau nama_kelas.
 * @returns {string|null} "sd", "smp", atau null bila tak dapat ditentukan. Tanpa efek samping.
 */
function inferClassJenjang(kelas) {
  const text = `${kelas?.tingkat || ""} ${kelas?.nama_kelas || ""}`.toLowerCase();
  if (/(smp|vii|viii|ix|\b7\b|\b8\b|\b9\b)/.test(text)) return "smp";
  if (/(sd|\b1\b|\b2\b|\b3\b|\b4\b|\b5\b|\b6\b|\bi\b|\bii\b|\biii\b|\biv\b|\bv\b|\bvi\b)/.test(text)) return "sd";
  return null;
}

/**
 * Merangkum baris-baris absensi menjadi total per status (hadir, izin, sakit, alpha) dan
 * jumlah keseluruhan. Dipakai untuk menampilkan ringkasan rekap absensi.
 *
 * @param {Array<{status: string}>} rows - Daftar baris absensi.
 * @returns {{hadir:number, izin:number, sakit:number, alpha:number, total:number}} Objek
 *   ringkasan jumlah. Tanpa efek samping.
 */
function summarizeAbsensi(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.total += 1;
      if (summary[row.status] !== undefined) summary[row.status] += 1;
      return summary;
    },
    { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 }
  );
}

/**
 * Mengambil seluruh kelas dan menyusunnya menjadi Map untuk pencarian cepat berdasarkan id.
 *
 * @returns {Promise<Map<number, object>>} Map id kelas → objek kelas (JSON). Efek samping:
 *   query baca ke tabel Kelas.
 */
async function getClassMap() {
  const kelas = await Kelas.findAll();
  return new Map(kelas.map((item) => [item.id, item.toJSON()]));
}

/**
 * Mengambil profil guru milik seorang user hanya bila berstatus "approved". Dipakai sebagai
 * gerbang akses fitur portal guru.
 *
 * @param {number} userId - ID akun guru.
 * @returns {Promise<object|null>} Instance GuruProfile yang sudah disetujui, atau null bila
 *   tidak ada/belum disetujui. Efek samping: query baca ke GuruProfile.
 */
async function getApprovedProfile(userId) {
  const profile = await GuruProfile.findOne({ where: { user_id: userId } });
  if (!profile || profile.verification_status !== "approved") return null;
  return profile;
}

/**
 * Mengambil daftar jadwal mengajar aktif milik seorang guru, terurut menurut hari lalu jam
 * mulai, dengan data kelas yang sudah dilekatkan.
 *
 * @param {number} userId - ID akun guru pemilik jadwal.
 * @param {Map<number, object>} classMap - Map kelas hasil getClassMap().
 * @returns {Promise<Array<object>>} Daftar jadwal dengan properti kelas terisi. Efek samping:
 *   query baca ke JadwalMengajar.
 */
async function getTeacherSchedules(userId, classMap) {
  const rows = await JadwalMengajar.findAll({
    where: { guru_user_id: userId, status: "aktif" },
    order: [["hari", "ASC"], ["jam_mulai", "ASC"]]
  });

  return rows.map((item) => ({
    ...item.toJSON(),
    kelas: classMap.get(item.kelas_id) || null
  }));
}

/**
 * Menyusun konteks kelas yang dapat diakses seorang guru: gabungan kelas wali (bila wali kelas)
 * dan kelas dari jadwal mengajar aktif (bila guru mapel), beserta daftar id, objek kelas, dan jadwal.
 *
 * @param {object} profile - GuruProfile guru yang bersangkutan.
 * @param {number} userId - ID akun guru.
 * @param {Map<number, object>} classMap - Map kelas hasil getClassMap().
 * @returns {Promise<{classIds: Array<number>, classes: Array<object>, jadwal: Array<object>}>}
 *   Konteks akses kelas. Efek samping: dapat melakukan query baca jadwal (via getTeacherSchedules).
 */
async function getAccessibleContext(profile, userId, classMap) {
  const jadwal = isSubjectTeacherProfile(profile) ? await getTeacherSchedules(userId, classMap) : [];
  const classIds = uniqueNumbers([
    isHomeroomProfile(profile) ? profile.kelas_id : null,
    ...jadwal.map((item) => item.kelas_id)
  ]);

  return {
    classIds,
    classes: classIds.map((id) => classMap.get(id)).filter(Boolean),
    jadwal
  };
}

/**
 * Memastikan seorang guru berhak mengakses sebuah kelas: diizinkan bila ia wali kelas dari
 * kelas itu, atau guru mapel yang memiliki jadwal aktif di kelas tersebut.
 *
 * @param {object} profile - GuruProfile guru.
 * @param {number} userId - ID akun guru.
 * @param {number|string} classId - ID kelas yang ingin diakses.
 * @returns {Promise<{allowed: boolean, homeroom?: boolean, jadwal?: object, message?: string}>}
 *   Hasil pemeriksaan akses; allowed=true bila berhak (dengan info homeroom/jadwal), atau
 *   allowed=false beserta pesan alasan. Efek samping: dapat melakukan query baca JadwalMengajar.
 */
async function ensureClassAccess(profile, userId, classId) {
  const normalizedClassId = Number(classId);

  if (!normalizedClassId) {
    return { allowed: false, message: "Kelas wajib dipilih" };
  }

  if (isHomeroomProfile(profile) && Number(profile.kelas_id) === normalizedClassId) {
    return { allowed: true, homeroom: true };
  }

  const jadwal = isSubjectTeacherProfile(profile)
    ? await JadwalMengajar.findOne({
      where: { guru_user_id: userId, kelas_id: normalizedClassId, status: "aktif" }
    })
    : null;

  return jadwal
    ? { allowed: true, jadwal }
    : { allowed: false, message: "Guru hanya dapat mengakses kelas sesuai wali kelas atau roster aktif" };
}

/**
 * Controller Express (admin): mengambil daftar registrasi guru beserta profil masing-masing
 * (status verifikasi, daftar mapel, dan kelas wali). Dipakai admin untuk meninjau pendaftaran guru.
 *
 * @param {import('express').Request} req - Tidak memakai parameter khusus.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi daftar guru + guruProfile, atau 500 bila gagal.
 *   Efek samping: query baca ke User, GuruProfile, dan Kelas.
 */
exports.getGuruRegistrations = async (req, res) => {
  try {
    const users = await User.findAll({ where: { role: "guru" }, order: [["createdAt", "DESC"]] });
    const profiles = await GuruProfile.findAll();
    const profileMap = new Map(profiles.map((item) => [item.user_id, item.toJSON()]));
    const classMap = await getClassMap();

    const data = users.map((user) => {
      const profile = profileMap.get(user.id) || null;
      return {
        ...safeUser(user),
        guruProfile: profile ? { ...profile, subjects: normalizeSubjectInput(profile.subject), kelas: classMap.get(profile.kelas_id) || null } : null
      };
    });

    return res.json({ success: true, message: "Data registrasi guru berhasil diambil", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil registrasi guru", error: error.message });
  }
};

/**
 * Controller Express (admin): memverifikasi/memperbarui status registrasi seorang guru
 * (pending/approved/rejected) sekaligus menetapkan peran (wali kelas dan/atau guru mapel),
 * daftar mapel, dan kelas wali. Saat menyetujui, melakukan validasi peran, kelas, kecocokan
 * jenjang, dan kelengkapan mapel. Memperbarui GuruProfile dan profession user, lalu menulis audit log.
 *
 * @param {import('express').Request} req - req.params.userId ID akun guru; req.body memuat
 *   (alias ganda): verification_status/status_verifikasi, subject/subjects/mata_pelajaran,
 *   kelas_id/kelas_wali_id/homeroom_classroom_id, note/catatan, tipe_guru/teacher_type, dan flag
 *   wali_kelas/is_homeroom serta guru_mata_pelajaran/is_subject_teacher. req.user.id sebagai penyetuju.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi profil terbaru bila sukses; 400 untuk status/
 *   validasi tidak valid; 404 bila akun guru tak ada; 500 untuk error server. Efek samping:
 *   update GuruProfile & User dan menulis audit log.
 */
exports.verifyGuruRegistration = async (req, res) => {
  try {
    const { userId } = req.params;
    const { verification_status, status_verifikasi, subject, subjects, mata_pelajaran, kelas_id, kelas_wali_id, homeroom_classroom_id, note, catatan } = req.body;
    const statusMap = { menunggu: "pending", disetujui: "approved", setuju: "approved", ditolak: "rejected", tolak: "rejected" };
    const nextVerificationStatus = statusMap[status_verifikasi || verification_status] || status_verifikasi || verification_status;

    if (!["pending", "approved", "rejected"].includes(nextVerificationStatus)) {
      return res.status(400).json({ success: false, message: "Status verifikasi tidak valid" });
    }

    const user = await User.findByPk(userId);
    if (!user || user.role !== "guru") {
      return res.status(404).json({ success: false, message: "Akun guru tidak ditemukan" });
    }

    const [profile] = await GuruProfile.findOrCreate({
      where: { user_id: user.id },
      defaults: { teacher_type: "mapel", subject: null }
    });

    const subjectList = normalizeSubjectInput(mata_pelajaran ?? subjects ?? subject ?? profile.subject);
    const tipeGuru = req.body.tipe_guru || req.body.teacher_type;
    const explicitHomeroom = hasAnyOwn(req.body, ["wali_kelas", "is_homeroom"]);
    const explicitSubjectTeacher = hasAnyOwn(req.body, ["guru_mata_pelajaran", "is_subject_teacher"]);
    const isHomeroom = explicitHomeroom
      ? (toBoolean(req.body.wali_kelas) || toBoolean(req.body.is_homeroom))
      : (isHomeroomProfile(profile) || tipeGuru === "wali_kelas");
    const isSubjectTeacher = explicitSubjectTeacher
      ? (toBoolean(req.body.guru_mata_pelajaran) || toBoolean(req.body.is_subject_teacher))
      : (isSubjectTeacherProfile(profile) || tipeGuru === "mapel" || subjectList.length > 0);
    const nextClassId = Number(kelas_wali_id || homeroom_classroom_id || kelas_id || profile.kelas_id || 0);

    if (nextVerificationStatus === "approved") {
      if (!isHomeroom && !isSubjectTeacher) {
        return res.status(400).json({ success: false, message: "Pilih minimal satu peran guru" });
      }
      if (isHomeroom && !nextClassId) {
        return res.status(400).json({ success: false, message: "Kelas wajib dipilih untuk wali kelas" });
      }
      if (isHomeroom && nextClassId) {
        const kelas = await Kelas.findByPk(nextClassId);
        if (!kelas) return res.status(400).json({ success: false, message: "Kelas wali tidak ditemukan" });
        const classJenjang = inferClassJenjang(kelas);
        if (profile.jenjang && classJenjang && profile.jenjang !== classJenjang) {
          return res.status(400).json({ success: false, message: "Kelas tidak sesuai dengan jenjang guru" });
        }
      }
      if (isSubjectTeacher && !subjectList.length) {
        return res.status(400).json({ success: false, message: "Minimal satu mata pelajaran wajib diisi untuk guru mata pelajaran" });
      }
    }

    const legacyTeacherType = isSubjectTeacher ? "mapel" : "wali_kelas";
    await profile.update({
      verification_status: nextVerificationStatus,
      teacher_type: legacyTeacherType,
      subject: isSubjectTeacher ? subjectList.join(", ") : null,
      is_homeroom: isHomeroom,
      kelas_id: isHomeroom ? nextClassId : null,
      note: catatan || note || null,
      approved_by: nextVerificationStatus === "approved" ? req.user.id : profile.approved_by,
      approved_at: nextVerificationStatus === "approved" ? new Date() : profile.approved_at
    });

    await user.update({
      profession: [isHomeroom ? "Wali Kelas" : null, isSubjectTeacher ? subjectList.join(", ") : null].filter(Boolean).join(" + ") || user.profession
    });

    await logAudit(req, {
      action: "teacher.verify",
      entityType: "teacher_profile",
      entityId: profile.id,
      metadata: { userId: user.id, verification_status: nextVerificationStatus, isHomeroom, subjects: subjectList }
    });

    return res.json({ success: true, message: "Status guru berhasil diperbarui", data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memperbarui status guru", error: error.message });
  }
};

/**
 * Controller Express (admin): mengambil seluruh jadwal mengajar lengkap dengan data guru dan
 * kelas, terurut menurut hari lalu jam mulai.
 *
 * @param {import('express').Request} req - Tidak memakai parameter khusus.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi daftar jadwal + relasi guru/kelas, atau 500
 *   bila gagal. Efek samping: query baca ke JadwalMengajar, User, dan Kelas.
 */
exports.getJadwalAdmin = async (req, res) => {
  try {
    const jadwal = await JadwalMengajar.findAll({ order: [["hari", "ASC"], ["jam_mulai", "ASC"]] });
    const users = await User.findAll({ where: { role: "guru" } });
    const userMap = new Map(users.map((item) => [item.id, safeUser(item)]));
    const classMap = await getClassMap();

    const data = jadwal.map((item) => ({
      ...item.toJSON(),
      guru: userMap.get(item.guru_user_id) || null,
      kelas: classMap.get(item.kelas_id) || null
    }));

    return res.json({ success: true, message: "Jadwal mengajar berhasil diambil", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil jadwal", error: error.message });
  }
};

/**
 * Controller Express (admin): menambah jadwal mengajar baru. Memvalidasi kelengkapan field,
 * validitas hari dan status, serta memastikan jadwal hanya untuk guru mapel yang sudah disetujui.
 * Aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.body memuat guru_user_id, kelas_id, mapel, hari,
 *   jam_mulai, jam_selesai, dan status (default "aktif").
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 201 berisi jadwal baru bila sukses; 400 bila field kurang/
 *   hari/status tidak valid atau guru bukan guru mapel yang disetujui; 500 untuk error server.
 *   Efek samping: membuat record JadwalMengajar dan menulis audit log.
 */
exports.createJadwal = async (req, res) => {
  try {
    const { guru_user_id, kelas_id, mapel, hari, jam_mulai, jam_selesai, status = "aktif" } = req.body;

    if (!guru_user_id || !kelas_id || !mapel || !hari || !jam_mulai || !jam_selesai) {
      return res.status(400).json({ success: false, message: "Guru, kelas, mapel, hari, dan jam wajib diisi" });
    }

    if (!DAY_NAMES.includes(hari) || !VALID_JADWAL_STATUS.includes(status)) {
      return res.status(400).json({ success: false, message: "Hari atau status jadwal tidak valid" });
    }

    const profile = await GuruProfile.findOne({ where: { user_id: guru_user_id } });
    if (!profile || profile.verification_status !== "approved" || !isSubjectTeacherProfile(profile)) {
      return res.status(400).json({ success: false, message: "Jadwal hanya untuk guru mapel yang sudah disetujui" });
    }

    const jadwal = await JadwalMengajar.create({ guru_user_id, kelas_id, mapel, hari, jam_mulai, jam_selesai, status });
    await logAudit(req, { action: "schedule.create", entityType: "teaching_schedule", entityId: jadwal.id, metadata: { guru_user_id, kelas_id, mapel } });
    return res.status(201).json({ success: true, message: "Jadwal mengajar berhasil ditambahkan", data: jadwal });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal menambahkan jadwal", error: error.message });
  }
};

/**
 * Controller Express (admin): memperbarui jadwal mengajar berdasarkan id. Memvalidasi
 * kelengkapan field, validitas hari/status, dan memastikan guru target adalah guru mapel
 * yang sudah disetujui. Aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.params.id ID jadwal; req.body memuat guru_user_id,
 *   kelas_id, mapel, hari, jam_mulai, jam_selesai, dan status (opsional, default "aktif").
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi jadwal terbaru bila sukses; 404 bila jadwal tak
 *   ada; 400 untuk validasi gagal; 500 untuk error server. Efek samping: update JadwalMengajar
 *   dan menulis audit log.
 */
exports.updateJadwal = async (req, res) => {
  try {
    const jadwal = await JadwalMengajar.findByPk(req.params.id);
    if (!jadwal) return res.status(404).json({ success: false, message: "Jadwal tidak ditemukan" });

    const { guru_user_id, kelas_id, mapel, hari, jam_mulai, jam_selesai, status } = req.body;
    if (!guru_user_id || !kelas_id || !mapel || !hari || !jam_mulai || !jam_selesai) {
      return res.status(400).json({ success: false, message: "Guru, kelas, mapel, hari, dan jam wajib diisi" });
    }

    if (!DAY_NAMES.includes(hari) || (status && !VALID_JADWAL_STATUS.includes(status))) {
      return res.status(400).json({ success: false, message: "Hari atau status jadwal tidak valid" });
    }

    const profile = await GuruProfile.findOne({ where: { user_id: guru_user_id } });
    if (!profile || profile.verification_status !== "approved" || !isSubjectTeacherProfile(profile)) {
      return res.status(400).json({ success: false, message: "Jadwal hanya untuk guru mapel yang sudah disetujui" });
    }

    await jadwal.update({ guru_user_id, kelas_id, mapel, hari, jam_mulai, jam_selesai, status: status || "aktif" });
    await logAudit(req, { action: "schedule.update", entityType: "teaching_schedule", entityId: jadwal.id, metadata: { guru_user_id, kelas_id, mapel } });
    return res.json({ success: true, message: "Jadwal mengajar berhasil diperbarui", data: jadwal });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memperbarui jadwal", error: error.message });
  }
};

/**
 * Controller Express (admin): menghapus jadwal mengajar berdasarkan id. Aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.params.id ID jadwal yang dihapus.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 bila sukses; 404 bila jadwal tak ada; 500 untuk error
 *   server. Efek samping: menghapus record JadwalMengajar dan menulis audit log.
 */
exports.deleteJadwal = async (req, res) => {
  try {
    const jadwal = await JadwalMengajar.findByPk(req.params.id);
    if (!jadwal) return res.status(404).json({ success: false, message: "Jadwal tidak ditemukan" });
    await jadwal.destroy();
    await logAudit(req, { action: "schedule.delete", entityType: "teaching_schedule", entityId: req.params.id });
    return res.json({ success: true, message: "Jadwal berhasil dihapus" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal menghapus jadwal", error: error.message });
  }
};

/**
 * Controller Express (portal guru): menyusun data dasbor untuk guru yang login, meliputi profil,
 * informasi sekolah, pengumuman terbaru, kelas yang dapat diakses, daftar siswa di kelas tersebut,
 * jadwal mengajar, dan (khusus wali kelas) seluruh jadwal lintas guru di kelas walinya untuk rekap
 * absensi mapel.
 *
 * @param {import('express').Request} req - req.user (akun guru yang login) dipakai untuk
 *   menentukan profil dan konteks akses.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi data dasbor lengkap; 403 bila akun guru belum
 *   aktif/disetujui; 500 untuk error server. Efek samping: banyak query baca (Kelas, ProfilSekolah,
 *   Pengumuman, Siswa, JadwalMengajar, User); tidak mengubah data.
 */
exports.getDashboard = async (req, res) => {
  try {
    const profile = await getApprovedProfile(req.user.id);
    if (!profile) {
      return res.status(403).json({ success: false, message: "Akun guru belum aktif" });
    }

    const classMap = await getClassMap();
    const context = await getAccessibleContext(profile, req.user.id, classMap);
    const informasiSekolah = await ProfilSekolah.findOne();
    const pengumumanTerbaru = await Pengumuman.findAll({ order: [["createdAt", "DESC"]], limit: 8 });
    const siswa = context.classIds.length
      ? await Siswa.findAll({
        where: { kelas_id: { [Op.in]: context.classIds }, status: "aktif" },
        order: [["nama", "ASC"]]
      })
      : [];

    // Semua jadwal mengajar di kelas wali (lintas guru) agar wali kelas dapat
    // melihat rekap absensi mata pelajaran dari guru mapel lain di kelasnya.
    let jadwalKelasWali = [];
    if (isHomeroomProfile(profile) && profile.kelas_id) {
      const rows = await JadwalMengajar.findAll({
        where: { kelas_id: Number(profile.kelas_id), status: "aktif" },
        order: [["mapel", "ASC"], ["hari", "ASC"], ["jam_mulai", "ASC"]]
      });
      const guruIds = [...new Set(rows.map((item) => Number(item.guru_user_id)).filter(Boolean))];
      const gurus = guruIds.length ? await User.findAll({ where: { id: { [Op.in]: guruIds } } }) : [];
      const guruNameMap = new Map(gurus.map((item) => [Number(item.id), item.name]));
      jadwalKelasWali = rows.map((item) => ({
        ...item.toJSON(),
        kelas: classMap.get(item.kelas_id) || null,
        guru_nama: guruNameMap.get(Number(item.guru_user_id)) || "Guru",
        milik_sendiri: Number(item.guru_user_id) === Number(req.user.id)
      }));
    }

    return res.json({
      success: true,
      message: "Data dasbor guru berhasil diambil",
      data: {
        user: safeUser(req.user),
        guruProfile: { ...profile.toJSON(), kelas: classMap.get(profile.kelas_id) || null },
        informasiSekolah,
        pengumumanTerbaru,
        kelasAkses: context.classes,
        siswa,
        jadwal: context.jadwal,
        jadwalKelasWali
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil dashboard guru", error: error.message });
  }
};

/**
 * Controller Express (portal guru): menyimpan data absensi siswa untuk suatu tanggal. Mendukung
 * dua mode: absensi wali kelas (tanpa jadwal_id, untuk kelas walinya) dan absensi guru mapel
 * (dengan jadwal_id aktif, harinya harus cocok dengan tanggal). Memvalidasi hak akses, kecocokan
 * siswa-kelas, dan status absensi, lalu melakukan upsert tiap entri. Aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.body memuat tanggal ("YYYY-MM-DD"), kelas_id
 *   (untuk mode wali kelas), jadwal_id (untuk mode guru mapel), dan entries (array {siswa_id,
 *   status, keterangan?}). req.user.id menunjuk guru yang mengabsen.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi jumlah data tersimpan bila sukses; 400 untuk
 *   validasi gagal; 403 bila tidak berhak; 404 bila jadwal tak ada; 500 untuk error server.
 *   Efek samping: membuat/memperbarui record AbsensiSiswa dan menulis audit log.
 */
exports.submitAbsensi = async (req, res) => {
  try {
    const { tanggal, kelas_id, jadwal_id, entries } = req.body;

    if (!tanggal || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: "Tanggal dan data absensi wajib diisi" });
    }

    const profile = await getApprovedProfile(req.user.id);
    if (!profile) {
      return res.status(403).json({ success: false, message: "Akun guru belum aktif" });
    }

    const hari = getHari(tanggal);
    let classId = Number(kelas_id || profile.kelas_id);
    let mapel = null;
    let scheduleId = null;
    let teacherType = "wali_kelas";

    if (jadwal_id) {
      if (!isSubjectTeacherProfile(profile)) {
        return res.status(403).json({ success: false, message: "Jadwal mapel hanya dapat digunakan guru mata pelajaran" });
      }
      const jadwal = await JadwalMengajar.findOne({ where: { id: jadwal_id, guru_user_id: req.user.id, status: "aktif" } });
      if (!jadwal) return res.status(404).json({ success: false, message: "Jadwal mengajar tidak ditemukan" });
      if (jadwal.hari !== hari) return res.status(400).json({ success: false, message: `Tanggal yang dipilih bukan hari ${jadwal.hari}` });
      classId = jadwal.kelas_id;
      mapel = jadwal.mapel;
      scheduleId = jadwal.id;
      teacherType = "mapel";
    } else {
      if (!isHomeroomProfile(profile)) return res.status(403).json({ success: false, message: "Pilih jadwal aktif untuk absensi guru mapel" });
      if (!classId) return res.status(400).json({ success: false, message: "Kelas wali belum ditentukan administrator" });
      if (Number(profile.kelas_id) !== classId) {
        return res.status(403).json({ success: false, message: "Wali kelas hanya dapat absensi kelas sendiri" });
      }
    }

    const students = await Siswa.findAll({ where: { kelas_id: classId, status: "aktif" } });
    const validStudentIds = new Set(students.map((item) => Number(item.id)));
    const normalizedEntries = [];

    for (const entry of entries) {
      const siswaId = Number(entry.siswa_id);
      const status = String(entry.status || "").toLowerCase();
      if (!validStudentIds.has(siswaId)) {
        return res.status(400).json({ success: false, message: "Data siswa tidak sesuai kelas yang diabsen" });
      }
      if (!VALID_ABSENSI.includes(status)) {
        return res.status(400).json({ success: false, message: "Status absensi tidak valid" });
      }
      normalizedEntries.push({ ...entry, siswa_id: siswaId, status });
    }

    // Validasi: seluruh siswa aktif di kelas wajib memiliki status kehadiran.
    const providedStudentIds = new Set(normalizedEntries.map((entry) => entry.siswa_id));
    const semuaLengkap = students.length > 0 && students.every((item) => providedStudentIds.has(Number(item.id)));
    if (!semuaLengkap) {
      return res.status(400).json({ success: false, message: "Semua data kehadiran siswa wajib diisi sebelum absensi disimpan." });
    }

    let saved = 0;

    for (const entry of normalizedEntries) {
      const siswaId = entry.siswa_id;
      const where = teacherType === "wali_kelas"
        ? { siswa_id: siswaId, tanggal, tipe_guru: "wali_kelas" }
        : { siswa_id: siswaId, tanggal, guru_user_id: req.user.id, jadwal_id: scheduleId };
      const existing = await AbsensiSiswa.findOne({ where });
      const payload = {
        siswa_id: siswaId,
        kelas_id: classId,
        guru_user_id: req.user.id,
        jadwal_id: scheduleId,
        tanggal,
        hari,
        tipe_guru: teacherType,
        mapel,
        status: entry.status,
        keterangan: entry.keterangan || null
      };

      if (existing) await existing.update(payload);
      else await AbsensiSiswa.create(payload);
      saved += 1;
    }

    await logAudit(req, { action: "attendance.submit", entityType: "student_attendance", metadata: { tanggal, kelas_id: classId, jadwal_id: scheduleId, tipe_guru: teacherType, saved } });
    return res.json({ success: true, message: `${saved} data absensi berhasil disimpan`, data: { saved } });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal menyimpan absensi", error: error.message });
  }
};

/**
 * Controller Express (portal guru): mengambil rekap absensi sesuai filter dan hak akses guru.
 * Mendukung beberapa cara penentuan cakupan: berdasarkan jadwal_id (jadwal sendiri atau jadwal di
 * kelas wali), kelas_id tertentu (dengan pemeriksaan akses), kelas wali default, atau seluruh kelas
 * pada roster guru mapel. Hasil dilengkapi data siswa, kelas, dan ringkasan jumlah per status.
 *
 * @param {import('express').Request} req - req.query memuat kelas_id, jadwal_id, mapel, dari,
 *   dan sampai (rentang tanggal). req.user.id menunjuk guru yang meminta rekap.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi { summary, rows }; 403 bila akun belum aktif atau
 *   melebihi hak akses; 404 bila jadwal tak ada; 500 untuk error server. Efek samping: query baca
 *   ke AbsensiSiswa, JadwalMengajar, Siswa, Kelas; tidak mengubah data.
 */
exports.getRekapAbsensi = async (req, res) => {
  try {
    const { kelas_id, jadwal_id, mapel, dari, sampai } = req.query;
    const profile = await getApprovedProfile(req.user.id);

    if (!profile) {
      return res.status(403).json({ success: false, message: "Akun guru belum aktif" });
    }

    const classMap = await getClassMap();
    const where = {};
    let classId = Number(kelas_id || 0);

    if (jadwal_id) {
      const jadwal = await JadwalMengajar.findOne({ where: { id: jadwal_id, status: "aktif" } });
      if (!jadwal) return res.status(404).json({ success: false, message: "Jadwal mengajar tidak ditemukan" });

      const ownsJadwal = Number(jadwal.guru_user_id) === Number(req.user.id);
      const isHomeroomOfClass = isHomeroomProfile(profile) && Number(profile.kelas_id) === Number(jadwal.kelas_id);

      // Guru mapel boleh lihat jadwal sendiri; wali kelas boleh lihat jadwal
      // guru mapel mana pun yang mengajar di kelas walinya.
      if (!ownsJadwal && !isHomeroomOfClass) {
        return res.status(403).json({ success: false, message: "Anda hanya dapat melihat jadwal milik sendiri atau jadwal di kelas wali Anda" });
      }
      if (ownsJadwal && !isHomeroomOfClass && !isSubjectTeacherProfile(profile)) {
        return res.status(403).json({ success: false, message: "Jadwal mapel hanya dapat digunakan guru mata pelajaran" });
      }

      classId = jadwal.kelas_id;
      where.jadwal_id = jadwal.id;
      where.kelas_id = jadwal.kelas_id;
      where.tipe_guru = "mapel";
    } else if (classId) {
      const access = await ensureClassAccess(profile, req.user.id, classId);
      if (!access.allowed) return res.status(403).json({ success: false, message: access.message });
      where.kelas_id = classId;
      if (access.homeroom) {
        where.tipe_guru = "wali_kelas";
      } else {
        where.guru_user_id = req.user.id;
        where.tipe_guru = "mapel";
      }
    } else if (isHomeroomProfile(profile) && profile.kelas_id) {
      where.kelas_id = Number(profile.kelas_id);
      where.tipe_guru = "wali_kelas";
    } else {
      const context = await getAccessibleContext(profile, req.user.id, classMap);
      if (!context.classIds.length) {
        return res.json({ success: true, message: "Belum ada kelas pada roster", data: { summary: summarizeAbsensi([]), rows: [] } });
      }
      where.guru_user_id = req.user.id;
      where.kelas_id = { [Op.in]: context.classIds };
      where.tipe_guru = "mapel";
    }

    if (mapel) where.mapel = String(mapel).trim();

    if (dari && sampai) where.tanggal = { [Op.between]: [dari, sampai] };
    else if (dari) where.tanggal = { [Op.gte]: dari };
    else if (sampai) where.tanggal = { [Op.lte]: sampai };

    const absensiRows = await AbsensiSiswa.findAll({ where, order: [["tanggal", "DESC"], ["siswa_id", "ASC"]] });
    const siswaIds = uniqueNumbers(absensiRows.map((item) => item.siswa_id));
    const siswaRows = siswaIds.length ? await Siswa.findAll({ where: { id: { [Op.in]: siswaIds } } }) : [];
    const siswaMap = new Map(siswaRows.map((item) => [item.id, item.toJSON()]));

    const rows = absensiRows.map((item) => {
      const row = item.toJSON();
      return {
        ...row,
        siswa: siswaMap.get(row.siswa_id) || null,
        kelas: classMap.get(row.kelas_id) || null
      };
    });

    return res.json({
      success: true,
      message: "Rekap absensi berhasil diambil",
      data: {
        summary: summarizeAbsensi(rows),
        rows
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil rekap absensi", error: error.message });
  }
};

/**
 * Controller Express (admin): menghapus registrasi guru beserta profilnya dalam satu transaksi.
 * Memberi pengaman: bila guru sudah disetujui dan masih dipakai oleh jadwal atau absensi, penghapusan
 * ditolak agar data terkait tidak yatim. Aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.params.userId ID akun guru yang dihapus.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 bila sukses; 404 bila akun guru tak ada; 400 bila masih
 *   terpakai jadwal/absensi; 500 untuk error server. Efek samping: menghapus GuruProfile & User
 *   dalam transaksi dan menulis audit log.
 */
exports.deleteGuruRegistration = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, { transaction });
    if (!user || user.role !== "guru") {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Akun guru tidak ditemukan" });
    }

    const profile = await GuruProfile.findOne({ where: { user_id: user.id }, transaction });
    const [scheduleCount, attendanceCount] = await Promise.all([
      JadwalMengajar.count({ where: { guru_user_id: user.id }, transaction }),
      AbsensiSiswa.count({ where: { guru_user_id: user.id }, transaction })
    ]);

    if (profile?.verification_status === "approved" && (scheduleCount || attendanceCount)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Guru sudah dipakai oleh jadwal atau absensi. Nonaktifkan/hapus jadwal dan data terkait sebelum menghapus akun."
      });
    }

    if (profile) await profile.destroy({ transaction });
    await user.destroy({ transaction });
    await logAudit(req, {
      action: "teacher_registration.delete",
      entityType: "user_account",
      entityId: userId,
      metadata: { scheduleCount, attendanceCount, verification_status: profile?.verification_status || null }
    }, { transaction });

    await transaction.commit();
    return res.json({ success: true, message: "Registrasi guru berhasil dihapus" });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: "Gagal menghapus registrasi guru", error: error.message });
  }
};

/**
 * Controller Express (portal guru): membuat akun portal untuk seorang siswa (dan opsional akun
 * orang tua) oleh guru yang berhak atas kelas siswa tersebut. Memvalidasi hak akses, format dan
 * keunikan email, panjang kata sandi, serta keunikan email siswa vs orang tua. Membuat akun
 * (kata sandi di-hash, wajib ganti saat login pertama), menautkannya via PortalAccountLink, dan
 * memperbarui data siswa terkait. Seluruh proses dalam satu transaksi dan dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.body memuat siswa_id, siswa_email, siswa_password,
 *   serta (opsional) orangtua_name, orangtua_email, orangtua_password, orangtua_phone. req.user
 *   menunjuk guru pembuat akun.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 201 berisi data akun siswa (dan orang tua) bila sukses; 400
 *   untuk validasi gagal; 403 bila guru tak berhak/akun belum aktif; 404 bila siswa aktif tak ada;
 *   409 bila email sudah terdaftar; 500 untuk error server. Efek samping: membuat User (siswa &
 *   opsional orang tua), PortalAccountLink, update Siswa, dan menulis audit log dalam transaksi.
 */
exports.createStudentAccounts = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      siswa_id,
      siswa_email,
      siswa_password,
      orangtua_name,
      orangtua_email,
      orangtua_password,
      orangtua_phone
    } = req.body;

    const profile = await getApprovedProfile(req.user.id);
    if (!profile) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: "Akun guru belum aktif" });
    }

    if (!siswa_id || !siswa_email || !siswa_password) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Siswa, email siswa, dan password siswa wajib diisi" });
    }

    const siswa = await Siswa.findByPk(siswa_id);
    if (!siswa || siswa.status !== "aktif") {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Data siswa aktif tidak ditemukan" });
    }

    const access = await ensureClassAccess(profile, req.user.id, siswa.kelas_id);
    if (!access.allowed) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: access.message });
    }

    const normalizedStudentEmail = normalizeEmail(siswa_email);
    const normalizedParentEmail = normalizeEmail(orangtua_email);
    const parentRequested = Boolean(normalizedParentEmail || orangtua_name || orangtua_password || orangtua_phone);

    if (!EMAIL_PATTERN.test(normalizedStudentEmail)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Format email siswa tidak valid" });
    }

    if (String(siswa_password).length < 6) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Kata sandi siswa minimal 6 karakter" });
    }

    if (parentRequested && (!normalizedParentEmail || !orangtua_password)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Email dan password orang tua wajib diisi jika membuat akun orang tua" });
    }

    if (parentRequested && !EMAIL_PATTERN.test(normalizedParentEmail)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Format email orang tua tidak valid" });
    }

    if (parentRequested && String(orangtua_password).length < 6) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Kata sandi orang tua minimal 6 karakter" });
    }

    const emails = [normalizedStudentEmail, normalizedParentEmail].filter(Boolean);
    if (new Set(emails).size !== emails.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Email siswa dan orang tua tidak boleh sama" });
    }

    const existingUsers = await User.findAll({ where: { email: { [Op.in]: emails } } });
    if (existingUsers.length) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: `Email sudah terdaftar: ${existingUsers.map((user) => user.email).join(", ")}`
      });
    }

    const classMap = await getClassMap();
    const kelas = classMap.get(siswa.kelas_id);
    const studentUser = await User.create({
      name: siswa.nama,
      email: normalizedStudentEmail,
      password: await bcrypt.hash(siswa_password, 10),
      role: "siswa",
      profession: kelas ? `Siswa ${kelas.nama_kelas}` : "Siswa",
      must_change_password: true
    }, { transaction });

    await siswa.update({ email: normalizedStudentEmail }, { transaction });
    if (PortalAccountLink) {
      await PortalAccountLink.create({
        user_id: studentUser.id,
        siswa_id: siswa.id,
        link_type: "siswa"
      }, { transaction });
    }

    let parentUser = null;
    if (parentRequested) {
      parentUser = await User.create({
        name: orangtua_name || `Orang Tua ${siswa.nama}`,
        email: normalizedParentEmail,
        password: await bcrypt.hash(orangtua_password, 10),
        role: "orangtua",
        profession: [`Orang tua dari ${siswa.nama}`, orangtua_phone ? `No HP: ${orangtua_phone}` : null].filter(Boolean).join(" | "),
        must_change_password: true
      }, { transaction });

      await siswa.update({
        nama_ayah: orangtua_name || siswa.nama_ayah,
        no_telepon: orangtua_phone || siswa.no_telepon
      }, { transaction });

      if (PortalAccountLink) {
        await PortalAccountLink.create({
          user_id: parentUser.id,
          siswa_id: siswa.id,
          link_type: "orangtua"
        }, { transaction });
      }
    }

    await logAudit(req, { action: "student_account.create", entityType: "student", entityId: siswa.id, metadata: { studentUserId: studentUser.id, parentUserId: parentUser?.id || null } }, { transaction });
    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: parentUser ? "Akun siswa dan orang tua berhasil dibuat" : "Akun siswa berhasil dibuat",
      data: {
        siswa: safeUser(studentUser),
        orangtua: safeUser(parentUser)
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: "Gagal membuat akun siswa/orang tua", error: error.message });
  }
};

/**
 * Controller Express (portal guru): memperbarui profil guru yang sedang login. Saat ini hanya
 * memperbarui nama. Aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.body memuat name/nama (wajib). req.user adalah
 *   akun guru yang login.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi data user dan profil guru bila sukses; 400 bila
 *   nama kosong; 500 untuk error server. Efek samping: update nama User dan menulis audit log.
 */
exports.updateProfile = async (req, res) => {
  try {
    const name = String(req.body.name || req.body.nama || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Nama wajib diisi" });
    }

    await req.user.update({ name });

    const profile = await GuruProfile.findOne({ where: { user_id: req.user.id } });

    // Simpan data pribadi guru (no. HP, alamat, jenis kelamin, foto) bila profilnya ada.
    if (profile) {
      const profileUpdates = {};
      if (req.body.no_telepon !== undefined) profileUpdates.no_telepon = req.body.no_telepon || null;
      if (req.body.alamat !== undefined) profileUpdates.alamat = req.body.alamat || null;
      if (req.body.jenis_kelamin !== undefined) {
        profileUpdates.jenis_kelamin = ["L", "P"].includes(req.body.jenis_kelamin) ? req.body.jenis_kelamin : null;
      }
      if (req.body.foto !== undefined) profileUpdates.foto = req.body.foto || null;
      if (Object.keys(profileUpdates).length) await profile.update(profileUpdates);
    }

    await logAudit(req, {
      action: "teacher.profile.update",
      entityType: "teacher_profile",
      entityId: profile?.id || req.user.id,
      metadata: { userId: req.user.id }
    });

    return res.json({
      success: true,
      message: "Profil guru berhasil diperbarui",
      data: { user: safeUser(req.user), guruProfile: profile }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memperbarui profil guru", error: error.message });
  }
};

/**
 * Controller Express (admin): membuat akun guru langsung oleh administrator
 * (menggantikan registrasi mandiri). Membuat User(role guru) + GuruProfile yang
 * langsung berstatus "approved" sehingga guru bisa login tanpa verifikasi ulang.
 *
 * @param {import('express').Request} req - req.body: name/nama, email, password,
 *   wali_kelas/is_homeroom, guru_mata_pelajaran/is_subject_teacher, mata_pelajaran/subject,
 *   kelas_wali_id/kelas_id, jenjang. req.user.id sebagai penyetuju.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} 201 berisi data akun & profil; 400 validasi gagal; 409 email
 *   terdaftar; 500 error. Efek samping: membuat User & GuruProfile dalam transaksi + audit log.
 */
exports.createGuruAccount = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const name = String(req.body.name || req.body.nama || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || req.body.kata_sandi;
    const isHomeroom = toBoolean(req.body.wali_kelas) || toBoolean(req.body.is_homeroom) || req.body.teacher_type === "wali_kelas";
    const subjectList = normalizeSubjectInput(req.body.mata_pelajaran ?? req.body.subjects ?? req.body.subject);
    const isSubjectTeacher = toBoolean(req.body.guru_mata_pelajaran) || toBoolean(req.body.is_subject_teacher) || subjectList.length > 0;
    const kelasId = Number(req.body.kelas_wali_id || req.body.kelas_id || 0);
    const jenjang = ["sd", "smp"].includes(String(req.body.jenjang || "").toLowerCase()) ? String(req.body.jenjang).toLowerCase() : null;

    if (!name || !email || !password) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Nama, email, dan kata sandi wajib diisi" });
    }
    if (String(password).length < 6) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Kata sandi minimal 6 karakter" });
    }
    if (!isHomeroom && !isSubjectTeacher) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Pilih minimal satu peran guru" });
    }
    if (isHomeroom && !kelasId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Kelas wajib dipilih untuk wali kelas" });
    }
    if (isSubjectTeacher && !subjectList.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Minimal satu mata pelajaran wajib diisi untuk guru mata pelajaran" });
    }

    const existing = await User.findOne({ where: { email }, transaction });
    if (existing) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "Email sudah terdaftar" });
    }

    const legacyType = isSubjectTeacher ? "mapel" : "wali_kelas";
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "guru",
      profession: [isHomeroom ? "Wali Kelas" : null, isSubjectTeacher ? subjectList.join(", ") : null].filter(Boolean).join(" + ") || "Guru",
      must_change_password: true
    }, { transaction });

    const profile = await GuruProfile.create({
      user_id: user.id,
      teacher_type: legacyType,
      subject: isSubjectTeacher ? subjectList.join(", ") : null,
      jenjang,
      is_homeroom: isHomeroom,
      kelas_id: isHomeroom ? kelasId : null,
      verification_status: "approved",
      approved_by: req.user.id,
      approved_at: new Date()
    }, { transaction });

    await logAudit(req, {
      action: "teacher.account.create",
      entityType: "teacher_profile",
      entityId: profile.id,
      metadata: { userId: user.id, isHomeroom, subjects: subjectList }
    }, { transaction });

    await transaction.commit();
    return res.status(201).json({
      success: true,
      message: "Akun guru berhasil dibuat. Guru dapat langsung login.",
      data: { user: safeUser(user), guruProfile: profile }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: "Gagal membuat akun guru", error: error.message });
  }
};
