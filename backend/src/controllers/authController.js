const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const db = require("../models");
const { logAudit } = require("../services/auditLogService");
const { getClientIp } = require("../middlewares/rateLimitMiddleware");

const User = db.User;
const GuruProfile = db.GuruProfile;
const Siswa = db.Siswa;
const Kelas = db.Kelas;
const KepalaSekolah = db.KepalaSekolah;
const PortalAccountLink = db.PortalAccountLink;
const PasswordResetRequest = db.PasswordResetRequest;
const RESET_REQUEST_ROLES = ["guru", "siswa", "orangtua", "kepala_sekolah"];
const RESET_REQUEST_MESSAGE = "Permintaan reset kata sandi berhasil dikirim. Silakan hubungi admin untuk meminta persetujuan dan kata sandi sementara.";
const PORTAL_EMAIL_DOMAIN = "cnb.sch.id";

/**
 * Membuat JSON Web Token (JWT) untuk sesi login pengguna, memuat id, email, dan peran,
 * ditandatangani dengan JWT_SECRET dan masa berlaku dari konfigurasi (default 1 hari).
 *
 * @param {object} user - Objek user yang minimal memiliki id, email, dan role.
 * @returns {string} String token JWT. Tanpa efek samping (tidak menyentuh database).
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

/**
 * Menormalkan input mata pelajaran menjadi array string yang bersih. Menerima array
 * maupun string dipisah koma, lalu memangkas spasi dan membuang entri kosong.
 *
 * @param {string|Array<*>} value - Daftar mapel berupa array atau string dipisah koma.
 * @returns {Array<string>} Array nama mapel yang sudah dirapikan. Tanpa efek samping.
 */
function normalizeSubjects(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Mengonversi berbagai representasi nilai (boolean, string, angka) menjadi boolean.
 * Dianggap true untuk true, "true", "1", atau 1.
 *
 * @param {*} value - Nilai yang akan diinterpretasikan sebagai boolean.
 * @returns {boolean} Hasil interpretasi boolean. Tanpa efek samping.
 */
function toBoolean(value) {
  return value === true || value === "true" || value === "1" || value === 1;
}

/**
 * Memeriksa apakah sebuah objek memiliki properti tertentu sebagai milik sendiri
 * (own property), aman terhadap objek null/undefined.
 *
 * @param {object} object - Objek yang diperiksa.
 * @param {string} key - Nama properti yang dicari.
 * @returns {boolean} true bila properti dimiliki langsung oleh objek. Tanpa efek samping.
 */
function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

/**
 * Memeriksa apakah objek memiliki minimal satu dari sekumpulan properti tertentu.
 * Berguna untuk mendeteksi apakah klien mengirim flag eksplisit (mis. wali_kelas).
 *
 * @param {object} object - Objek yang diperiksa.
 * @param {Array<string>} keys - Daftar nama properti yang dicari.
 * @returns {boolean} true bila salah satu properti ada. Tanpa efek samping.
 */
function hasAnyOwn(object, keys) {
  return keys.some((key) => hasOwn(object, key));
}

/**
 * Menentukan apakah sebuah label mapel sebenarnya menandakan peran wali kelas/guru
 * (mis. "wali kelas", "guru"), bukan nama mata pelajaran sungguhan.
 *
 * @param {*} value - Label yang akan diperiksa.
 * @returns {boolean} true bila label termasuk penanda wali kelas/guru. Tanpa efek samping.
 */
function isHomeroomSubjectLabel(value) {
  const text = String(value || "").trim().toLowerCase();
  return ["wali kelas", "guru wali kelas", "guru"].includes(text);
}

/**
 * Menormalkan input mata pelajaran secara lebih agresif: memecah lagi tiap entri pada
 * pemisah ";" atau "+", merapikan, lalu membuang label yang sebenarnya menandai wali
 * kelas (lihat isHomeroomSubjectLabel). Menghasilkan daftar mapel murni.
 *
 * @param {string|Array<*>} value - Daftar mapel mentah (array atau string).
 * @returns {Array<string>} Array nama mapel bersih tanpa label wali kelas. Tanpa efek samping.
 */
function normalizeSubjectInput(value) {
  return normalizeSubjects(value)
    .flatMap((item) => String(item).split(/[;+]/).map((part) => part.trim()).filter(Boolean))
    .filter((item) => !isHomeroomSubjectLabel(item));
}

/**
 * Menormalkan alamat email: memangkas spasi dan mengubah ke huruf kecil agar
 * perbandingan/penyimpanan email konsisten.
 *
 * @param {*} value - Nilai email mentah.
 * @returns {string} Email yang sudah dinormalisasi. Tanpa efek samping.
 */
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Membersihkan dan membatasi panjang teks bebas (memangkas spasi berlebih lalu memotong).
 *
 * @param {*} value - Teks mentah.
 * @param {number} [maxLength=120] - Panjang maksimum karakter hasil.
 * @returns {string} Teks yang sudah dirapikan dan dipotong. Tanpa efek samping.
 */
function normalizeText(value, maxLength = 120) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.slice(0, maxLength);
}

