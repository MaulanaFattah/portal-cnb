const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const db = require("../models");
const { deleteLocalUpload, toRelativeUploadPath } = require("../utils/uploadStorage");
const { logAudit } = require("../services/auditLogService");

const Siswa = db.Siswa;
const Kelas = db.Kelas;
const User = db.User;
const PortalAccountLink = db.PortalAccountLink;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mengambil seluruh data kelas dan memetakannya berdasarkan id untuk pencarian cepat data kelas seorang siswa.
 *
 * @returns {Promise<Map<number, Object>>} Map dengan key id kelas (number) dan value objek kelas (JSON).
 */
async function getClassMap() {
  const kelas = await Kelas.findAll();
  return new Map(kelas.map((item) => [Number(item.id), item.toJSON()]));
}

/**
 * Melengkapi data siswa dengan objek kelasnya berdasarkan kelas_id, memakai map kelas yang sudah disiapkan.
 *
 * @param {Object} siswa - Instance/objek siswa.
 * @param {Map<number, Object>} classMap - Map id kelas ke objek kelas (lihat getClassMap).
 * @returns {Object} Objek siswa (JSON) dengan tambahan field "kelas" (null bila kelas tidak ditemukan).
 */
function attachClass(siswa, classMap) {
  const data = siswa.toJSON ? siswa.toJSON() : siswa;
  return { ...data, kelas: classMap.get(Number(data.kelas_id)) || null };
}

/**
 * Menormalkan alamat email menjadi bentuk standar (trim + huruf kecil) agar konsisten saat disimpan/dicocokkan.
 *
 * @param {*} email - Nilai email mentah (boleh undefined/null).
 * @returns {string} Email yang sudah di-trim dan di-lowercase (string kosong bila input kosong).
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Menormalkan nomor telepon menjadi format lokal: hanya digit, dan prefiks "62" diubah menjadi "0".
 * Dipakai untuk membandingkan nomor telepon antar siswa (mendeteksi orang tua/wali yang sama).
 *
 * @param {*} value - Nilai nomor telepon mentah (boleh berisi spasi/karakter non-digit).
 * @returns {string} Nomor telepon berformat digit lokal (mis. "08123...").
 */
function normalizePhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  return digits;
}

/**
 * Membuat password acak dengan prefiks tertentu untuk akun siswa/orang tua yang dibuat otomatis.
 *
 * @param {string} prefix - Awalan password (mis. "SISWA" atau "ORTU") agar mudah dikenali.
 * @returns {string} Password acak berformat "{prefix}-XXXXXX" (6 karakter alfanumerik kapital).
 */
