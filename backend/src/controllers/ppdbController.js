const db = require("../models");
const bcrypt = require("bcryptjs");

const PPDB = db.PPDB;
const Pengumuman = db.Pengumuman;
const Siswa = db.Siswa;
const Kelas = db.Kelas;
const User = db.User;
const PortalAccountLink = db.PortalAccountLink;
const { notifyNewPPDB } = require("../services/ppdbNotifier");
const { logAudit } = require("../services/auditLogService");

const ACCEPTED_PPDB_ANNOUNCEMENT_TITLE = "Pengumuman Siswa Diterima PPDB Sekolah Cipta Nusa Bakti";

/**
 * Daftar key berkas pendaftaran yang boleh dikirim ulang (resubmit) oleh pendaftar
 * saat status "revisi_berkas". Hanya field-field inilah yang boleh ditimpa.
 */
const ALLOWED_DOCUMENT_KEYS = [
  "berkas_akta",
  "berkas_kk",
  "berkas_ktp_ortu",
  "foto_siswa",
  "berkas_raport",
  "berkas_surat_pindah"
];

/**
 * Daftar key DATA (biodata) yang boleh diminta diperbaiki & dikirim ulang oleh
 * pendaftar saat status "revisi_berkas" (mis. salah nama, NIK keliru, dll).
 */
const ALLOWED_DATA_KEYS = [
  "nama_lengkap",
  "nisn",
  "nik",
  "no_kk",
  "tempat_lahir",
  "tanggal_lahir",
  "jenis_kelamin",
  "agama",
  "alamat",
  "nama_orang_tua",
  "no_telepon",
  "nama_ayah",
  "nama_ibu"
];

/**
 * Gabungan seluruh key yang boleh diminta diperbaiki (berkas + data).
 */
const ALLOWED_REVISION_KEYS = [...ALLOWED_DOCUMENT_KEYS, ...ALLOWED_DATA_KEYS];

/**
 * Mem-parse nilai berkas_revisi (JSON string array) menjadi array key yang valid
 * (berkas maupun data).
 * @param {string|null} value - Nilai berkas_revisi tersimpan.
 * @returns {string[]} Array key yang termasuk ALLOWED_REVISION_KEYS.
 */
function parseBerkasRevisi(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key) => ALLOWED_REVISION_KEYS.includes(key));
  } catch {
    return [];
  }
}

/**
 * Memvalidasi sebuah nilai berkas (data URL base64) agar bertipe gambar/PDF dan
 * tidak melampaui batas ukuran. Validasi ini WAJIB di sisi server karena validasi
 * frontend dapat dilewati lewat permintaan langsung ke API.
 * @param {string} value - Data URL berkas (mis. "data:image/jpeg;base64,...").
 * @param {number} [maxBytes=5*1024*1024] - Batas ukuran berkas dalam byte.
 * @returns {{ valid: boolean, message?: string }} Hasil validasi.
 */
function validateDocumentValue(value, maxBytes = 5 * 1024 * 1024) {
  const str = String(value || "");
  const match = /^data:([^;]+);base64,(.+)$/i.exec(str);
  if (!match) {
    return { valid: false, message: "Format berkas tidak valid. Unggah ulang berkas gambar atau PDF." };
  }
  const mime = match[1].toLowerCase();
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedMimes.includes(mime)) {
    return { valid: false, message: "Berkas harus berupa JPG, PNG, atau PDF." };
  }
  // Perkiraan ukuran asli dari panjang base64 (4 karakter base64 ≈ 3 byte).
  const approxBytes = Math.floor((match[2].length * 3) / 4);
  if (approxBytes > maxBytes) {
    return { valid: false, message: "Ukuran berkas terlalu besar (maksimal 5MB)." };
  }
  return { valid: true };
}

/**
 * Menghasilkan nomor registrasi / ID sementara untuk calon siswa yang diterima.
 * Format singkat & mudah diingat: <PREFIX JENJANG><4 digit acak>, mis. "SD4821".
 * ID ini dipakai sebagai pengganti NIS sementara sekaligus dasar email login.
 * @param {string} jenjang - "tk" | "sd" | "smp".
 * @returns {string} Nomor registrasi singkat.
 */