/**
 * Menormalkan nomor telepon menjadi format lokal Indonesia: menyisakan digit saja dan
 * mengubah awalan "62" menjadi "0" agar pencocokan nomor antar data konsisten.
 *
 * @param {*} value - Nomor telepon mentah.
 * @returns {string} Nomor telepon hanya-digit dengan awalan 0. Tanpa efek samping.
 */
function normalizePhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * Membentuk alamat email portal default berbasis NISN untuk akun siswa atau orang tua,
 * menggunakan domain sekolah (PORTAL_EMAIL_DOMAIN). Karakter non-alfanumerik dibersihkan.
 *
 * @param {*} nisn - NISN siswa sebagai dasar alamat email.
 * @param {string} type - Jenis akun: "siswa" atau lainnya (orang tua mendapat sufiks ".ortu").
 * @returns {string} Alamat email portal yang dibentuk. Tanpa efek samping.
 */
function buildPortalEmail(nisn, type) {
  const cleanNisn = String(nisn || "").toLowerCase().replace(/[^a-z0-9]+/g, "") || "akun";
  return type === "siswa" ? `${cleanNisn}@${PORTAL_EMAIL_DOMAIN}` : `${cleanNisn}.ortu@${PORTAL_EMAIL_DOMAIN}`;
}

/**
 * Memvalidasi dan menormalkan peran untuk permintaan reset kata sandi. Mengembalikan
 * peran dalam huruf kecil bila termasuk RESET_REQUEST_ROLES, selain itu string kosong.
 *
 * @param {*} value - Nilai peran mentah dari klien.
 * @returns {string} Peran tervalidasi atau "" bila tidak valid. Tanpa efek samping.
 */
function normalizeResetRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return RESET_REQUEST_ROLES.includes(role) ? role : "";
}

/**
 * Memvalidasi dan menormalkan jenjang pendidikan, hanya menerima "sd" atau "smp".
 *
 * @param {*} value - Nilai jenjang mentah.
 * @returns {string|null} "sd"/"smp" bila valid, atau null. Tanpa efek samping.
 */
function normalizeJenjang(value) {
  const jenjang = String(value || "").trim().toLowerCase();
  return ["sd", "smp"].includes(jenjang) ? jenjang : null;
}

/**
 * Mencari profil kepala sekolah yang berstatus "aktif" untuk seorang user, dicocokkan
 * lewat user_id atau email, dan diambil periode terbaru. Dipakai saat login untuk
 * memastikan akun kepala sekolah sudah diverifikasi dan punya jenjang.
 *
 * @param {object|null} user - User yang sedang login; hanya diproses bila perannya "kepala_sekolah".
 * @param {object} [transaction] - Transaksi Sequelize opsional.
 * @returns {Promise<object|null>} Instance KepalaSekolah aktif atau null. Efek samping:
 *   query baca ke tabel KepalaSekolah.
 */
