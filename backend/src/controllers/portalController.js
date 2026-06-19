const { Op } = require("sequelize");
const db = require("../models");
const { logAudit } = require("../services/auditLogService");

const User = db.User;
const Guru = db.Guru;
const Siswa = db.Siswa;
const Kelas = db.Kelas;
const KepalaSekolah = db.KepalaSekolah;
const ProfilSekolah = db.ProfilSekolah;
const Pengumuman = db.Pengumuman;
const Kegiatan = db.Kegiatan;
const GuruProfile = db.GuruProfile;
const AbsensiSiswa = db.AbsensiSiswa;
const PortalAccountLink = db.PortalAccountLink;

const STUDENT_PROFILE_FIELDS = ["nama", "nisn", "no_telepon", "alamat", "jenis_kelamin", "email", "foto"];

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profession: user.profession
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function safeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDateFilter(where, dari, sampai) {
  if (dari && sampai) where.tanggal = { [Op.between]: [dari, sampai] };
  else if (dari) where.tanggal = { [Op.gte]: dari };
  else if (sampai) where.tanggal = { [Op.lte]: sampai };
}

function summarizeAttendance(rows) {
  const summary = rows.reduce(
    (accumulator, row) => {
      accumulator.total += 1;
      if (row.status === "hadir") accumulator.hadir += 1;
      else accumulator.tidak_hadir += 1;
      if (accumulator[row.status] !== undefined) accumulator[row.status] += 1;
      return accumulator;
    },
    { hadir: 0, izin: 0, sakit: 0, alpha: 0, tidak_hadir: 0, total: 0 }
  );

  summary.keterangan = `${summary.izin} izin • ${summary.sakit} sakit • ${summary.alpha} alpha`;
  return summary;
}

async function getClassMap() {
  const kelas = await Kelas.findAll();
  return new Map(kelas.map((item) => [Number(item.id), item.toJSON()]));
}

function attachClass(siswa, classMap) {
  if (!siswa) return null;
  const data = siswa.toJSON ? siswa.toJSON() : siswa;
  return { ...data, kelas: classMap.get(Number(data.kelas_id)) || null };
}

async function resolveStudentForUser(user, linkType) {
  if (!PortalAccountLink) return null;
  const link = await PortalAccountLink.findOne({ where: { user_id: user.id, link_type: linkType } });
  if (!link) return null;
  return Siswa.findByPk(link.siswa_id);
}

async function getAttendancePayload(siswa, query) {
  const where = { siswa_id: siswa.id, tipe_guru: "wali_kelas" };
  formatDateFilter(where, query.dari, query.sampai);

  const rows = await AbsensiSiswa.findAll({ where, order: [["tanggal", "DESC"], ["updatedAt", "DESC"], ["createdAt", "DESC"]] });
  const seenDates = new Set();
  const primaryRows = rows.filter((row) => {
    if (seenDates.has(row.tanggal)) return false;
    seenDates.add(row.tanggal);
    return true;
  });
  const classMap = await getClassMap();
  const teacherIds = [...new Set(primaryRows.map((row) => Number(row.guru_user_id)).filter(Boolean))];
  const teachers = teacherIds.length ? await User.findAll({ where: { id: { [Op.in]: teacherIds } } }) : [];
  const teacherMap = new Map(teachers.map((item) => [Number(item.id), safeUser(item)]));

  const dataRows = primaryRows.map((row) => {
    const data = row.toJSON();
    return {
      ...data,
      sumber_absensi: "utama_wali_kelas",
      siswa: attachClass(siswa, classMap),
      kelas: classMap.get(Number(data.kelas_id)) || null,
      guru: teacherMap.get(Number(data.guru_user_id)) || null
    };
  });

  return {
    scope: "absensi_utama_wali_kelas",
    summary: summarizeAttendance(dataRows),
    rows: dataRows
  };
}

exports.getSiswaDashboard = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "siswa");
    const classMap = await getClassMap();
    const informasiSekolah = await ProfilSekolah.findOne();
    const pengumumanTerbaru = await Pengumuman.findAll({ order: [["createdAt", "DESC"]], limit: 4 });

    return res.json({
      success: true,
      message: "Dashboard siswa berhasil diambil",
      data: {
        user: safeUser(req.user),
        siswa: attachClass(siswa, classMap),
        informasiSekolah,
        pengumumanTerbaru,
        perluLengkapiProfil: !siswa || !siswa.no_telepon || !siswa.alamat || !siswa.jenis_kelamin
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil dashboard siswa", error: error.message });
  }
};

exports.updateSiswaProfile = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "siswa");
    if (!siswa) return res.status(404).json({ success: false, message: "Data siswa tidak ditemukan untuk akun ini" });

    const updateData = {};
    STUDENT_PROFILE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    if (updateData.email) {
      const email = normalizeEmail(updateData.email);
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({ success: false, message: "Email sudah digunakan akun lain" });
      }
      updateData.email = email;
      await req.user.update({ email, name: updateData.nama || req.user.name });
    } else if (updateData.nama) {
      await req.user.update({ name: updateData.nama });
    }

    await siswa.update(updateData);
    const classMap = await getClassMap();

    return res.json({
      success: true,
      message: "Profil siswa berhasil diperbarui",
      data: attachClass(siswa, classMap)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memperbarui profil siswa", error: error.message });
  }
};

exports.getSiswaAbsensi = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "siswa");
    if (!siswa) return res.status(404).json({ success: false, message: "Data siswa tidak ditemukan untuk akun ini" });

    const payload = await getAttendancePayload(siswa, req.query);
    return res.json({ success: true, message: "Absensi siswa berhasil diambil", data: payload });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil absensi siswa", error: error.message });
  }
};