function generatePassword(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Menyusun alamat email portal default berbasis NISN untuk akun siswa atau orang tua bila email tidak disuplai.
 * NISN dibersihkan menjadi huruf/angka saja; akun siswa memakai domain "@cnb.sch.id", orang tua "...ortu@cnb.sch.id".
 *
 * @param {string|number} nisn - NISN siswa sebagai dasar pembentukan email.
 * @param {("siswa"|"orangtua")} type - Jenis akun yang menentukan format email.
 * @returns {string} Alamat email portal yang dihasilkan.
 */
function buildPortalEmail(nisn, type) {
  const cleanNisn = String(nisn).toLowerCase().replace(/[^a-z0-9]+/g, "");
  return type === "siswa" ? `${cleanNisn}@cnb.sch.id` : `${cleanNisn}.ortu@cnb.sch.id`;
}

/**
 * Mencari akun orang tua yang sudah ada untuk dipakai ulang berdasarkan kesamaan nomor telepon. Logika bisnisnya:
 * temukan siswa-siswa (saudara) dengan nomor telepon yang sama, lalu cari tautan akun orang tua pada salah satunya,
 * dan kembalikan user orang tua tersebut. Mencegah pembuatan akun orang tua ganda untuk satu keluarga.
 *
 * @param {string} phone - Nomor telepon orang tua dari data siswa yang sedang dibuat.
 * @param {import('sequelize').Transaction} transaction - Transaksi Sequelize aktif.
 * @returns {Promise<Object|null>} Instance User orang tua yang bisa dipakai ulang, atau null bila tidak ada.
 */
async function findReusableParentUserByPhone(phone, transaction) {
  const parentPhone = normalizePhoneNumber(phone);
  if (!parentPhone) return null;

  const siblingStudents = await Siswa.findAll({
    where: { no_telepon: { [Op.ne]: null } },
    attributes: ["id", "no_telepon"],
    transaction
  });
  const siblingIds = siblingStudents
    .filter((student) => normalizePhoneNumber(student.no_telepon) === parentPhone)
    .map((student) => student.id);
  if (!siblingIds.length) return null;

  const parentLink = await PortalAccountLink.findOne({
    where: { siswa_id: { [Op.in]: siblingIds }, link_type: "orangtua" },
    order: [["id", "ASC"]],
    transaction
  });
  if (!parentLink) return null;

  return User.findOne({ where: { id: parentLink.user_id, role: "orangtua" }, transaction });
}

/**
 * Menyusun payload data siswa dari body request (dan file foto bila ada upload), dengan normalisasi nilai
 * (trim, fallback null, normalisasi email, dukungan field nama_orangtua sebagai nama_ayah) serta status default "aktif".
 *
 * @param {Object} body - Objek req.body berisi data siswa (nisn, nama, kelas_id, biodata, data orang tua, dll).
 * @param {Object} [file] - Objek req.file hasil upload foto (opsional); bila ada, dipakai sebagai path foto.
 * @returns {Object} Payload siswa yang sudah dinormalkan, siap dipakai untuk create/update.
 */
function buildSiswaPayload(body, file) {
  const foto = file ? toRelativeUploadPath(file) : body.foto || null;
  return {
    nisn: String(body.nisn || "").trim(),
    nama: String(body.nama || "").trim(),
    kelas_id: Number(body.kelas_id),
    tempat_lahir: body.tempat_lahir || null,
    tanggal_lahir: body.tanggal_lahir || null,
    jenis_kelamin: body.jenis_kelamin,
    agama: body.agama || null,
    alamat: body.alamat || null,
    nama_ayah: body.nama_ayah || body.nama_orangtua || null,
    nama_ibu: body.nama_ibu || null,
    no_telepon: body.no_telepon || null,
    email: normalizeEmail(body.email) || null,
    foto,
    status: body.status || "aktif"
  };
}

/**
 * Memvalidasi kelengkapan dan validitas field wajib pada payload siswa sebelum disimpan.
 *
 * @param {Object} payload - Payload siswa hasil buildSiswaPayload.
 * @returns {string|null} Pesan kesalahan validasi bila ada yang tidak valid, atau null bila semua valid.
 */
function validateRequired(payload) {
  if (!payload.nisn || !payload.nama || !payload.kelas_id || !payload.tanggal_lahir || !payload.jenis_kelamin) {
    return "NIS/NISN, nama, kelas, tanggal lahir, dan jenis kelamin wajib diisi";
  }

  if (!['L', 'P'].includes(payload.jenis_kelamin)) return "Jenis kelamin tidak valid";
  return null;
}

/**
 * Mengambil seluruh data siswa (diurutkan berdasarkan nama) beserta data kelas masing-masing.
 *
 * @param {import('express').Request} req - Request Express (tidak ada parameter khusus yang dipakai).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi daftar siswa lengkap dengan kelasnya; 500 bila terjadi kesalahan.
 */
exports.getAllSiswa = async (req, res) => {
  try {
    const siswa = await Siswa.findAll({ order: [["nama", "ASC"]] });
    const classMap = await getClassMap();

    res.json({
      success: true,
      message: "Data siswa berhasil diambil",
      data: siswa.map((item) => attachClass(item, classMap))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data siswa",
      error: error.message
    });
  }
};

/**
 * Membuat data siswa baru sekaligus akun login siswa dan akun orang tua dalam satu transaksi database.
 * Alur bisnisnya: validasi data & kelas; cari akun orang tua yang bisa dipakai ulang berdasarkan nomor telepon;
 * tentukan & validasi email akun (siswa selalu baru, orang tua baru bila tidak dipakai ulang); pastikan email unik
 * dan belum terdaftar; buat record siswa, akun User siswa, dan (bila perlu) akun User orang tua; tautkan keduanya
 * lewat PortalAccountLink; lalu catat audit log. Bila gagal, transaksi di-rollback dan file foto dihapus.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.body (data siswa & orang tua, termasuk
 *   student_email/parent_email dan password opsional) serta req.file (foto siswa opsional).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: membuat record Siswa, akun User siswa & (opsional) orang tua, tautan
 *   PortalAccountLink, dan audit log "student.create" — semuanya dalam transaksi. Mengirim HTTP 201 dengan data
 *   siswa dan kredensial akun; 400 bila validasi gagal; 409 bila email sudah terdaftar; 500 (rollback) bila error.
 */
exports.createSiswa = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const payload = buildSiswaPayload(req.body, req.file);
    const validationMessage = validateRequired(payload);
    if (validationMessage) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const kelas = await Kelas.findByPk(payload.kelas_id, { transaction });
    if (!kelas) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Kelas tidak valid atau tidak ditemukan" });
    }

    const reusableParentUser = await findReusableParentUserByPhone(payload.no_telepon, transaction);
    const studentEmail = normalizeEmail(req.body.student_email || payload.email || buildPortalEmail(payload.nisn, "siswa"));
    const parentEmail = reusableParentUser
      ? reusableParentUser.email
      : normalizeEmail(req.body.parent_email || req.body.orangtua_email || buildPortalEmail(payload.nisn, "orangtua"));
    if (!EMAIL_PATTERN.test(studentEmail) || (!reusableParentUser && !EMAIL_PATTERN.test(parentEmail))) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Format email akun siswa/orang tua tidak valid" });
    }

    const emails = reusableParentUser ? [studentEmail] : [studentEmail, parentEmail];
    if (new Set(emails).size !== emails.length) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Email akun siswa dan orang tua tidak boleh sama" });
    }

    const existingUsers = await User.findAll({ where: { email: { [Op.in]: emails } }, transaction });
    if (existingUsers.length) {
      await transaction.rollback();
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(409).json({ success: false, message: `Email akun sudah terdaftar: ${existingUsers.map((user) => user.email).join(", ")}` });
    }

    if (reusableParentUser) payload.nama_ayah = reusableParentUser.name;

    const studentPassword = req.body.student_password || generatePassword("SISWA");
    const parentPassword = reusableParentUser ? null : req.body.parent_password || req.body.orangtua_password || generatePassword("ORTU");
    const siswa = await Siswa.create({ ...payload, email: studentEmail }, { transaction });

    const studentUser = await User.create({
      name: payload.nama,
      email: studentEmail,
      password: await bcrypt.hash(studentPassword, 10),
      role: "siswa",
      profession: `Siswa ${kelas.nama_kelas}`,
      must_change_password: true
    }, { transaction });

    let parentUser = reusableParentUser;
    if (!parentUser) {
      const parentName = req.body.nama_orangtua || req.body.orangtua_name || payload.nama_ayah || `Orang Tua ${payload.nama}`;
      parentUser = await User.create({
        name: parentName,
        email: parentEmail,
        password: await bcrypt.hash(parentPassword, 10),
        role: "orangtua",
        profession: [`Orang tua dari ${payload.nama}`, payload.no_telepon ? `No HP: ${payload.no_telepon}` : null].filter(Boolean).join(" | "),
        must_change_password: true
      }, { transaction });
    }

    await PortalAccountLink.bulkCreate([
      { user_id: studentUser.id, siswa_id: siswa.id, link_type: "siswa" },
      { user_id: parentUser.id, siswa_id: siswa.id, link_type: "orangtua" }
    ], { transaction });

    await logAudit(req, {
      action: "student.create",
      entityType: "student",
      entityId: siswa.id,
      metadata: {
        nisn: siswa.nisn,
        createdAccounts: reusableParentUser ? [studentUser.id] : [studentUser.id, parentUser.id],
        reusedParentAccount: Boolean(reusableParentUser),
        uploaded: Boolean(req.file)
      }
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: reusableParentUser
        ? "Data siswa dan akun siswa berhasil ditambahkan. Akun orang tua lama dipakai ulang."
        : "Data siswa serta akun siswa dan orang tua berhasil ditambahkan",
      data: attachClass(siswa, new Map([[Number(kelas.id), kelas.toJSON()]])),
      credentials: {
        siswa: { email: studentEmail, password: studentPassword },
        orangtua: { email: parentEmail, password: parentPassword, reused: Boolean(reusableParentUser) }
      }
    });
  } catch (error) {
    await transaction.rollback();
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data siswa",
      error: error.message
    });
  }
};