async function findActiveKepalaSekolahProfile(user, transaction) {
  if (!user || user.role !== "kepala_sekolah") return null;

  const where = {
    status: "aktif",
    [Op.or]: [
      { user_id: user.id },
      { email: user.email }
    ]
  };

  return KepalaSekolah.findOne({ where, order: [["periode_mulai", "DESC"]], transaction });
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
 * Mengambil nama kelas dari seorang siswa berdasarkan kelas_id-nya.
 *
 * @param {object} siswa - Objek siswa; memakai siswa.kelas_id.
 * @returns {Promise<string|null>} Nama kelas atau null bila siswa tak punya kelas/kelas
 *   tidak ditemukan. Efek samping: query baca ke tabel Kelas.
 */
async function getStudentClassName(siswa) {
  if (!siswa?.kelas_id) return null;
  const kelas = await Kelas.findByPk(siswa.kelas_id);
  return kelas?.nama_kelas || null;
}

/**
 * Mencari akun user portal (sesuai peran) yang tertaut ke seorang siswa melalui
 * PortalAccountLink. Dipakai untuk mencocokkan otomatis saat permintaan reset sandi.
 *
 * @param {number} siswaId - ID siswa yang tautannya dicari.
 * @param {string} role - Tipe tautan/peran (mis. "siswa", "orangtua").
 * @returns {Promise<object|null>} Instance User yang tertaut, atau null. Efek samping:
 *   query baca ke PortalAccountLink dan User.
 */
async function findLinkedPortalUser(siswaId, role) {
  if (!PortalAccountLink || !siswaId) return null;

  const link = await PortalAccountLink.findOne({
    where: { siswa_id: siswaId, link_type: role },
    order: [["id", "ASC"]]
  });
  if (!link) return null;

  return User.findOne({ where: { id: link.user_id, role } });
}

/**
 * Menyusun identitas reset kata sandi untuk akun SISWA berdasarkan NISN. Mencari data
 * siswa, akun portal yang cocok, dan nama kelas, lalu merangkai catatan apakah akun
 * cocok otomatis atau tidak.
 *
 * @param {string} nisn - NISN yang dimasukkan pemohon.
 * @returns {Promise<object>} Objek identitas berisi role, email, name, nisn, class_name,
 *   notes, matched_user_id, dan flag matched. Efek samping: query baca ke Siswa, Kelas,
 *   PortalAccountLink, dan User.
 */
async function findStudentResetIdentity(nisn) {
  const siswa = await Siswa.findOne({ where: { nisn } });
  const matchedUser = siswa ? await findLinkedPortalUser(siswa.id, "siswa") : null;
  const className = siswa ? await getStudentClassName(siswa) : null;

  return {
    role: "siswa",
    email: matchedUser?.email || siswa?.email || buildPortalEmail(nisn, "siswa"),
    name: siswa?.nama || `Siswa ${nisn}`,
    nisn,
    class_name: className,
    notes: siswa
      ? (matchedUser ? "Akun siswa cocok otomatis dari NISN." : "Data siswa ditemukan, tetapi akun portal siswa belum cocok otomatis.")
      : "NISN belum cocok dengan data siswa.",
    matched_user_id: matchedUser?.id || null,
    matched: Boolean(matchedUser)
  };
}

/**
 * Menyusun identitas reset kata sandi untuk akun ORANG TUA berdasarkan email dan nomor HP.
 * Mencari akun orang tua, memverifikasi keterhubungan ke siswa, dan mencocokkan nomor HP
 * siswa. Menghasilkan catatan sesuai tingkat kecocokan (tidak ditemukan, sebagian, penuh).
 *
 * @param {string} email - Email orang tua yang dimasukkan pemohon.
 * @param {string} phone - Nomor HP orang tua untuk dicocokkan dengan data siswa terhubung.
 * @returns {Promise<object>} Objek identitas (role "orangtua") berisi email, name, nisn,
 *   class_name, notes, matched_user_id, dan flag matched. Efek samping: query baca ke
 *   User, PortalAccountLink, Siswa, dan Kelas.
 */
async function findParentResetIdentity(email, phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const matchedUserCandidate = await User.findOne({ where: { email, role: "orangtua" } });
  const fallback = {
    role: "orangtua",
    email,
    name: "Orang Tua",
    nisn: null,
    class_name: null,
    notes: "Akun orang tua belum cocok otomatis dari email dan nomor HP.",
    matched_user_id: null,
    matched: false
  };

  if (!matchedUserCandidate || !PortalAccountLink) return fallback;

  const links = await PortalAccountLink.findAll({
    where: { user_id: matchedUserCandidate.id, link_type: "orangtua" },
    order: [["id", "ASC"]]
  });
  const studentIds = links.map((link) => Number(link.siswa_id)).filter(Boolean);
  if (!studentIds.length) {
    return {
      ...fallback,
      name: matchedUserCandidate.name,
      notes: "Email orang tua ditemukan, tetapi belum ada siswa yang terhubung."
    };
  }

  const students = await Siswa.findAll({ where: { id: { [Op.in]: studentIds } }, order: [["nama", "ASC"]] });
  const matchedStudent = students.find((student) => normalizePhoneNumber(student.no_telepon) === normalizedPhone);
  if (!matchedStudent) {
    return {
      ...fallback,
      name: matchedUserCandidate.name,
      notes: "Email orang tua ditemukan, tetapi nomor HP tidak cocok dengan siswa yang terhubung."
    };
  }

  const relatedStudents = students.filter((student) => normalizePhoneNumber(student.no_telepon) === normalizedPhone);
  const className = await getStudentClassName(matchedStudent);

  return {
    role: "orangtua",
    email: matchedUserCandidate.email,
    name: matchedUserCandidate.name,
    nisn: matchedStudent.nisn || null,
    class_name: className,
    notes: relatedStudents.length > 1
      ? `Akun orang tua cocok otomatis dan terhubung ke ${relatedStudents.length} siswa dengan nomor HP yang sama.`
      : "Akun orang tua cocok otomatis dari email dan nomor HP.",
    matched_user_id: matchedUserCandidate.id,
    matched: true
  };
}

/**
 * Menyusun identitas reset kata sandi untuk akun GURU berdasarkan email.
 *
 * @param {string} email - Email guru yang dimasukkan pemohon.
 * @returns {Promise<object>} Objek identitas (role "guru") berisi email, name, notes,
 *   matched_user_id, dan flag matched. Efek samping: query baca ke tabel User.
 */
async function findGuruResetIdentity(email) {
  const matchedUser = await User.findOne({ where: { email, role: "guru" } });
  return {
    role: "guru",
    email,
    name: matchedUser?.name || "Guru",
    nisn: null,
    class_name: null,
    notes: matchedUser ? "Akun guru cocok otomatis dari email." : "Email guru belum cocok dengan akun guru.",
    matched_user_id: matchedUser?.id || null,
    matched: Boolean(matchedUser)
  };
}

/**
 * Menyusun identitas reset kata sandi untuk akun KEPALA SEKOLAH berdasarkan email.
 *
 * @param {string} email - Email kepala sekolah yang dimasukkan pemohon.
 * @returns {Promise<object>} Objek identitas (role "kepala_sekolah") berisi email, name,
 *   notes, matched_user_id, dan flag matched. Efek samping: query baca ke tabel User.
 */
async function findKepalaSekolahResetIdentity(email) {
  const matchedUser = await User.findOne({ where: { email, role: "kepala_sekolah" } });
  return {
    role: "kepala_sekolah",
    email,
    name: matchedUser?.name || "Kepala Sekolah",
    nisn: null,
    class_name: null,
    notes: matchedUser ? "Akun kepala sekolah cocok otomatis dari email." : "Email kepala sekolah belum cocok dengan akun kepala sekolah.",
    matched_user_id: matchedUser?.id || null,
    matched: Boolean(matchedUser)
  };
}

/**
 * Controller Express: registrasi mandiri akun GURU. Memvalidasi peran (wali kelas dan/atau
 * guru mapel), daftar mata pelajaran, kelas wali, dan kecocokan jenjang. Membuat akun User
 * (kata sandi di-hash) beserta GuruProfile berstatus "pending" yang menunggu verifikasi admin.
 * Seluruh proses dalam satu transaksi dan dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.body memuat (alias ganda): name/nama, email,
 *   password/kata_sandi, profession, teacher_type/tipe_guru, subject/subjects/mata_pelajaran,
 *   kelas_id/kelas_wali_id/homeroom_classroom_id, jenjang, serta flag wali_kelas/is_homeroom dan
 *   guru_mata_pelajaran/is_subject_teacher.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 201 berisi data user & profil guru bila sukses; 400 untuk
 *   validasi gagal; 409 bila email terdaftar; 500 untuk error server. Efek samping: membuat
 *   User & GuruProfile dalam transaksi dan menulis audit log.
 */
exports.registerGuru = async (req, res) => {
  // Registrasi guru mandiri DIAKTIFKAN kembali. Akun guru baru dibuat dengan
  // status "pending" dan menunggu verifikasi admin sebelum dapat login.
  return exports.registerGuruLegacy(req, res);
};

/**
 * (Dinonaktifkan) Implementasi lama registrasi guru mandiri. Tidak lagi dipakai
 * karena akun guru sekarang dibuat oleh admin. Dipertahankan untuk referensi.
 */
exports.registerGuruLegacy = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const {
      name,
      nama,
      email,
      password,
      kata_sandi,
      profession,
      teacher_type,
      tipe_guru,
      subject,
      subjects,
      mata_pelajaran,
      kelas_id,
      kelas_wali_id,
      homeroom_classroom_id,
      jenjang
    } = req.body;

    const namaGuru = nama || name;
    const kataSandi = kata_sandi || password;
    const tipeGuru = tipe_guru || teacher_type;
    const explicitHomeroom = hasAnyOwn(req.body, ["wali_kelas", "is_homeroom"]);
    const explicitSubjectTeacher = hasAnyOwn(req.body, ["guru_mata_pelajaran", "is_subject_teacher"]);
    const isHomeroom = explicitHomeroom
      ? (toBoolean(req.body.wali_kelas) || toBoolean(req.body.is_homeroom))
      : tipeGuru === "wali_kelas";
    const subjectList = normalizeSubjectInput(mata_pelajaran ?? subjects ?? subject);
    const normalizedJenjang = ["sd", "smp"].includes(String(jenjang || "").trim().toLowerCase())
      ? String(jenjang).trim().toLowerCase()
      : null;
    const isSubjectTeacher = explicitSubjectTeacher
      ? (toBoolean(req.body.guru_mata_pelajaran) || toBoolean(req.body.is_subject_teacher))
      : (tipeGuru === "mapel" || subjectList.length > 0);
    const homeroomClassroomId = Number(kelas_wali_id || homeroom_classroom_id || kelas_id || 0);

    if (!namaGuru || !email || !kataSandi) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan kata sandi wajib diisi"
      });
    }

    if (!isHomeroom && !isSubjectTeacher) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Pilih minimal satu peran guru" });
    }

    if (isSubjectTeacher && !subjectList.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Minimal satu mata pelajaran wajib diisi untuk guru mata pelajaran" });
    }

    if (normalizedJenjang === "sd" && (!isHomeroom || !homeroomClassroomId)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Kelas absensi wajib dipilih untuk guru SD" });
    }

    if (isHomeroom && homeroomClassroomId) {
      const kelas = await Kelas.findByPk(homeroomClassroomId, { transaction });
      if (!kelas) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Kelas wali tidak ditemukan" });
      }

      const classJenjang = inferClassJenjang(kelas);
      if (normalizedJenjang && classJenjang && normalizedJenjang !== classJenjang) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Kelas tidak sesuai dengan jenjang mengajar" });
      }
    }

    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "Email sudah terdaftar" });
    }

    const hashedPassword = await bcrypt.hash(kataSandi, 10);
    const teacherProfession = [
      isHomeroom ? "Wali Kelas" : null,
      isSubjectTeacher ? subjectList.join(", ") : null
    ].filter(Boolean).join(" + ");
    const legacyTeacherType = isSubjectTeacher ? "mapel" : "wali_kelas";

    const user = await User.create({
      name: namaGuru,
      email,
      password: hashedPassword,
      role: "guru",
      profession: teacherProfession || profession || "Guru"
    }, { transaction });

    const profile = await GuruProfile.create({
      user_id: user.id,
      teacher_type: legacyTeacherType,
      subject: isSubjectTeacher ? subjectList.join(", ") : null,
      jenjang: normalizedJenjang,
      is_homeroom: isHomeroom,
      kelas_id: isHomeroom && homeroomClassroomId ? homeroomClassroomId : null,
      verification_status: "pending"
    }, { transaction });

    await logAudit(req, {
      action: "teacher.register",
      entityType: "teacher_profile",
      entityId: profile.id,
      metadata: { userId: user.id, isHomeroom, subjects: subjectList }
    }, { transaction });

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Registrasi guru berhasil. Akun menunggu verifikasi administrator.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profession: user.profession,
        guruProfile: profile
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};