exports.getOrangTuaDashboard = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "orangtua");
    const classMap = await getClassMap();
    const informasiSekolah = await ProfilSekolah.findOne();
    const pengumumanTerbaru = await Pengumuman.findAll({ order: [["createdAt", "DESC"]], limit: 4 });

    return res.json({
      success: true,
      message: "Dashboard orang tua berhasil diambil",
      data: {
        user: safeUser(req.user),
        orangtua: {
          name: req.user.name,
          email: req.user.email,
          no_telepon: siswa?.no_telepon || "",
          alamat: siswa?.alamat || "",
          jenis_kelamin: "-"
        },
        siswa: attachClass(siswa, classMap),
        informasiSekolah,
        pengumumanTerbaru,
        perluLengkapiProfil: !siswa || !req.user.name || !siswa.no_telepon || !siswa.alamat
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil dashboard orang tua", error: error.message });
  }
};

exports.updateOrangTuaProfile = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "orangtua");
    if (!siswa) return res.status(404).json({ success: false, message: "Data siswa anak tidak ditemukan untuk akun ini" });

    const name = req.body.name || req.user.name;
    const email = req.body.email ? normalizeEmail(req.body.email) : req.user.email;

    if (email !== req.user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({ success: false, message: "Email sudah digunakan akun lain" });
      }
    }

    await req.user.update({ name, email });
    await siswa.update({
      nama_ayah: req.body.parent_type === "ibu" ? siswa.nama_ayah : name,
      nama_ibu: req.body.parent_type === "ibu" ? name : siswa.nama_ibu,
      no_telepon: req.body.no_telepon ?? siswa.no_telepon,
      alamat: req.body.alamat ?? siswa.alamat
    });

    const classMap = await getClassMap();
    return res.json({
      success: true,
      message: "Profil orang tua berhasil diperbarui",
      data: {
        user: safeUser(req.user),
        siswa: attachClass(siswa, classMap)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memperbarui profil orang tua", error: error.message });
  }
};

exports.getOrangTuaAbsensi = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "orangtua");
    if (!siswa) return res.status(404).json({ success: false, message: "Data siswa anak tidak ditemukan untuk akun ini" });

    const payload = await getAttendancePayload(siswa, req.query);
    return res.json({ success: true, message: "Absensi anak berhasil diambil", data: payload });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil absensi anak", error: error.message });
  }
};

exports.getKepalaSekolahDashboard = async (req, res) => {
  try {
    const { dari, sampai, kelas_id, export_type } = req.query;
    const classMap = await getClassMap();
    const whereAbsensi = {};
    if (kelas_id) whereAbsensi.kelas_id = Number(kelas_id);
    formatDateFilter(whereAbsensi, dari, sampai);

    const [profilSekolah, kepalaSekolah, guru, guruProfile, siswa, kelas, pengumuman, kegiatan, absensiRows] = await Promise.all([
      ProfilSekolah.findOne(),
      KepalaSekolah.findAll({ order: [["periode_mulai", "DESC"]] }),
      Guru.findAll({ order: [["nama", "ASC"]] }),
      GuruProfile.findAll({ where: { verification_status: "approved" } }),
      Siswa.findAll({ order: [["nama", "ASC"]] }),
      Kelas.findAll({ order: [["tingkat", "ASC"], ["nama_kelas", "ASC"]] }),
      Pengumuman.findAll({ order: [["date", "DESC"]], limit: 5 }),
      Kegiatan.findAll({ where: { status: "tampil" }, order: [["date", "DESC"]], limit: 5 }),
      AbsensiSiswa.findAll({ where: whereAbsensi, order: [["tanggal", "DESC"], ["kelas_id", "ASC"]] })
    ]);

    const siswaMap = new Map(siswa.map((item) => [Number(item.id), item.toJSON()]));
    const absensi = absensiRows.map((row) => {
      const data = row.toJSON();
      return {
        ...data,
        siswa: siswaMap.get(Number(data.siswa_id)) || null,
        kelas: classMap.get(Number(data.kelas_id)) || null
      };
    });

    if (export_type) {
      await logAudit(req, {
        action: `report.export.${export_type}`,
        entityType: "attendance_report",
        metadata: { dari, sampai, kelas_id, rows: absensi.length }
      });
    }

    const attendanceSummary = summarizeAttendance(absensi);

    return res.json({
      success: true,
      message: "Dashboard kepala sekolah berhasil diambil",
      data: {
        user: safeUser(req.user),
        profilSekolah,
        kepalaSekolah: kepalaSekolah[0] || null,
        daftarKepalaSekolah: kepalaSekolah,
        guru,
        guruProfile,
        monitoring: {
          totalSiswa: siswa.length,
          totalGuruWaliKelas: guruProfile.filter((item) => item.is_homeroom || item.teacher_type === "wali_kelas").length,
          totalGuruMapel: guruProfile.filter((item) => item.teacher_type === "mapel" || item.subject).length,
          totalKelas: kelas.length,
          totalPengumuman: pengumuman.length,
          totalKegiatan: kegiatan.length,
          hadir: attendanceSummary.hadir,
          izin: attendanceSummary.izin,
          sakit: attendanceSummary.sakit,
          alpha: attendanceSummary.alpha,
          terlambat: 0
        },
        siswa: siswa.map((item) => attachClass(item, classMap)),
        kelas,
        pengumuman,
        kegiatan,
        absensi: {
          summary: attendanceSummary,
          rows: absensi
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil dashboard kepala sekolah", error: error.message });
  }
};