/**
 * Memperbarui data siswa berdasarkan id. Menggabungkan data lama dengan input baru, memvalidasi field wajib dan
 * kelas, mengganti foto bila ada upload baru (menghapus foto lama), lalu mencatat audit log.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id siswa), req.body (field yang
 *   diperbarui), dan req.file (foto baru opsional).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui record Siswa, menghapus file foto lama bila diganti, dan
 *   menulis audit log "student.update". Mengirim HTTP 200 dengan data terbaru; 404 bila tidak ditemukan; 400 bila
 *   validasi/kelas tidak valid; 500 bila terjadi kesalahan (file upload dihapus saat gagal).
 */
exports.updateSiswa = async (req, res) => {
  try {
    const { id } = req.params;
    const siswa = await Siswa.findByPk(id);

    if (!siswa) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(404).json({
        success: false,
        message: "Data siswa tidak ditemukan"
      });
    }

    const payload = buildSiswaPayload({ ...siswa.toJSON(), ...req.body }, req.file);
    const validationMessage = validateRequired(payload);
    if (validationMessage) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: validationMessage });
    }

    const kelas = await Kelas.findByPk(payload.kelas_id);
    if (!kelas) {
      if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
      return res.status(400).json({ success: false, message: "Kelas tidak valid atau tidak ditemukan" });
    }

    const oldFoto = siswa.foto;
    await siswa.update(payload);
    if (req.file && oldFoto && oldFoto !== payload.foto) deleteLocalUpload(oldFoto);
    await logAudit(req, {
      action: "student.update",
      entityType: "student",
      entityId: siswa.id,
      metadata: { nisn: siswa.nisn, uploaded: Boolean(req.file) }
    });

    res.json({
      success: true,
      message: "Data siswa berhasil diperbarui",
      data: siswa
    });
  } catch (error) {
    if (req.file) deleteLocalUpload(toRelativeUploadPath(req.file));
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data siswa",
      error: error.message
    });
  }
};