/**
 * Controller Express: registrasi mandiri akun KEPALA SEKOLAH. Memvalidasi field wajib,
 * panjang kata sandi, keunikan email dan NIP. Membuat akun User (kata sandi di-hash) dan
 * profil KepalaSekolah berstatus "non-aktif" yang menunggu verifikasi admin. Seluruh proses
 * dalam satu transaksi dan dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.body memuat (alias ganda): name/nama, email,
 *   password/kata_sandi, nip, jenjang, no_telepon/phone, dan periode_mulai (opsional).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 201 berisi data user & profil kepala sekolah bila sukses;
 *   400 untuk validasi gagal; 409 bila email/NIP duplikat; 500 untuk error server. Efek samping:
 *   membuat User & KepalaSekolah dalam transaksi dan menulis audit log.
 */
exports.registerKepalaSekolah = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const name = normalizeText(req.body.name || req.body.nama, 120);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || req.body.kata_sandi;
    const nip = normalizeText(req.body.nip, 80);
    const jenjang = normalizeJenjang(req.body.jenjang);
    const noTelepon = normalizeText(req.body.no_telepon || req.body.phone, 40);

    if (!name || !email || !password || !nip || !jenjang) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Nama, email, kata sandi, NIP, dan jenjang wajib diisi" });
    }

    if (String(password).length < 6) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Kata sandi minimal 6 karakter" });
    }

    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "Email sudah terdaftar" });
    }

    const existingProfile = await KepalaSekolah.findOne({ where: { nip }, transaction });
    if (existingProfile) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: "NIP kepala sekolah sudah terdaftar" });
    }

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: "kepala_sekolah",
      profession: `Kepala Sekolah ${jenjang.toUpperCase()}`
    }, { transaction });

    const profile = await KepalaSekolah.create({
      user_id: user.id,
      nip,
      nama: name,
      email,
      no_telepon: noTelepon || null,
      jenjang,
      periode_mulai: req.body.periode_mulai || new Date().toISOString().slice(0, 10),
      status: "non-aktif"
    }, { transaction });

    await logAudit(req, {
      action: "principal.register",
      entityType: "principal_profile",
      entityId: profile.id,
      metadata: { userId: user.id, jenjang }
    }, { transaction });

    await transaction.commit();
    return res.status(201).json({
      success: true,
      message: "Registrasi kepala sekolah berhasil. Akun menunggu verifikasi admin. Silakan masuk setelah akun diverifikasi.",
      data: { id: user.id, name: user.name, email: user.email, role: user.role, kepalaSekolah: profile }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: "Gagal registrasi kepala sekolah", error: error.message });
  }
};