function generateRegistrationNumber(jenjang) {
  const prefix = String(jenjang || "S").toUpperCase().slice(0, 3);
  const rand = Math.floor(1000 + Math.random() * 9000); // 4 digit (1000-9999)
  return `${prefix}${rand}`;
}

/**
 * Menghasilkan nomor registrasi singkat yang dijamin unik (cek tabel Siswa &
 * email akun User). Bila gagal setelah beberapa percobaan, memakai cadangan
 * berbasis timestamp agar tetap unik.
 * @param {string} jenjang - "tk" | "sd" | "smp".
 * @returns {Promise<string>} Nomor registrasi unik.
 */
async function generateUniqueRegistrationNumber(jenjang) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = generateRegistrationNumber(jenjang);
    const email = `${candidate.toLowerCase().replace(/[^a-z0-9]+/g, "")}@cnb.sch.id`;
    const [siswaExists, userExists] = await Promise.all([
      Siswa.findOne({ where: { nomor_registrasi: candidate } }),
      User.findOne({ where: { email } })
    ]);
    if (!siswaExists && !userExists) return candidate;
  }
  const prefix = String(jenjang || "S").toUpperCase().slice(0, 3);
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

/**
 * Menentukan tingkat kelas awal sesuai jenjang penerimaan.
 * @param {string} jenjang - "tk" | "sd" | "smp".
 * @returns {string|null} "1" untuk SD, "7" untuk SMP, null untuk TK/lainnya.
 */
function placementTingkat(jenjang) {
  if (jenjang === "sd") return "1";
  if (jenjang === "smp") return "7";
  return null;
}

/**
 * Usia minimal calon siswa per jenjang (dalam tahun) sesuai ketentuan PPDB.
 */
const MIN_AGE_BY_JENJANG = { tk: 5, sd: 6, smp: 12 };

/**
 * Menentukan tanggal acuan perhitungan usia: 1 Juli tahun awal tahun ajaran.
 * @param {string} tahunAjaran - Format "2025/2026"; tahun awal diambil sebelum "/".
 * @returns {Date} Tanggal 1 Juli pada tahun awal tahun ajaran (atau tahun ini bila tak valid).
 */
function academicYearReferenceDate(tahunAjaran) {
  const startYear = parseInt(String(tahunAjaran || "").split("/")[0], 10);
  const year = Number.isFinite(startYear) ? startYear : new Date().getFullYear();
  return new Date(year, 6, 1); // bulan index 6 = Juli
}

/**
 * Menghitung usia (dalam tahun penuh) pada tanggal acuan tertentu.
 * @param {string|Date} birthDate - Tanggal lahir.
 * @param {Date} referenceDate - Tanggal acuan perhitungan.
 * @returns {number} Usia dalam tahun penuh; NaN bila tanggal lahir tidak valid.
 */