/**
 * Menghapus data siswa berdasarkan id dalam satu transaksi, sekaligus menghapus akun siswa yang tertaut, namun
 * tetap menyimpan akun orang tua (agar bisa dipakai untuk anak lain). Menghapus tautan PortalAccountLink siswa,
 * record siswa, akun User siswa, lalu mencatat audit log dan menghapus file foto setelah commit.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.params.id (id siswa yang dihapus).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: menghapus tautan akun, record Siswa, dan akun User siswa dalam transaksi;
 *   menulis audit log "student.delete"; menghapus file foto. Mengirim HTTP 200 bila berhasil; 404 bila tidak
 *   ditemukan; 500 (rollback) bila terjadi kesalahan.
 */
exports.deleteSiswa = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;
    const siswa = await Siswa.findByPk(id, { transaction });

    if (!siswa) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Data siswa tidak ditemukan"
      });
    }

    const links = await PortalAccountLink.findAll({ where: { siswa_id: siswa.id }, transaction });
    const studentUserIds = links
      .filter((link) => link.link_type === "siswa")
      .map((link) => link.user_id);
    const preservedParentLinks = links.filter((link) => link.link_type === "orangtua").length;
    const oldFoto = siswa.foto;

    await PortalAccountLink.destroy({ where: { siswa_id: siswa.id }, transaction });
    await siswa.destroy({ transaction });
    if (studentUserIds.length) await User.destroy({ where: { id: { [Op.in]: studentUserIds } }, transaction });

    await logAudit(req, {
      action: "student.delete",
      entityType: "student",
      entityId: id,
      metadata: { deletedStudentAccounts: studentUserIds.length, preservedParentLinks }
    }, { transaction });
    await transaction.commit();
    deleteLocalUpload(oldFoto);

    res.json({
      success: true,
      message: "Data siswa dan akun siswa berhasil dihapus. Akun orang tua tetap disimpan."
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Gagal menghapus data siswa",
      error: error.message
    });
  }
};

