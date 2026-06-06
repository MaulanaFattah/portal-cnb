const { Op } = require("sequelize");
const db = require("../models");

const User = db.User;
const Guru = db.Guru;
const Siswa = db.Siswa;
const Kelas = db.Kelas;
const KepalaSekolah = db.KepalaSekolah;
const ProfilSekolah = db.ProfilSekolah;
const Pengumuman = db.Pengumuman;
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

async function persistLink(userId, siswaId, linkType) {
  if (!PortalAccountLink || !userId || !siswaId || !linkType) return;

  try {
    const existing = await PortalAccountLink.findOne({ where: { user_id: userId, link_type: linkType } });
    if (existing) await existing.update({ siswa_id: siswaId });
    else await PortalAccountLink.create({ user_id: userId, siswa_id: siswaId, link_type: linkType });
  } catch (error) {
    console.warn("Gagal menyimpan link akun portal", error.message);
  }
}

async function resolveStudentForUser(user, linkType) {
  if (PortalAccountLink) {
    const link = await PortalAccountLink.findOne({ where: { user_id: user.id, link_type: linkType } });
    if (link) {
      const linkedStudent = await Siswa.findByPk(link.siswa_id);
      if (linkedStudent) return linkedStudent;
    }
  }

  let student = null;

  if (linkType === "siswa") {
    student = await Siswa.findOne({ where: { email: user.email } });
    if (!student) student = await Siswa.findOne({ where: { nama: user.name } });
  } else {
    const profession = String(user.profession || "");
    const match = profession.match(/Orang tua dari\s*([^|]+)/i);
    const childName = match?.[1]?.trim();

    if (childName) student = await Siswa.findOne({ where: { nama: childName } });
    if (!student) {
      student = await Siswa.findOne({
        where: {
          [Op.or]: [
            { nama_ayah: user.name },
            { nama_ibu: user.name },
            { email: user.email }
          ]
        }
      });
    }
  }

  if (student) await persistLink(user.id, student.id, linkType);
  return student;
}

async function getAttendancePayload(siswa, query) {
  const where = { siswa_id: siswa.id };
  formatDateFilter(where, query.dari, query.sampai);

  const rows = await AbsensiSiswa.findAll({ where, order: [["tanggal", "DESC"], ["createdAt", "DESC"]] });
  const classMap = await getClassMap();
  const teacherIds = [...new Set(rows.map((row) => Number(row.guru_user_id)).filter(Boolean))];
  const teachers = teacherIds.length ? await User.findAll({ where: { id: { [Op.in]: teacherIds } } }) : [];
  const teacherMap = new Map(teachers.map((item) => [Number(item.id), safeUser(item)]));

  const dataRows = rows.map((row) => {
    const data = row.toJSON();
    return {
      ...data,
      siswa: attachClass(siswa, classMap),
      kelas: classMap.get(Number(data.kelas_id)) || null,
      guru: teacherMap.get(Number(data.guru_user_id)) || null
    };
  });

  return {
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
    const { dari, sampai, kelas_id } = req.query;
    const classMap = await getClassMap();
    const whereAbsensi = {};
    if (kelas_id) whereAbsensi.kelas_id = Number(kelas_id);
    formatDateFilter(whereAbsensi, dari, sampai);

    const [profilSekolah, kepalaSekolah, guru, siswa, kelas, absensiRows] = await Promise.all([
      ProfilSekolah.findOne(),
      KepalaSekolah.findAll({ order: [["periode_mulai", "DESC"]] }),
      Guru.findAll({ order: [["nama", "ASC"]] }),
      Siswa.findAll({ order: [["nama", "ASC"]] }),
      Kelas.findAll({ order: [["tingkat", "ASC"], ["nama_kelas", "ASC"]] }),
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

    return res.json({
      success: true,
      message: "Dashboard kepala sekolah berhasil diambil",
      data: {
        user: safeUser(req.user),
        profilSekolah,
        kepalaSekolah: kepalaSekolah[0] || null,
        daftarKepalaSekolah: kepalaSekolah,
        guru,
        siswa: siswa.map((item) => attachClass(item, classMap)),
        kelas,
        absensi: {
          summary: summarizeAttendance(absensi),
          rows: absensi
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil dashboard kepala sekolah", error: error.message });
  }
};