function calculateAge(birthDate, referenceDate) {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return NaN;
  let age = referenceDate.getFullYear() - birth.getFullYear();
  const monthDiff = referenceDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Memvalidasi usia minimal calon siswa sesuai jenjang pada tahun ajaran terkait.
 * @param {string} jenjang - "tk" | "sd" | "smp".
 * @param {string|Date} tanggalLahir - Tanggal lahir calon siswa.
 * @param {string} tahunAjaran - Tahun ajaran (mis. "2025/2026").
 * @returns {{ valid: boolean, message?: string }} Hasil validasi.
 */
function validateAgeForJenjang(jenjang, tanggalLahir, tahunAjaran) {
  const minAge = MIN_AGE_BY_JENJANG[jenjang];
  if (minAge === undefined) return { valid: true };
  const age = calculateAge(tanggalLahir, academicYearReferenceDate(tahunAjaran));
  if (Number.isNaN(age)) {
    return { valid: false, message: "Tanggal lahir tidak valid." };
  }
  if (age < minAge) {
    return {
      valid: false,
      message: `Usia calon siswa belum memenuhi syarat minimal untuk jenjang yang dipilih. Minimal usia jenjang ${jenjang.toUpperCase()} adalah ${minAge} tahun.`
    };
  }
  return { valid: true };
}

/**
 * Mencari kelas awal yang cocok untuk penempatan otomatis berdasarkan tingkat.
 * @param {string} tingkat - Tingkat kelas yang dicari (mis. "1" atau "7").
 * @returns {Promise<object|null>} Instance Kelas pertama yang cocok, atau null.
 */
async function findPlacementClass(tingkat) {
  if (!tingkat) return null;
  const kelasList = await Kelas.findAll();
  return kelasList.find((k) => String(k.tingkat).trim() === String(tingkat)) || null;
}

/**
 * Mendaftarkan (enroll) calon siswa yang DITERIMA menjadi data Siswa aktif secara
 * otomatis, lengkap dengan nomor registrasi/ID sementara dan akun login siswa
 * (memakai ID sementara) bila belum ada. Idempoten: bila siswa untuk pendaftaran
 * ini sudah dibuat, fungsi tidak menggandakan.
 *
 * @param {object} ppdb - Instance PPDB yang berstatus diterima.
 * @param {import('express').Request} req - Request (untuk audit log).
 * @returns {Promise<object>} Instance Siswa yang dibuat/ditemukan. Efek samping:
 *   membuat Siswa, User (akun login siswa), PortalAccountLink, dan audit log.
 */
async function enrollAcceptedApplicant(ppdb, req) {
  if (ppdb.nomor_registrasi) {
    const existing = await Siswa.findOne({ where: { nomor_registrasi: ppdb.nomor_registrasi } });
    if (existing) return existing;
  }

  const regNumber = ppdb.nomor_registrasi || await generateUniqueRegistrationNumber(ppdb.target_jenjang);
  const tingkat = placementTingkat(ppdb.target_jenjang);
  const kelas = tingkat ? await findPlacementClass(tingkat) : null;

  const siswa = await Siswa.create({
    nisn: regNumber, // sementara memakai nomor registrasi sampai NIS resmi terbit
    nomor_registrasi: regNumber,
    nama: ppdb.nama_lengkap,
    kelas_id: kelas ? kelas.id : null,
    tempat_lahir: ppdb.tempat_lahir,
    tanggal_lahir: ppdb.tanggal_lahir,
    jenis_kelamin: ppdb.jenis_kelamin,
    agama: ppdb.agama,
    alamat: ppdb.alamat,
    nama_ayah: ppdb.nama_ayah || ppdb.nama_orang_tua,
    nama_ibu: ppdb.nama_ibu,
    no_telepon: ppdb.no_telepon,
    email: ppdb.email,
    status: "aktif"
  });

  const loginEmail = `${String(regNumber).toLowerCase().replace(/[^a-z0-9]+/g, "")}@cnb.sch.id`;
  const existingUser = await User.findOne({ where: { email: loginEmail } });
  if (!existingUser) {
    const user = await User.create({
      name: ppdb.nama_lengkap,
      email: loginEmail,
      password: await bcrypt.hash(String(regNumber), 10),
      role: "siswa",
      profession: kelas ? `Siswa ${kelas.nama_kelas}` : "Siswa Baru",
      must_change_password: true
    });
    if (PortalAccountLink) {
      await PortalAccountLink.create({ user_id: user.id, siswa_id: siswa.id, link_type: "siswa" });
    }
  }

  await ppdb.update({ nomor_registrasi: regNumber });
  await logAudit(req, {
    action: "ppdb.enroll",
    entityType: "student",
    entityId: siswa.id,
    metadata: { ppdbId: ppdb.id, nomor_registrasi: regNumber, kelas_id: kelas ? kelas.id : null, jenjang: ppdb.target_jenjang }
  });
  return siswa;
}

/**
 * Menghasilkan tanggal hari ini dalam format "YYYY-MM-DD". Dipakai sebagai tanggal pengumuman PPDB.
 *
 * @returns {string} Tanggal hari ini dalam format "YYYY-MM-DD".
 */
function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Menyusun isi (konten) teks pengumuman daftar calon siswa yang diterima PPDB. Mengambil nama-nama pendaftar
 * yang valid, memberinya nomor urut, lalu menggabungkannya dengan kalimat pembuka dan instruksi daftar ulang.
 *
 * @param {Array<Object>} acceptedApplicants - Daftar record PPDB berstatus diterima (memakai field nama_lengkap).
 * @returns {string} Teks konten pengumuman yang siap disimpan ke record Pengumuman.
 */
function buildAcceptedPPDBAnnouncementContent(acceptedApplicants) {
  const acceptedNames = acceptedApplicants
    .map((item) => String(item.nama_lengkap || "").trim())
    .filter(Boolean);
  const nameList = acceptedNames
    .map((name, index) => `${index + 1}. ${name}`)
    .join("\n");

  return [
    "Selamat kepada calon siswa berikut yang dinyatakan lulus dan diterima di Sekolah Cipta Nusa Bakti:",
    nameList,
    "",
    "Seluruh calon siswa yang namanya tercantum dimohon datang ke Sekolah Cipta Nusa Bakti untuk melakukan pendaftaran ulang sesuai jadwal dan arahan panitia PPDB. Mohon membawa berkas asli dan dokumen pendukung yang diperlukan."
  ].join("\n");
}

/**
 * Menyinkronkan pengumuman otomatis berisi daftar calon siswa yang diterima PPDB. Logika bisnisnya: ambil semua
 * pendaftar berstatus "diterima"; bila kosong, hapus pengumuman yang ada; bila ada, perbarui pengumuman lama atau
 * buat yang baru dengan kategori "PPDB". Dipanggil setiap kali status PPDB berubah ke/dari "diterima".
 *
 * @returns {Promise<Object|null>} Record Pengumuman yang dibuat/diperbarui, atau null bila tidak ada pendaftar diterima
 *   atau model Pengumuman tidak tersedia.
 */
async function syncAcceptedPPDBAnnouncement() {
  if (!Pengumuman) return null;

  const acceptedApplicants = await PPDB.findAll({
    where: { status: "diterima" },
    order: [["updatedAt", "ASC"], ["createdAt", "ASC"], ["id", "ASC"]]
  });

  const existing = await Pengumuman.findOne({
    where: {
      title: ACCEPTED_PPDB_ANNOUNCEMENT_TITLE,
      category: "PPDB"
    }
  });

  if (acceptedApplicants.length === 0) {
    if (existing) await existing.destroy();
    return null;
  }

  const data = {
    title: ACCEPTED_PPDB_ANNOUNCEMENT_TITLE,
    date: todayDateOnly(),
    content: buildAcceptedPPDBAnnouncementContent(acceptedApplicants),
    category: "PPDB",
    image: null
  };

  if (existing) {
    await existing.update(data);
    return existing;
  }

  return Pengumuman.create(data);
}

/**
 * Endpoint publik untuk mengecek status pendaftaran PPDB seorang calon siswa. Mencocokkan email dan nama lengkap
 * (case-insensitive) dengan data pendaftar, lalu mengembalikan status beserta catatan/penjelasan yang sesuai
 * (pending/diterima/ditolak). Untuk status ditolak, memakai catatan khusus bila tersedia.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.body.email dan req.body.nama_lengkap.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi status pendaftaran; 400 bila email/nama kosong;
 *   404 bila data tidak ditemukan; 500 bila terjadi kesalahan.
 */
exports.checkStatus = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const nama = String(req.body.nama_lengkap || "").trim().toLowerCase();

    if (!email || !nama) {
      return res.status(400).json({ success: false, message: "Email dan nama lengkap calon siswa wajib diisi" });
    }

    const applicants = await PPDB.findAll({ order: [["createdAt", "DESC"]] });
    const match = applicants.find((item) =>
      String(item.email || "").trim().toLowerCase() === email &&
      String(item.nama_lengkap || "").trim().toLowerCase() === nama
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Data pendaftaran tidak ditemukan. Pastikan email dan nama lengkap sesuai dengan yang diisi pada formulir."
      });
    }

    const berkasRevisi = parseBerkasRevisi(match.berkas_revisi);
    const docRevisi = berkasRevisi.filter((key) => ALLOWED_DOCUMENT_KEYS.includes(key));
    const dataRevisi = berkasRevisi.filter((key) => ALLOWED_DATA_KEYS.includes(key));
    // Nilai data saat ini untuk field yang diminta diperbaiki, agar form dapat
    // menampilkan nilai lama yang perlu dikoreksi pendaftar.
    const dataValues = {};
    dataRevisi.forEach((key) => { dataValues[key] = match[key] ?? ""; });

    const statusMessage = {
      pending: "Pendaftaran Anda sedang diproses dan menunggu verifikasi admin.",
      diterima: "Selamat! Calon siswa dinyatakan DITERIMA. Silakan datang ke sekolah untuk pendaftaran ulang sesuai arahan panitia PPDB.",
      ditolak: match.notification_note && /alasan/i.test(match.notification_note)
        ? match.notification_note
        : "Mohon maaf, berkas pendaftaran belum dapat kami terima. Silakan hubungi panitia PPDB untuk informasi lebih lanjut.",
      revisi_berkas: match.catatan_revisi
        ? `Berkas pendaftaran perlu diperbaiki. Catatan admin: ${match.catatan_revisi}`
        : "Berkas pendaftaran perlu diperbaiki. Silakan unggah ulang berkas yang diminta."
    };

    return res.json({
      success: true,
      message: "Status pendaftaran ditemukan",
      data: {
        nama_lengkap: match.nama_lengkap,
        email: match.email,
        target_jenjang: match.target_jenjang,
        jenis_pendaftaran: match.jenis_pendaftaran,
        status: match.status,
        catatan: statusMessage[match.status] || "Status pendaftaran belum tersedia.",
        // Hanya relevan saat status "revisi_berkas".
        berkas_revisi: match.status === "revisi_berkas" ? docRevisi : [],
        data_revisi: match.status === "revisi_berkas" ? dataRevisi : [],
        data_values: match.status === "revisi_berkas" ? dataValues : {}
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil status pendaftaran", error: error.message });
  }
};

/**
 * Endpoint publik untuk pendaftar mengunggah ULANG berkas saat status "revisi_berkas".
 * Pencocokan identitas memakai email + nama lengkap (case-insensitive), sama seperti
 * checkStatus. Hanya pendaftar berstatus "revisi_berkas" yang boleh resubmit, dan hanya
 * field berkas yang diizinkan (ALLOWED_DOCUMENT_KEYS) yang akan ditimpa. Setelah berhasil,
 * status dikembalikan ke "pending" untuk diverifikasi ulang admin, dan catatan revisi dibersihkan.
 *
 * @param {import('express').Request} req - req.body: { email, nama_lengkap, berkas: { <key>: dataUrl } }.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} 200 bila berhasil; 400 validasi gagal; 404 data tidak ditemukan; 500 error.
 */
exports.resubmitBerkas = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const nama = String(req.body.nama_lengkap || "").trim().toLowerCase();

    if (!email || !nama) {
      return res.status(400).json({ success: false, message: "Email dan nama lengkap calon siswa wajib diisi" });
    }

    const applicants = await PPDB.findAll({ order: [["createdAt", "DESC"]] });
    const match = applicants.find((item) =>
      String(item.email || "").trim().toLowerCase() === email &&
      String(item.nama_lengkap || "").trim().toLowerCase() === nama
    );

    if (!match) {
      return res.status(404).json({
        success: false,
        message: "Data pendaftaran tidak ditemukan. Pastikan email dan nama lengkap sesuai dengan yang diisi pada formulir."
      });
    }

    if (match.status !== "revisi_berkas") {
      return res.status(400).json({
        success: false,
        message: "Pendaftaran ini tidak sedang dalam status perbaikan berkas, sehingga berkas tidak dapat diunggah ulang."
      });
    }

    // Key yang diminta admin (berkas + data). Bila kosong, izinkan semua key.
    const requested = parseBerkasRevisi(match.berkas_revisi);
    const allowedNow = requested.length > 0 ? requested : ALLOWED_REVISION_KEYS;
    const berkas = req.body.berkas || {};
    const data = req.body.data || {};

    const updates = {};

    // 1) Berkas (dokumen) — hanya key dokumen yang diizinkan.
    for (const [key, value] of Object.entries(berkas)) {
      if (!allowedNow.includes(key) || !ALLOWED_DOCUMENT_KEYS.includes(key)) continue;
      if (value === undefined || value === null || value === "") continue;
      const check = validateDocumentValue(value);
      if (!check.valid) {
        return res.status(400).json({ success: false, message: `${key}: ${check.message}` });
      }
      updates[key] = value;
    }

    // 2) Data biodata — hanya key data yang diizinkan, dengan validasi sederhana.
    const numericKeys = ["nisn", "nik", "no_kk"];
    for (const [key, rawValue] of Object.entries(data)) {
      if (!allowedNow.includes(key) || !ALLOWED_DATA_KEYS.includes(key)) continue;
      const value = String(rawValue ?? "").trim();
      if (value === "") continue;
      if (numericKeys.includes(key) && !/^\d+$/.test(value)) {
        return res.status(400).json({ success: false, message: `${key} harus berupa angka yang valid.` });
      }
      if (key === "jenis_kelamin" && !["L", "P"].includes(value)) {
        return res.status(400).json({ success: false, message: "Jenis kelamin tidak valid." });
      }
      updates[key] = value;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada perbaikan yang dikirim untuk diperbarui." });
    }

    updates.status = "pending";
    updates.catatan_revisi = null;
    updates.berkas_revisi = null;
    updates.notification_note = `Data/berkas diperbaiki oleh pendaftar pada ${new Date().toISOString()}. Menunggu verifikasi ulang admin.`;

    await match.update(updates);

    await logAudit(req, {
      action: "ppdb.resubmit_berkas",
      entityType: "ppdb",
      entityId: match.id,
      metadata: { updated_keys: Object.keys(updates).filter((k) => ALLOWED_REVISION_KEYS.includes(k)) }
    });

    // Status kembali pending; segarkan pengumuman bila perlu.
    await syncAcceptedPPDBAnnouncement();

    return res.json({
      success: true,
      message: "Berkas berhasil diperbarui. Pendaftaran Anda kembali menunggu verifikasi admin.",
      data: { nama_lengkap: match.nama_lengkap, status: match.status }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengunggah ulang berkas", error: error.message });
  }
};

/**
 * Mengambil seluruh data pendaftaran PPDB (untuk panel admin), diurutkan dari yang terbaru.
 *
 * @param {import('express').Request} req - Request Express (tidak ada parameter khusus yang dipakai).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi daftar pendaftar PPDB; 500 bila terjadi kesalahan.
 */
exports.getAllPPDB = async (req, res) => {
  try {
    const ppdb = await PPDB.findAll({
      order: [["createdAt", "DESC"]]
    });

    res.json({
      success: true,
      message: "Data PPDB berhasil diambil",
      data: ppdb
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data PPDB",
      error: error.message
    });
  }
};

/**
 * Endpoint publik untuk mengirim pendaftaran PPDB baru. Memvalidasi kelengkapan data utama dan berkas wajib
 * (termasuk aturan khusus: raport wajib untuk SD/SMP, surat pindah wajib untuk siswa pindahan), menyimpan data,
 * lalu mencoba mengirim notifikasi ke orang tua. Hasil notifikasi dicatat pada field notification_note.
 *
 * @param {import('express').Request} req - Request Express. Memakai banyak field req.body: jenis_pendaftaran,
 *   target_jenjang, nama_lengkap, tanggal_lahir, jenis_kelamin, alamat, nama_orang_tua, no_telepon, email,
 *   tahun_ajaran, berkas_kk, berkas_raport, foto_siswa, berkas_surat_pindah.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: membuat record PPDB, memicu pengiriman notifikasi, dan memperbarui
 *   notification_note. Mengirim HTTP 201 dengan data & status notifikasi; 400 bila validasi gagal; 500 bila error.
 */
exports.createPPDB = async (req, res) => {
  try {
    const {
      jenis_pendaftaran,
      target_jenjang,
      nama_lengkap,
      tanggal_lahir,
      jenis_kelamin,
      alamat,
      nama_orang_tua,
      no_telepon,
      email,
      tahun_ajaran,
      berkas_kk,
      berkas_raport,
      foto_siswa,
      berkas_surat_pindah
    } = req.body;

    if (!jenis_pendaftaran || !target_jenjang || !nama_lengkap || !tanggal_lahir || !jenis_kelamin || !alamat || !nama_orang_tua || !no_telepon || !email || !tahun_ajaran || !berkas_kk || !foto_siswa) {
      return res.status(400).json({
        success: false,
        message: "Data utama, email/WA orang tua, fotokopi KK, dan foto calon siswa wajib diisi"
      });
    }

    if (!["pendaftaran_baru", "siswa_pindahan"].includes(jenis_pendaftaran)) {
      return res.status(400).json({ success: false, message: "Jenis pendaftaran tidak valid" });
    }

    if (!["tk", "sd", "smp"].includes(target_jenjang)) {
      return res.status(400).json({ success: false, message: "Jenjang tujuan tidak valid" });
    }

    // Validasi usia minimal calon siswa sesuai jenjang (TK >=5, SD >=6, SMP >=12).
    const ageCheck = validateAgeForJenjang(target_jenjang, tanggal_lahir, tahun_ajaran);
    if (!ageCheck.valid) {
      return res.status(400).json({ success: false, message: ageCheck.message });
    }

    // Validasi tambahan sesuai form mitra.
    if (!String(req.body.tempat_lahir || "").trim()) {
      return res.status(400).json({ success: false, message: "Tempat lahir calon siswa wajib diisi" });
    }
    const digitsOnly = (value) => /^\d+$/.test(String(value));
    if (req.body.nik && !digitsOnly(req.body.nik)) {
      return res.status(400).json({ success: false, message: "NIK harus berupa angka yang valid" });
    }
    if (req.body.no_kk && !digitsOnly(req.body.no_kk)) {
      return res.status(400).json({ success: false, message: "Nomor KK harus berupa angka yang valid" });
    }
    if (req.body.nisn && !digitsOnly(req.body.nisn)) {
      return res.status(400).json({ success: false, message: "NISN harus berupa angka yang valid" });
    }

    if (["sd", "smp"].includes(target_jenjang) && !berkas_raport) {
      return res.status(400).json({ success: false, message: "Berkas raport terakhir wajib untuk jenjang SD dan SMP" });
    }

    if (jenis_pendaftaran === "siswa_pindahan" && !berkas_surat_pindah) {
      return res.status(400).json({ success: false, message: "Berkas surat pindahan wajib untuk siswa pindahan" });
    }

    const ppdb = await PPDB.create(req.body);
    const notification = await notifyNewPPDB(ppdb).catch((error) => ({
      sent: false,
      channels: [],
      errors: [error.message]
    }));

    await ppdb.update({
      notification_note: notification.sent
        ? `Notifikasi terkirim via ${notification.channels.join(", ")}`
        : `Notifikasi belum terkirim otomatis${notification.errors?.length ? `: ${notification.errors.join(" | ")}` : " - konfigurasi belum diisi"}`
    });

    res.status(201).json({
      success: true,
      message: "Pendaftaran berhasil dikirim. Pemberitahuan hasil PPDB akan diumumkan di halaman Pengumuman sekolah setelah diverifikasi admin.",
      data: ppdb,
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data PPDB",
      error: error.message
    });
  }
};

/**
 * Memperbarui data PPDB berdasarkan id (umumnya untuk mengubah status verifikasi oleh admin). Memvalidasi status
 * yang diizinkan (pending/diterima/ditolak). Bila status berubah, pengumuman daftar siswa diterima ikut disinkronkan.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id pendaftar) dan req.body
 *   (field yang diperbarui, termasuk status dan catatan).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui record PPDB dan, bila status berubah, menyinkronkan
 *   pengumuman PPDB. Mengirim HTTP 200 dengan data terbaru; 404 bila tidak ditemukan; 400 bila status tidak valid;
 *   500 bila terjadi kesalahan.
 */
exports.updatePPDB = async (req, res) => {
  try {
    const { id } = req.params;

    const ppdb = await PPDB.findByPk(id);

    if (!ppdb) {
      return res.status(404).json({
        success: false,
        message: "Data PPDB tidak ditemukan"
      });
    }

    if (req.body.status && !["pending", "diterima", "ditolak", "revisi_berkas"].includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Status PPDB tidak valid"
      });
    }

    // Saat status "revisi_berkas", normalkan daftar key yang diminta diperbaiki
    // menjadi JSON string dan batasi hanya key (berkas + data) yang diizinkan.
    if (req.body.status === "revisi_berkas" && req.body.berkas_revisi !== undefined) {
      const list = Array.isArray(req.body.berkas_revisi)
        ? req.body.berkas_revisi.filter((key) => ALLOWED_REVISION_KEYS.includes(key))
        : [];
      req.body.berkas_revisi = JSON.stringify(list);
    }

    const previousStatus = ppdb.status;

    await ppdb.update(req.body);

    let enrollNote = null;
    // Saat status berubah menjadi "diterima", calon siswa otomatis didaftarkan ke Data Siswa.
    if (previousStatus !== "diterima" && ppdb.status === "diterima") {
      try {
        await enrollAcceptedApplicant(ppdb, req);
      } catch (enrollError) {
        enrollNote = `Status diterima tersimpan, namun pendaftaran otomatis ke Data Siswa gagal: ${enrollError.message}`;
      }
    }

    if (previousStatus !== ppdb.status && ["diterima", "pending", "ditolak", "revisi_berkas"].includes(ppdb.status)) {
      await syncAcceptedPPDBAnnouncement();
    }

    res.json({
      success: true,
      message: enrollNote || "Data PPDB berhasil diperbarui",
      data: ppdb
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data PPDB",
      error: error.message
    });
  }
};