// ===== Naik Kelas / Pindah Kelas / Kelulusan (item 3, 5 & kelulusan) =====
/**
 * Mengonversi angka Romawi menjadi bilangan bulat. Dipakai untuk menafsirkan tingkat kelas yang ditulis sebagai
 * angka Romawi (mis. "VII"). Karakter non-Romawi diabaikan.
 *
 * @param {*} value - Teks yang mungkin mengandung angka Romawi.
 * @returns {number|null} Nilai bilangan bulat hasil konversi, atau null bila tidak ada angka Romawi yang valid.
 */
function romanToInt(value) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const s = String(value || "").toUpperCase().replace(/[^IVXLCDM]/g, "");
  if (!s) return null;
  let total = 0;
  for (let i = 0; i < s.length; i += 1) {
    const current = map[s[i]];
    const next = map[s[i + 1]];
    if (next && current < next) total -= current;
    else total += current;
  }
  return total || null;
}

// Tentukan nomor tingkat kelas (1..9). TK dianggap 0.
/**
 * Menentukan nomor tingkat sebuah kelas (1..9), dengan TK dianggap 0. Mencoba beberapa strategi secara berurutan:
 * deteksi "TK", parsing field tingkat, angka pada nama kelas, lalu konversi angka Romawi. Dipakai untuk menentukan
 * apakah siswa naik kelas atau lulus.
 *
 * @param {Object|null} kelas - Objek kelas (memiliki nama_kelas dan tingkat); boleh null.
 * @returns {number|null} Nomor tingkat kelas (0 untuk TK), atau null bila tidak dapat ditentukan.
 */
function classTingkatNumber(kelas) {
  if (!kelas) return null;
  const name = String(kelas.nama_kelas || "");
  if (/\btk\b/i.test(name) || /\btk\b/i.test(String(kelas.tingkat || ""))) return 0;
  const tingkat = parseInt(kelas.tingkat, 10);
  if (!Number.isNaN(tingkat)) return tingkat;
  const digit = name.match(/\d+/);
  if (digit) return parseInt(digit[0], 10);
  return romanToInt(name);
}

/**
 * Memproses kenaikan kelas / pindah kelas / kelulusan sekumpulan siswa secara massal dalam satu transaksi.
 * Logika bisnisnya per siswa: bila tingkat kelasnya 6 (Lulus SD) atau 9 (Lulus SMP), siswa ditandai "lulus" dan
 * dicatat ke arsip tanpa dipindah; selain itu siswa dinaikkan ke kelas tujuan (wajib dipilih), kecuali yang sudah
 * berada di kelas tujuan akan dilewati. Setiap perubahan dicatat ke RiwayatKelas dan diakhiri dengan audit log.
 *
 * @param {import('express').Request} req - Request Express. Memakai req.body.siswa_ids (array id siswa),
 *   req.body.kelas_tujuan_id (id kelas tujuan, wajib untuk kenaikan non-kelulusan), dan req.body.tahun_ajaran.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Efek samping: memperbarui kelas_id/status siswa, membuat baris RiwayatKelas, dan menulis
 *   audit log "student.promote" dalam transaksi. Mengirim HTTP 200 dengan jumlah siswa yang naik & lulus; 400 bila
 *   input kurang/kelas tujuan tidak ada; 404 bila siswa tidak ditemukan; 500 (rollback) bila terjadi kesalahan.
 */