/**
 * Controller Express: proses login. Memverifikasi email, kecocokan peran, dan kata sandi.
 * Untuk guru memastikan GuruProfile sudah "approved"; untuk kepala sekolah memastikan profil
 * aktif dan memiliki jenjang. Bila lolos, menerbitkan JWT.
 *
 * @param {import('express').Request} req - req.body memuat (alias ganda): email,
 *   password/kata_sandi, dan role/peran.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi token dan data user (termasuk profil guru/
 *   kepala sekolah dan flag must_change_password) bila sukses; 400 bila field kurang; 404 bila
 *   email tak ada; 403 bila peran tidak sesuai atau akun belum diverifikasi; 401 bila kata sandi
 *   salah; 500 untuk error server. Efek samping: query baca; tidak mengubah data.
 */
exports.login = async (req, res) => {
  try {
    const { email, password, kata_sandi, role, peran } = req.body;
    const kataSandi = kata_sandi || password;
    const peranAkun = peran || role;

    if (!email || !kataSandi || !peranAkun) {
      return res.status(400).json({ success: false, message: "Email, kata sandi, dan peran wajib diisi" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Email tidak ditemukan" });
    }

    if (user.role !== peranAkun) {
      return res.status(403).json({ success: false, message: "Peran tidak sesuai" });
    }

    const isValidPassword = await bcrypt.compare(kataSandi, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: "Kata sandi salah" });
    }

    let guruProfile = null;
    let kepalaSekolahProfile = null;
    if (user.role === "guru") {
      guruProfile = await GuruProfile.findOne({ where: { user_id: user.id } });

      if (!guruProfile || guruProfile.verification_status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Akun guru belum diverifikasi administrator"
        });
      }
    }

    if (user.role === "kepala_sekolah") {
      kepalaSekolahProfile = await findActiveKepalaSekolahProfile(user);
      if (!kepalaSekolahProfile || !kepalaSekolahProfile.jenjang) {
        return res.status(403).json({
          success: false,
          message: "Akun kepala sekolah belum diverifikasi administrator atau belum memiliki jenjang"
        });
      }
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Berhasil masuk",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profession: user.profession,
        must_change_password: Boolean(user.must_change_password),
        guruProfile,
        kepalaSekolahProfile
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};