/**
 * Menghapus data pendaftaran PPDB berdasarkan id. Bila pendaftar yang dihapus berstatus "diterima", pengumuman
 * daftar siswa diterima ikut disinkronkan agar namanya hilang dari pengumuman.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id pendaftar yang dihapus).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: menghapus record PPDB dan, bila perlu, menyinkronkan pengumuman PPDB.
 *   Mengirim HTTP 200 bila berhasil; 404 bila tidak ditemukan; 500 bila terjadi kesalahan.
 */
exports.deletePPDB = async (req, res) => {
  try {
    const { id } = req.params;

    const ppdb = await PPDB.findByPk(id);

    if (!ppdb) {
      return res.status(404).json({
        success: false,
        message: "Data PPDB tidak ditemukan"
      });
    }

    const deletedStatus = ppdb.status;

    await ppdb.destroy();

    if (deletedStatus === "diterima") {
      await syncAcceptedPPDBAnnouncement();
    }

    res.json({
      success: true,
      message: "Data PPDB berhasil dihapus"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data PPDB",
      error: error.message
    });
  }
};

/**
 * Rekapitulasi PPDB untuk dashboard admin: total pendaftar, jumlah per status
 * (pending/diterima/ditolak), jumlah yang sudah daftar ulang, dan total per jenjang.
 *
 * @param {import('express').Request} req - Request Express.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi objek rekap; 500 bila gagal.
 */
