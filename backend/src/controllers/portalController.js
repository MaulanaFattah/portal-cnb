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

/**
 * Menyaring objek user menjadi bentuk aman untuk dikirim ke klien (tanpa password/field sensitif).
 *
 * @param {Object} user - Instance/objek User yang memiliki id, name, email, role, profession.
 * @returns {{id:number, name:string, email:string, role:string, profession:string}} Data user yang aman dipublikasikan.
 */
function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profession: user.profession
  };
}

/**
 * Menormalkan alamat email menjadi bentuk standar (trim + huruf kecil) untuk pencocokan yang konsisten.
 *
 * @param {*} email - Nilai email mentah (boleh undefined/null).
 * @returns {string} Email yang sudah di-trim dan di-lowercase (string kosong bila input kosong).
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Mengubah nilai apa pun menjadi string lowercase yang sudah di-trim. Utilitas umum untuk perbandingan teks.
 *
 * @param {*} value - Nilai mentah yang akan dinormalkan.
 * @returns {string} String hasil trim + lowercase (string kosong bila input kosong).
 */
function safeLower(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Menambahkan filter rentang tanggal pada objek "where" Sequelize berdasarkan parameter dari dan sampai.
 * Mendukung filter penuh (between), hanya batas bawah (gte), atau hanya batas atas (lte).
 *
 * @param {Object} where - Objek kondisi where Sequelize yang akan dimodifikasi langsung (mutasi).
 * @param {string} [dari] - Tanggal awal (inklusif), format "YYYY-MM-DD".
 * @param {string} [sampai] - Tanggal akhir (inklusif), format "YYYY-MM-DD".
 * @returns {void} Memodifikasi objek where secara langsung; tidak mengembalikan nilai.
 */
function formatDateFilter(where, dari, sampai) {
  if (dari && sampai) where.tanggal = { [Op.between]: [dari, sampai] };
  else if (dari) where.tanggal = { [Op.gte]: dari };
  else if (sampai) where.tanggal = { [Op.lte]: sampai };
}

/**
 * Menghitung ringkasan statistik kehadiran dari sekumpulan baris absensi: total, jumlah per status
 * (hadir/izin/sakit/alpha), dan total tidak hadir. Juga menyusun teks keterangan ringkas.
 *
 * @param {Array<Object>} rows - Daftar baris absensi, masing-masing memiliki field status.
 * @returns {{hadir:number, izin:number, sakit:number, alpha:number, tidak_hadir:number, total:number, keterangan:string}}
 *   Objek ringkasan kehadiran beserta teks keterangan ("x izin • y sakit • z alpha").
 */
function summarizeAttendance(rows) {
  const summary = rows.reduce(
    (accumulator, row) => {
      accumulator.total += 1;
      if (accumulator[row.status] !== undefined) accumulator[row.status] += 1;
      if (row.status !== "hadir") accumulator.tidak_hadir += 1;
      return accumulator;
    },
    { hadir: 0, izin: 0, sakit: 0, alpha: 0, tidak_hadir: 0, total: 0 }
  );

  summary.keterangan = `${summary.izin} izin • ${summary.sakit} sakit • ${summary.alpha} alpha`;
  return summary;
}

/**
 * Mengambil seluruh data kelas dan memetakannya berdasarkan id untuk pencarian cepat (lookup) data kelas.
 *
 * @returns {Promise<Map<number, Object>>} Map dengan key id kelas (number) dan value objek kelas (JSON).
 */
async function getClassMap() {
  const kelas = await Kelas.findAll();
  return new Map(kelas.map((item) => [Number(item.id), item.toJSON()]));
}

/**
 * Menebak jenjang (sd/smp) sebuah kelas berdasarkan pola teks pada tingkat dan nama kelasnya.
 * Mencocokkan pola SMP (smp, VII-IX, 7-9) lalu pola SD (sd, 1-6, angka romawi I-VI).
 *
 * @param {Object} kelas - Objek kelas yang memiliki field tingkat dan nama_kelas.
 * @returns {("sd"|"smp"|null)} Jenjang hasil tebakan, atau null bila tidak dapat ditentukan.
 */
function inferClassJenjang(kelas) {
  const text = `${kelas?.tingkat || ""} ${kelas?.nama_kelas || ""}`.toLowerCase();
  if (/(smp|vii|viii|ix|\b7\b|\b8\b|\b9\b)/.test(text)) return "smp";
  if (/(sd|\b1\b|\b2\b|\b3\b|\b4\b|\b5\b|\b6\b|\bi\b|\bii\b|\biii\b|\biv\b|\bv\b|\bvi\b)/.test(text)) return "sd";
  return null;
}

/**
 * Menentukan apakah sebuah kelas termasuk dalam jenjang tertentu. Dipakai untuk membatasi data sesuai
 * cakupan (scope) jenjang kepala sekolah. Bila jenjang tidak ditentukan, semua kelas dianggap cocok.
 *
 * @param {Object} kelas - Objek kelas yang akan diperiksa.
 * @param {("sd"|"smp"|null)} jenjang - Jenjang target pembatasan; null/false berarti tanpa pembatasan.
 * @returns {boolean} true bila kelas cocok dengan jenjang (atau tanpa pembatasan), false bila tidak.
 */
function matchesJenjangByClass(kelas, jenjang) {
  if (!jenjang) return true;
  const classJenjang = inferClassJenjang(kelas);
  return classJenjang ? classJenjang === jenjang : false;
}

/**
 * Menentukan cakupan (scope) data berdasarkan peran user. Admin memiliki akses penuh tanpa batasan jenjang.
 * Kepala sekolah dibatasi pada jenjang profilnya yang berstatus aktif; bila profil tidak ada atau belum
 * memiliki jenjang, akses diblokir.
 *
 * @param {Object} user - Objek user yang sedang login (memiliki id, email, role).
 * @returns {Promise<{jenjang:(string|null), profile:(Object|null), blocked?:boolean, message?:string}>}
 *   Objek scope: jenjang & profil bila valid, atau {blocked:true, message} bila akses kepala sekolah ditolak.
 */
async function resolvePrincipalScope(user) {
  if (user.role === "admin") return { jenjang: null, profile: null };

  const profile = await KepalaSekolah.findOne({
    where: {
      status: "aktif",
      [Op.or]: [
        { user_id: user.id },
        { email: user.email }
      ]
    },
    order: [["periode_mulai", "DESC"]]
  });

  if (!profile || !profile.jenjang) {
    return { blocked: true, message: "Akun kepala sekolah belum aktif atau belum memiliki jenjang" };
  }

  return { jenjang: profile.jenjang, profile };
}

/**
 * Melengkapi data siswa dengan objek kelasnya berdasarkan kelas_id, memakai map kelas yang sudah disiapkan.
 *
 * @param {Object|null} siswa - Instance/objek siswa (boleh null).
 * @param {Map<number, Object>} classMap - Map id kelas ke objek kelas (lihat getClassMap).
 * @returns {Object|null} Objek siswa (JSON) dengan tambahan field "kelas", atau null bila siswa null.
 */
function attachClass(siswa, classMap) {
  if (!siswa) return null;
  const data = siswa.toJSON ? siswa.toJSON() : siswa;
  return { ...data, kelas: classMap.get(Number(data.kelas_id)) || null };
}

/**
 * Menemukan data siswa yang tertaut ke akun user portal (siswa atau orang tua) melalui tabel PortalAccountLink.
 *
 * @param {Object} user - Objek user yang sedang login (memakai user.id).
 * @param {("siswa"|"orangtua")} linkType - Jenis keterkaitan akun ke siswa.
 * @returns {Promise<Object|null>} Instance Siswa yang tertaut, atau null bila tidak ada tautan/model tidak tersedia.
 */
async function resolveStudentForUser(user, linkType) {
  if (!PortalAccountLink) return null;
  const link = await PortalAccountLink.findOne({ where: { user_id: user.id, link_type: linkType } });
  if (!link) return null;
  return Siswa.findByPk(link.siswa_id);
}

/**
 * Menyusun payload absensi seorang siswa khusus dari sumber wali kelas. Mengambil baris absensi (dengan filter
 * tanggal opsional), menyaring agar hanya satu baris terbaru per tanggal, melengkapi data kelas dan guru pencatat,
 * lalu menyertakan ringkasan kehadiran. Dipakai oleh dashboard siswa dan orang tua.
 *
 * @param {Object} siswa - Instance siswa yang absensinya diambil (memakai siswa.id).
 * @param {Object} query - Objek req.query. Memakai query.dari dan query.sampai untuk filter rentang tanggal.
 * @returns {Promise<{scope:string, summary:Object, rows:Array<Object>}>} Payload absensi berisi cakupan,
 *   ringkasan kehadiran, dan daftar baris absensi yang sudah dilengkapi data siswa/kelas/guru.
 */
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

/**
 * Menyediakan data dashboard untuk akun siswa: identitas user, data siswa beserta kelas, informasi sekolah,
 * pengumuman terbaru, serta penanda apakah profil siswa masih perlu dilengkapi.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.user (akun siswa yang sedang login).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi data dashboard siswa; 500 bila terjadi kesalahan.
 */
exports.getSiswaDashboard = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "siswa");
    const classMap = await getClassMap();
    const informasiSekolah = await ProfilSekolah.findOne();
    const pengumumanTerbaru = await Pengumuman.findAll({ order: [["createdAt", "DESC"]], limit: 4 });

    return res.json({
      success: true,
      message: "Data dasbor siswa berhasil diambil",
      data: {
        user: safeUser(req.user),
        siswa: attachClass(siswa, classMap),
        informasiSekolah,
        pengumumanTerbaru,
        perluLengkapiProfil: !siswa || !siswa.no_telepon || !siswa.alamat || !siswa.jenis_kelamin
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil dasbor siswa", error: error.message });
  }
};

/**
 * Memperbarui profil siswa yang sedang login. Hanya field profil yang diizinkan yang diproses, dan field email
 * sengaja diabaikan (tidak boleh diubah dari sini). Bila nama berubah, nama pada akun User ikut diperbarui.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.user (akun siswa) dan req.body
 *   (field profil: nama, nisn, no_telepon, alamat, jenis_kelamin, email, foto — email diabaikan).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui record Siswa dan (opsional) nama User. Mengirim HTTP 200
 *   dengan data siswa terbaru; 404 bila data siswa tidak ditemukan untuk akun ini; 500 bila terjadi kesalahan.
 */
exports.updateSiswaProfile = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "siswa");
    if (!siswa) return res.status(404).json({ success: false, message: "Data siswa tidak ditemukan untuk akun ini" });

    const updateData = {};
    STUDENT_PROFILE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    delete updateData.email;
    if (updateData.nama) {
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

/**
 * Mengambil data absensi siswa yang sedang login (sumber wali kelas) beserta ringkasannya, dengan filter
 * rentang tanggal opsional.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.user (akun siswa) dan req.query.dari/sampai.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi payload absensi; 404 bila data siswa tidak ditemukan;
 *   500 bila terjadi kesalahan.
 */
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

/**
 * Menyediakan data dashboard untuk akun orang tua: identitas orang tua, data anak (siswa) beserta kelas,
 * informasi sekolah, pengumuman terbaru, serta penanda apakah profil masih perlu dilengkapi.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.user (akun orang tua yang sedang login).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi data dashboard orang tua; 500 bila terjadi kesalahan.
 */
exports.getOrangTuaDashboard = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "orangtua");
    const classMap = await getClassMap();
    const informasiSekolah = await ProfilSekolah.findOne();
    const pengumumanTerbaru = await Pengumuman.findAll({ order: [["createdAt", "DESC"]], limit: 4 });

    return res.json({
      success: true,
      message: "Data dasbor orang tua berhasil diambil",
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
    return res.status(500).json({ success: false, message: "Gagal mengambil dasbor orang tua", error: error.message });
  }
};