exports.promoteSiswa = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const RiwayatKelas = db.RiwayatKelas;
    const { kelas_tujuan_id, tahun_ajaran } = req.body;
    const siswaIds = Array.isArray(req.body.siswa_ids)
      ? req.body.siswa_ids.map((value) => Number(value)).filter(Boolean)
      : [];

    if (!siswaIds.length) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Pilih minimal satu siswa yang akan naik/pindah kelas" });
    }

    let kelasTujuan = null;
    if (kelas_tujuan_id) {
      kelasTujuan = await Kelas.findByPk(Number(kelas_tujuan_id), { transaction });
      if (!kelasTujuan) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Kelas tujuan tidak ditemukan" });
      }
    }

    const siswaList = await Siswa.findAll({ where: { id: { [Op.in]: siswaIds } }, transaction });
    if (!siswaList.length) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Data siswa tidak ditemukan" });
    }

    const classMap = await getClassMap();
    const historyRows = [];
    let moved = 0;
    let graduated = 0;

    for (const siswa of siswaList) {
      const kelasLamaId = siswa.kelas_id ? Number(siswa.kelas_id) : null;
      const kelasLama = kelasLamaId ? classMap.get(kelasLamaId) : null;
      const tingkat = classTingkatNumber(kelasLama);

      // Kelulusan otomatis: kelas 6 = Lulus SD, kelas 9 = Lulus SMP.
      if (tingkat === 6 || tingkat === 9) {
        const statusLulus = tingkat === 6 ? "Lulus SD" : "Lulus SMP";
        historyRows.push({
          siswa_id: siswa.id,
          siswa_nama: siswa.nama,
          nisn: siswa.nisn,
          kelas_lama_id: kelasLamaId,
          kelas_lama_nama: kelasLama ? kelasLama.nama_kelas : null,
          kelas_baru_id: null,
          kelas_baru_nama: statusLulus,
          status: statusLulus,
          tahun_ajaran: tahun_ajaran || (kelasLama ? kelasLama.tahun_ajaran : null) || null
        });
        // Siswa selesai jenjang: tandai lulus, tidak dipindah ke kelas berikutnya.
        await siswa.update({ status: "lulus" }, { transaction });
        graduated += 1;
        continue;
      }

      // Selain kelas 6 & 9 butuh kelas tujuan untuk naik kelas.
      if (!kelasTujuan) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Pilih kelas tujuan untuk menaikkan siswa ${siswa.nama} (kelas ${kelasLama ? kelasLama.nama_kelas : "-"})`
        });
      }

      // Lewati siswa yang sudah berada di kelas tujuan.
      if (kelasLamaId === Number(kelasTujuan.id)) continue;

      historyRows.push({
        siswa_id: siswa.id,
        siswa_nama: siswa.nama,
        nisn: siswa.nisn,
        kelas_lama_id: kelasLamaId,
        kelas_lama_nama: kelasLama ? kelasLama.nama_kelas : null,
        kelas_baru_id: Number(kelasTujuan.id),
        kelas_baru_nama: kelasTujuan.nama_kelas,
        status: "Naik Kelas",
        tahun_ajaran: tahun_ajaran || kelasTujuan.tahun_ajaran || null
      });

      await siswa.update({ kelas_id: Number(kelasTujuan.id) }, { transaction });
      moved += 1;
    }

    if (historyRows.length) {
      await RiwayatKelas.bulkCreate(historyRows, { transaction });
    }

    await logAudit(req, {
      action: "student.promote",
      entityType: "student",
      metadata: { kelas_tujuan_id: kelasTujuan ? Number(kelasTujuan.id) : null, tahun_ajaran: tahun_ajaran || null, moved, graduated }
    }, { transaction });

    await transaction.commit();

    const messageParts = [];
    if (moved) messageParts.push(`${moved} siswa naik ke kelas ${kelasTujuan.nama_kelas}`);
    if (graduated) messageParts.push(`${graduated} siswa diluluskan dan masuk Arsip Kelas`);

    res.json({
      success: true,
      message: messageParts.length
        ? messageParts.join(" & ")
        : "Tidak ada perubahan (siswa terpilih sudah berada di kelas tujuan)",
      data: { moved, graduated }
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Gagal memproses naik kelas",
      error: error.message
    });
  }
};

/**
 * Mengambil seluruh data arsip kelas (RiwayatKelas), yaitu riwayat kenaikan kelas dan kelulusan siswa, diurutkan
 * dari yang terbaru.
 *
 * @param {import('express').Request} req - Request Express (tidak ada parameter khusus yang dipakai).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} Mengirim HTTP 200 berisi daftar riwayat kelas; 500 bila terjadi kesalahan.
 */
exports.getArsipKelas = async (req, res) => {
  try {
    const RiwayatKelas = db.RiwayatKelas;
    const rows = await RiwayatKelas.findAll({ order: [["createdAt", "DESC"]] });

    res.json({
      success: true,
      message: "Data arsip kelas berhasil diambil",
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil arsip kelas",
      error: error.message
    });
  }
};