exports.getRekap = async (req, res) => {
  try {
    const all = await PPDB.findAll();
    const countBy = (predicate) => all.filter(predicate).length;
    const countJenjang = (jenjang) => all.filter((item) => item.target_jenjang === jenjang).length;

    res.json({
      success: true,
      message: "Rekapitulasi PPDB berhasil diambil",
      data: {
        total: all.length,
        pending: countBy((item) => item.status === "pending"),
        diterima: countBy((item) => item.status === "diterima"),
        ditolak: countBy((item) => item.status === "ditolak"),
        revisi_berkas: countBy((item) => item.status === "revisi_berkas"),
        daftar_ulang: countBy((item) => item.status_daftar_ulang === "sudah"),
        per_jenjang: {
          tk: countJenjang("tk"),
          sd: countJenjang("sd"),
          smp: countJenjang("smp")
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil rekapitulasi PPDB", error: error.message });
  }
};

/**
 * Memperbarui status daftar ulang seorang pendaftar PPDB (belum/sudah) beserta
 * tanggal daftar ulangnya. Dipakai admin untuk memverifikasi daftar ulang.
 *
 * @param {import('express').Request} req - req.params.id (id PPDB); req.body.status_daftar_ulang ("sudah"/"belum").
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 dengan data terbaru; 404 bila tidak ada; 500 bila gagal.
 *   Efek samping: update record PPDB dan menulis audit log.
 */
exports.setDaftarUlang = async (req, res) => {
  try {
    const ppdb = await PPDB.findByPk(req.params.id);
    if (!ppdb) {
      return res.status(404).json({ success: false, message: "Data PPDB tidak ditemukan" });
    }

    const status = req.body.status_daftar_ulang === "sudah" ? "sudah" : "belum";
    await ppdb.update({
      status_daftar_ulang: status,
      tanggal_daftar_ulang: status === "sudah" ? new Date() : null
    });

    await logAudit(req, {
      action: "ppdb.daftar_ulang",
      entityType: "ppdb",
      entityId: ppdb.id,
      metadata: { status_daftar_ulang: status }
    });

    res.json({ success: true, message: "Status daftar ulang berhasil diperbarui", data: ppdb });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memperbarui status daftar ulang", error: error.message });
  }
};