/**
 * Controller Express: menerima permintaan reset kata sandi dari pengguna (siswa, orang tua,
 * guru, atau kepala sekolah). Berdasarkan peran, mencoba mencocokkan identitas secara otomatis,
 * lalu membuat baris PasswordResetRequest baru atau memperbarui permintaan "pending" yang ada.
 * Aksi dicatat ke audit log. Tidak mengubah kata sandi (hanya membuat permintaan untuk admin).
 *
 * @param {import('express').Request} req - req.body memuat (alias ganda): peran/role, email,
 *   nisn, no_telepon/nomor_hp/phone (sesuai peran). req juga dipakai untuk IP dan user-agent.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 202 dengan pesan konfirmasi bila sukses; 400 bila peran/
 *   field wajib kurang; 500 untuk error server. Efek samping: membuat/memperbarui
 *   PasswordResetRequest dan menulis audit log.
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const role = normalizeResetRole(req.body.peran || req.body.role);
    const email = normalizeEmail(req.body.email);
    const nisn = normalizeText(req.body.nisn, 40);
    const phone = normalizeText(req.body.no_telepon || req.body.nomor_hp || req.body.phone, 40);

    if (!role) {
      return res.status(400).json({ success: false, message: "Pilih jenis akun reset password" });
    }

    let identity = null;
    if (role === "siswa") {
      if (!nisn) return res.status(400).json({ success: false, message: "NIS siswa wajib diisi" });
      // Pastikan NIS benar-benar terdaftar di data siswa sebelum membuat permintaan reset.
      const siswaTerdaftar = await Siswa.findOne({ where: { nisn } });
      if (!siswaTerdaftar) {
        return res.status(404).json({ success: false, message: "NIS tidak terdaftar. Silakan periksa kembali NIS Anda." });
      }
      identity = await findStudentResetIdentity(nisn);
    }

    if (role === "orangtua") {
      if (!email || !phone) {
        return res.status(400).json({ success: false, message: "Email dan nomor HP orang tua wajib diisi" });
      }
      identity = await findParentResetIdentity(email, phone);
    }

    if (role === "guru") {
      if (!email) return res.status(400).json({ success: false, message: "Email guru wajib diisi" });
      identity = await findGuruResetIdentity(email);
    }

    if (role === "kepala_sekolah") {
      if (!email) return res.status(400).json({ success: false, message: "Email kepala sekolah wajib diisi" });
      identity = await findKepalaSekolahResetIdentity(email);
    }

    const payload = {
      role: identity.role,
      email: identity.email,
      name: identity.name,
      nisn: identity.nisn || null,
      class_name: identity.class_name || null,
      notes: identity.notes || null,
      matched_user_id: identity.matched_user_id || null,
      ip_address: getClientIp(req),
      user_agent: req.headers?.["user-agent"] || null
    };

    const existingRequest = await PasswordResetRequest.findOne({
      where: { role: payload.role, email: payload.email, status: "pending" },
      order: [["createdAt", "DESC"]]
    });

    const request = existingRequest
      ? await existingRequest.update(payload)
      : await PasswordResetRequest.create(payload);

    await logAudit(req, {
      action: "password.reset.request",
      entityType: "password_reset_request",
      entityId: request.id,
      metadata: { role: payload.role, matched: identity.matched }
    });

    return res.status(202).json({ success: true, message: RESET_REQUEST_MESSAGE });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengirim permintaan reset kata sandi" });
  }
};

/**
 * Controller Express: mengganti kata sandi pengguna yang sedang login. Bila akun tidak
 * berstatus wajib ganti sandi (must_change_password), kata sandi lama harus diverifikasi
 * terlebih dahulu. Kata sandi baru divalidasi (minimal 6 karakter), di-hash, dan flag
 * must_change_password dimatikan. Aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.body memuat (alias ganda): currentPassword/
 *   kata_sandi_lama dan newPassword/kata_sandi_baru. req.user.id menunjuk akun yang login.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 bila sukses; 400 bila sandi baru kosong/terlalu pendek
 *   atau sandi lama wajib namun kosong; 401 bila sandi lama salah; 500 untuk error server.
 *   Efek samping: update kata sandi (di-hash) User dan menulis audit log.
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, kata_sandi_lama, kata_sandi_baru } = req.body;
    const kataSandiLama = kata_sandi_lama || currentPassword;
    const kataSandiBaru = kata_sandi_baru || newPassword;

    if (!kataSandiBaru) {
      return res.status(400).json({ success: false, message: "Kata sandi baru wajib diisi" });
    }

    if (String(kataSandiBaru).length < 6) {
      return res.status(400).json({ success: false, message: "Kata sandi baru minimal 6 karakter" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user.must_change_password) {
      if (!kataSandiLama) {
        return res.status(400).json({ success: false, message: "Kata sandi lama wajib diisi" });
      }
      const validCurrentPassword = await bcrypt.compare(kataSandiLama, user.password);
      if (!validCurrentPassword) {
        return res.status(401).json({ success: false, message: "Kata sandi lama tidak sesuai" });
      }
    }

    await user.update({
      password: await bcrypt.hash(kataSandiBaru, 10),
      must_change_password: false
    });

    await logAudit(req, { action: "password.change", entityType: "user_account", entityId: user.id });

    return res.json({ success: true, message: "Kata sandi berhasil diganti. Silakan masuk kembali." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengganti kata sandi", error: error.message });
  }
};