/**
 * Memperbarui profil orang tua yang sedang login sekaligus sebagian data terkait pada record anak (siswa).
 * Nama orang tua diset ke field nama_ayah atau nama_ibu sesuai parent_type, dan nomor telepon/alamat anak
 * ikut diperbarui bila dikirim. Nama pada akun User juga diperbarui.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.user (akun orang tua) dan req.body
 *   (name, parent_type untuk menentukan ayah/ibu, no_telepon, alamat).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui nama User dan sebagian field Siswa. Mengirim HTTP 200 dengan
 *   data user & siswa terbaru; 404 bila data anak tidak ditemukan; 500 bila terjadi kesalahan.
 */
exports.updateOrangTuaProfile = async (req, res) => {
  try {
    const siswa = await resolveStudentForUser(req.user, "orangtua");
    if (!siswa) return res.status(404).json({ success: false, message: "Data siswa anak tidak ditemukan untuk akun ini" });

    const name = req.body.name || req.user.name;

    await req.user.update({ name });
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

/**
 * Mengambil data absensi anak (siswa) dari akun orang tua yang sedang login beserta ringkasannya, dengan filter
 * rentang tanggal opsional.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.user (akun orang tua) dan req.query.dari/sampai.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi payload absensi anak; 404 bila data anak tidak ditemukan;
 *   500 bila terjadi kesalahan.
 */
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

/**
 * Memperbarui profil kepala sekolah yang sedang login. Hanya boleh diakses role kepala_sekolah dan hanya bila
 * scope-nya tidak diblokir. Memvalidasi nama wajib ada, memperbarui field profil tertentu, menyinkronkan nama
 * pada akun User, lalu mencatat audit log.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.user (akun kepala sekolah) dan req.body
 *   (nama, no_telepon, alamat, foto).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui profil KepalaSekolah, nama User, dan menulis audit log
 *   "principal.profile.update". Mengirim HTTP 200 dengan data terbaru; 403 bila bukan kepala sekolah atau scope
 *   diblokir; 400 bila nama kosong; 500 bila terjadi kesalahan.
 */
exports.updateKepalaSekolahProfile = async (req, res) => {
  try {
    if (req.user.role !== "kepala_sekolah") {
      return res.status(403).json({ success: false, message: "Akses hanya untuk kepala sekolah" });
    }

    const scope = await resolvePrincipalScope(req.user);
    if (scope.blocked) return res.status(403).json({ success: false, message: scope.message });

    const profile = scope.profile;
    const updateData = {};
    ["nama", "no_telepon", "alamat", "foto"].forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field] || null;
    });

    if (!String(updateData.nama || profile.nama || "").trim()) {
      return res.status(400).json({ success: false, message: "Nama wajib diisi" });
    }

    if (updateData.nama) updateData.nama = String(updateData.nama).trim();
    await profile.update(updateData);

    if (updateData.nama) {
      await req.user.update({ name: updateData.nama });
    }

    await logAudit(req, {
      action: "principal.profile.update",
      entityType: "principal_profile",
      entityId: profile.id
    });

    return res.json({
      success: true,
      message: "Profil kepala sekolah berhasil diperbarui",
      data: {
        user: safeUser(req.user),
        kepalaSekolah: profile
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memperbarui profil kepala sekolah", error: error.message });
  }
};

/**
 * Menyediakan data dashboard monitoring untuk kepala sekolah (atau admin). Membatasi seluruh data sesuai jenjang
 * kepala sekolah: kelas, guru (dari GuruProfile yang sudah disetujui), siswa, dan absensi wali kelas. Menghitung
 * ringkasan monitoring (jumlah siswa, guru wali kelas/mapel, kelas, pengumuman, kegiatan, dan statistik kehadiran).
 * Mendukung filter rentang tanggal dan kelas tertentu, serta mencatat audit log saat ekspor laporan diminta.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.user (akun) dan req.query.dari, req.query.sampai,
 *   req.query.kelas_id (filter kelas, divalidasi terhadap jenjang), req.query.export_type (jenis ekspor untuk audit).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: menulis audit log "report.export.{type}" bila export_type diisi.
 *   Mengirim HTTP 200 berisi data dashboard lengkap; 403 bila scope diblokir atau kelas di luar jenjang;
 *   500 bila terjadi kesalahan.
 */
exports.getKepalaSekolahDashboard = async (req, res) => {
  try {
    const { dari, sampai, kelas_id, export_type } = req.query;
    const scope = await resolvePrincipalScope(req.user);
    if (scope.blocked) return res.status(403).json({ success: false, message: scope.message });

    const [profilSekolah, allKelas, pengumuman, kegiatan] = await Promise.all([
      ProfilSekolah.findOne(),
      Kelas.findAll({ order: [["tingkat", "ASC"], ["nama_kelas", "ASC"]] }),
      Pengumuman.findAll({ order: [["date", "DESC"]], limit: 5 }),
      Kegiatan.findAll({ where: { status: "tampil" }, order: [["date", "DESC"]], limit: 5 })
    ]);

    const scopedKelas = scope.jenjang
      ? allKelas.filter((item) => matchesJenjangByClass(item, scope.jenjang))
      : allKelas;
    const classMap = new Map(scopedKelas.map((item) => [Number(item.id), item.toJSON()]));
    const classIds = scopedKelas.map((item) => Number(item.id)).filter(Boolean);

    const whereSiswa = scope.jenjang ? { kelas_id: { [Op.in]: classIds } } : {};
    const whereAbsensi = { tipe_guru: "wali_kelas" };

    if (scope.jenjang) {
      if (!classIds.length) {
        whereAbsensi.kelas_id = { [Op.in]: [] };
      } else if (kelas_id) {
        const requestedClassId = Number(kelas_id);
        if (!classIds.includes(requestedClassId)) {
          return res.status(403).json({ success: false, message: "Kelas tidak termasuk jenjang kepala sekolah" });
        }
        whereAbsensi.kelas_id = requestedClassId;
      } else {
        whereAbsensi.kelas_id = { [Op.in]: classIds };
      }
    } else if (kelas_id) {
      whereAbsensi.kelas_id = Number(kelas_id);
    }

    formatDateFilter(whereAbsensi, dari, sampai);

    const profileWhere = { verification_status: "approved" };
    if (scope.jenjang) {
      profileWhere[Op.or] = [
        { jenjang: scope.jenjang },
        { jenjang: null, kelas_id: { [Op.in]: classIds } }
      ];
    }

    const [kepalaSekolah, guruProfile, siswa, absensiRows] = await Promise.all([
      scope.profile
        ? [scope.profile]
        : KepalaSekolah.findAll({ order: [["periode_mulai", "DESC"]] }),
      GuruProfile.findAll({
        where: profileWhere,
        include: [{ model: User, as: "user" }],
        order: [["createdAt", "DESC"]]
      }),
      Siswa.findAll({ where: whereSiswa, order: [["nama", "ASC"]] }),
      AbsensiSiswa.findAll({ where: whereAbsensi, order: [["tanggal", "DESC"], ["kelas_id", "ASC"]] })
    ]);

    const scopedGuruProfiles = guruProfile.filter((profile) => {
      if (!scope.jenjang) return true;
      if (profile.jenjang === scope.jenjang) return true;
      return !profile.jenjang && classIds.includes(Number(profile.kelas_id));
    });

    const guru = scopedGuruProfiles.map((profile) => {
      const isHomeroom = Boolean(profile.is_homeroom) || profile.teacher_type === "wali_kelas";
      const isSubjectTeacher = profile.teacher_type === "mapel" || Boolean(profile.subject);
      const statusGuru = [
        isHomeroom ? "Guru Wali Kelas" : null,
        isSubjectTeacher ? "Guru Mapel" : null
      ].filter(Boolean).join(" + ") || "-";

      return {
        id: profile.user?.id || profile.user_id,
        nama: profile.user?.name || "Guru",
        email: profile.user?.email || "-",
        jenis_kelamin: null,
        no_telepon: "-",
        pendidikan_terakhir: profile.subject || (isHomeroom ? "Wali Kelas" : "-"),
        status: profile.verification_status === "approved" ? "aktif" : "non-aktif",
        status_guru: statusGuru,
        jenjang: profile.jenjang,
        guruProfile: profile
      };
    });

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
        metadata: { dari, sampai, kelas_id, jenjang: scope.jenjang, rows: absensi.length }
      });
    }

    const attendanceSummary = summarizeAttendance(absensi);

    return res.json({
      success: true,
      message: "Data dasbor kepala sekolah berhasil diambil",
      data: {
        user: safeUser(req.user),
        scopeJenjang: scope.jenjang,
        profilSekolah,
        kepalaSekolah: kepalaSekolah[0] || null,
        daftarKepalaSekolah: kepalaSekolah,
        guru,
        guruProfile: scopedGuruProfiles,
        monitoring: {
          totalSiswa: siswa.length,
          totalGuruWaliKelas: scopedGuruProfiles.filter((item) => item.is_homeroom || item.teacher_type === "wali_kelas").length,
          totalGuruMapel: scopedGuruProfiles.filter((item) => item.teacher_type === "mapel" || item.subject).length,
          totalKelas: scopedKelas.length,
          totalPengumuman: pengumuman.length,
          totalKegiatan: kegiatan.length,
          hadir: attendanceSummary.hadir,
          izin: attendanceSummary.izin,
          sakit: attendanceSummary.sakit,
          alpha: attendanceSummary.alpha,
          terlambat: 0
        },
        siswa: siswa.map((item) => attachClass(item, classMap)),
        kelas: scopedKelas,
        pengumuman,
        kegiatan,
        absensi: {
          summary: attendanceSummary,
          rows: absensi
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil dasbor kepala sekolah", error: error.message });
  }
};
