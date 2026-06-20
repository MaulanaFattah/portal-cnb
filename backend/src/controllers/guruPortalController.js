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

function getHari(tanggal) {
  const [year, month, day] = String(tanggal).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return DAY_NAMES[date.getDay()];
}

function uniqueNumbers(values) {
  return [...new Set(values.map((value) => Number(value)).filter(Boolean))];
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeSubjects(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function toBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function hasAnyOwn(object, keys) {
  return keys.some((key) => hasOwn(object, key));
}

function isHomeroomSubjectLabel(value) {
  const text = String(value || "").trim().toLowerCase();
  return ["wali kelas", "guru wali kelas", "guru"].includes(text);
}

function normalizeSubjectInput(value) {
  return normalizeSubjects(value)
    .flatMap((item) => String(item).split(/[;+]/).map((part) => part.trim()).filter(Boolean))
    .filter((item) => !isHomeroomSubjectLabel(item));
}

function isHomeroomProfile(profile) {
  return Boolean(profile?.is_homeroom) || profile?.teacher_type === "wali_kelas";
}

function isSubjectTeacherProfile(profile) {
  return profile?.teacher_type === "mapel" && normalizeSubjectInput(profile?.subject).length > 0;
}

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

async function getClassMap() {
  const kelas = await Kelas.findAll();
  return new Map(kelas.map((item) => [item.id, item.toJSON()]));
}

async function getApprovedProfile(userId) {
  const profile = await GuruProfile.findOne({ where: { user_id: userId } });
  if (!profile || profile.verification_status !== "approved") return null;
  return profile;
}

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

exports.getDashboard = async (req, res) => {
  try {
    const profile = await getApprovedProfile(req.user.id);
    if (!profile) {
      return res.status(403).json({ success: false, message: "Akun guru belum aktif" });
    }

    const classMap = await getClassMap();
    const context = await getAccessibleContext(profile, req.user.id, classMap);
    const informasiSekolah = await ProfilSekolah.findOne();
    const pengumumanTerbaru = await Pengumuman.findAll({ order: [["createdAt", "DESC"]], limit: 4 });
    const siswa = context.classIds.length
      ? await Siswa.findAll({
        where: { kelas_id: { [Op.in]: context.classIds }, status: "aktif" },
        order: [["nama", "ASC"]]
      })
      : [];

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
        jadwal: context.jadwal
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil dashboard guru", error: error.message });
  }
};

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

exports.getRekapAbsensi = async (req, res) => {
  try {
    const { kelas_id, jadwal_id, dari, sampai } = req.query;
    const profile = await getApprovedProfile(req.user.id);

    if (!profile) {
      return res.status(403).json({ success: false, message: "Akun guru belum aktif" });
    }

    const classMap = await getClassMap();
    const where = {};
    let classId = Number(kelas_id || 0);

    if (jadwal_id) {
      if (!isSubjectTeacherProfile(profile)) {
        return res.status(403).json({ success: false, message: "Jadwal mapel hanya dapat digunakan guru mata pelajaran" });
      }
      const jadwal = await JadwalMengajar.findOne({ where: { id: jadwal_id, guru_user_id: req.user.id, status: "aktif" } });
      if (!jadwal) return res.status(404).json({ success: false, message: "Jadwal mengajar tidak ditemukan" });
      classId = jadwal.kelas_id;
      where.guru_user_id = req.user.id;
      where.jadwal_id = jadwal.id;
      where.kelas_id = jadwal.kelas_id;
    } else if (classId) {
      const access = await ensureClassAccess(profile, req.user.id, classId);
      if (!access.allowed) return res.status(403).json({ success: false, message: access.message });
      where.kelas_id = classId;
      if (!access.homeroom) where.guru_user_id = req.user.id;
    } else if (isHomeroomProfile(profile) && profile.kelas_id) {
      where.kelas_id = Number(profile.kelas_id);
    } else {
      const context = await getAccessibleContext(profile, req.user.id, classMap);
      if (!context.classIds.length) {
        return res.json({ success: true, message: "Belum ada kelas pada roster", data: { summary: summarizeAbsensi([]), rows: [] } });
      }
      where.guru_user_id = req.user.id;
      where.kelas_id = { [Op.in]: context.classIds };
    }

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
