const bcrypt = require("bcryptjs");
const db = require("../models");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { logAudit } = require("../services/auditLogService");

const User = db.User;
const Siswa = db.Siswa;
const Kelas = db.Kelas;
const PortalAccountLink = db.PortalAccountLink;
const PasswordResetRequest = db.PasswordResetRequest;

const SAFE_ATTRS = ["id", "name", "email", "role", "profession", "must_change_password", "createdAt", "updatedAt"];
const VALID_ROLES = ["admin", "guru", "siswa", "orangtua", "kepala_sekolah"];
const LINKED_ROLES = ["siswa", "orangtua"];
const RESET_REQUEST_STATUSES = ["pending", "completed", "rejected"];

/**
 * Menyaring objek user agar hanya field aman (SAFE_ATTRS) yang ikut dikirim ke
 * klien, sehingga data sensitif seperti hash kata sandi tidak pernah bocor.
 *
 * @param {object|null} user - Instance/objek user mentah dari database.
 * @returns {object|null} Objek baru berisi hanya field di SAFE_ATTRS, atau null
 *   bila input kosong. Tidak ada efek samping (murni transformasi data).
 */
function safeUser(user) {
  if (!user) return null;
  return SAFE_ATTRS.reduce((payload, key) => ({ ...payload, [key]: user[key] }), {});
}

/**
 * Membersihkan dan membatasi panjang teks bebas (mis. alasan penolakan) agar
 * konsisten: memangkas spasi berlebih dan memotong sesuai batas maksimum.
 *
 * @param {*} value - Nilai teks mentah yang akan dinormalisasi.
 * @param {number} [maxLength=500] - Panjang maksimum karakter hasil.
 * @returns {string} Teks yang sudah dirapikan dan dipotong. Tanpa efek samping.
 */
function normalizeText(value, maxLength = 500) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text.slice(0, maxLength);
}

/**
 * Mengubah entitas permintaan reset kata sandi menjadi bentuk JSON yang aman
 * untuk dikirim ke admin, termasuk menyaring relasi user (matchedUser/processedBy)
 * lewat safeUser agar tidak membocorkan data sensitif.
 *
 * @param {object|null} request - Instance Sequelize PasswordResetRequest atau objek polos.
 * @returns {object|null} Objek permintaan reset yang sudah dirapikan, atau null
 *   bila input kosong. Tanpa efek samping.
 */
function safePasswordResetRequest(request) {
  const data = request?.toJSON ? request.toJSON() : request;
  if (!data) return null;

  return {
    id: data.id,
    role: data.role,
    email: data.email,
    name: data.name,
    nisn: data.nisn,
    class_name: data.class_name,
    notes: data.notes,
    status: data.status,
    matched_user_id: data.matched_user_id,
    processed_by: data.processed_by,
    rejection_reason: data.rejection_reason,
    processed_at: data.processed_at,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    matchedUser: safeUser(data.matchedUser),
    processedBy: safeUser(data.processedBy)
  };
}

/**
 * Mengambil seluruh data kelas dari database dan menyusunnya menjadi Map untuk
 * pencarian cepat berdasarkan id kelas (dipakai saat melekatkan data kelas ke siswa).
 *
 * @returns {Promise<Map<number, object>>} Map dengan kunci id kelas (number) dan
 *   nilai objek kelas (JSON). Efek samping: melakukan query baca ke tabel Kelas.
 */
async function getClassMap() {
  const kelas = await Kelas.findAll();
  return new Map(kelas.map((item) => [Number(item.id), item.toJSON()]));
}

/**
 * Melekatkan objek kelas ke data siswa berdasarkan kelas_id, sehingga konsumen
 * mendapat informasi kelas lengkap tanpa query tambahan.
 *
 * @param {object|null} siswa - Instance/objek siswa.
 * @param {Map<number, object>} classMap - Map kelas hasil getClassMap().
 * @returns {object|null} Objek siswa dengan properti `kelas` terisi (atau null
 *   bila kelas tidak ditemukan), atau null bila siswa kosong. Tanpa efek samping.
 */
function attachClass(siswa, classMap) {
  if (!siswa) return null;
  const data = siswa.toJSON ? siswa.toJSON() : siswa;
  return { ...data, kelas: classMap.get(Number(data.kelas_id)) || null };
}

/**
 * Menyusun payload lengkap daftar pengguna dengan menggabungkan data akun, tautan
 * portal (PortalAccountLink), dan data siswa yang terkait beserta kelasnya. Dipakai
 * agar respons daftar/detail user menampilkan relasi siswa/orang tua secara utuh.
 *
 * @param {Array<object>} users - Daftar instance user yang akan diperkaya.
 * @returns {Promise<Array<object>>} Daftar objek user aman (safeUser) yang
 *   dilengkapi portalLink, portalLinks, dan data siswa. Efek samping: melakukan
 *   beberapa query baca ke PortalAccountLink, Siswa, dan Kelas.
 */
async function buildUsersPayload(users) {
  const userIds = users.map((user) => Number(user.id));
  const links = userIds.length && PortalAccountLink
    ? await PortalAccountLink.findAll({ where: { user_id: userIds } })
    : [];
  const studentIds = [...new Set(links.map((link) => Number(link.siswa_id)).filter(Boolean))];
  const students = studentIds.length ? await Siswa.findAll({ where: { id: studentIds } }) : [];
  const classMap = await getClassMap();
  const studentMap = new Map(students.map((siswa) => [Number(siswa.id), attachClass(siswa, classMap)]));
  const linkMap = new Map();

  links.forEach((link) => {
    const data = link.toJSON();
    const currentLinks = linkMap.get(Number(data.user_id)) || [];
    currentLinks.push({ ...data, siswa: studentMap.get(Number(data.siswa_id)) || null });
    linkMap.set(Number(data.user_id), currentLinks);
  });

  return users.map((user) => {
    const userLinks = linkMap.get(Number(user.id)) || [];
    const link = userLinks[0] || null;
    return {
      ...safeUser(user),
      portalLink: link,
      portalLinks: userLinks,
      siswa: link ? studentMap.get(Number(link.siswa_id)) || null : null
    };
  });
}

/**
 * Membuat atau memperbarui tautan akun portal (PortalAccountLink) antara akun user
 * dengan data siswa, sesuai peran akun. Untuk peran "orangtua" memastikan satu siswa
 * tidak terhubung ke orang tua lain dan membersihkan tautan tipe "siswa" yang lama;
 * untuk peran "siswa" menghapus semua tautan lama lalu membuat tautan baru.
 *
 * @param {number} userId - ID akun user yang akan ditautkan.
 * @param {number} siswaId - ID siswa target tautan (wajib untuk peran siswa/orangtua).
 * @param {string} role - Peran akun; hanya diproses bila termasuk LINKED_ROLES.
 * @param {object} transaction - Transaksi Sequelize agar operasi bersifat atomik.
 * @returns {Promise<object|null>} Instance PortalAccountLink yang dibuat/ditemukan,
 *   atau null bila peran bukan siswa/orangtua. Melempar Error bila siswa tidak
 *   dipilih, siswa tidak ditemukan, atau siswa sudah terhubung ke orang tua lain.
 *   Efek samping: menghapus dan/atau membuat baris PortalAccountLink dalam transaksi.
 */
async function upsertPortalLink(userId, siswaId, role, transaction) {
  if (!PortalAccountLink || !LINKED_ROLES.includes(role)) return null;
  if (!siswaId) throw new Error("Data siswa wajib dipilih untuk akun siswa/orang tua");

  const siswa = await Siswa.findByPk(siswaId, { transaction });
  if (!siswa) throw new Error("Data siswa tidak ditemukan");

  if (role === "orangtua") {
    const existingParentLink = await PortalAccountLink.findOne({
      where: { siswa_id: siswa.id, link_type: role, user_id: { [Op.ne]: userId } },
      transaction
    });
    if (existingParentLink) throw new Error("Siswa ini sudah terhubung ke akun orang tua lain");

    await PortalAccountLink.destroy({ where: { user_id: userId, link_type: "siswa" }, transaction });
    const existingLink = await PortalAccountLink.findOne({
      where: { user_id: userId, siswa_id: siswa.id, link_type: role },
      transaction
    });
    if (existingLink) return existingLink;
    return PortalAccountLink.create({ user_id: userId, siswa_id: siswa.id, link_type: role }, { transaction });
  }

  await PortalAccountLink.destroy({ where: { user_id: userId }, transaction });
  return PortalAccountLink.create({ user_id: userId, siswa_id: siswa.id, link_type: role }, { transaction });
}

/**
 * Controller Express: menampilkan ringkasan dasbor administrator berupa jumlah
 * pengguna per peran (guru, siswa, admin, kepala sekolah) dan nama admin yang login.
 *
 * @param {import('express').Request} req - Memakai req.user.name (nama admin yang sedang login).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim respons JSON 200 berisi statistik dasbor, atau
 *   500 bila terjadi kesalahan server. Efek samping: query count ke tabel User.
 */
exports.dashboard = async (req, res) => {
  try {
    const totalGuru = await User.count({ where: { role: "guru" } });
    const totalSiswa = await User.count({ where: { role: "siswa" } });
    const totalAdmin = await User.count({ where: { role: "admin" } });
    const totalKepalaSekolah = await User.count({ where: { role: "kepala_sekolah" } });

    return res.json({
      success: true,
      message: "Data dasbor administrator berhasil diambil",
      data: {
        admin: req.user.name,
        totalGuru,
        totalSiswa,
        totalAdmin,
        totalKepalaSekolah,
        loginHariIni: 1
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message
    });
  }
};

/**
 * Controller Express: mengambil daftar pengguna, opsional difilter berdasarkan peran,
 * lengkap dengan tautan portal dan data siswa terkait (via buildUsersPayload).
 *
 * @param {import('express').Request} req - Memakai req.query.role untuk memfilter peran (opsional).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim respons JSON 200 berisi daftar pengguna terurut
 *   menurut nama, atau 500 bila gagal. Efek samping: query baca ke User dan relasinya.
 */
exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const where = {};
    if (role) where.role = role;

    const users = await User.findAll({
      where,
      attributes: SAFE_ATTRS,
      order: [["name", "ASC"]]
    });
    const data = await buildUsersPayload(users);

    return res.json({
      success: true,
      message: "Data pengguna berhasil diambil",
      data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data pengguna",
      error: error.message
    });
  }
};

/**
 * Controller Express: membuat pengguna baru beserta tautan portalnya bila peran
 * berupa siswa/orang tua. Memvalidasi field wajib, peran, keunikan email, lalu
 * menyimpan akun (kata sandi di-hash) dalam satu transaksi.
 *
 * @param {import('express').Request} req - req.body memuat: name, email, password,
 *   role (default "siswa"), profession, dan siswa_id (wajib untuk siswa/orangtua).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 201 dengan data pengguna baru bila sukses;
 *   400 untuk validasi gagal, 409 bila email duplikat, atau 500 untuk error server.
 *   Efek samping: membuat baris User dan (opsional) PortalAccountLink dalam transaksi.
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role = "siswa", profession, siswa_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Nama, email, dan kata sandi wajib diisi"
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Peran akun tidak valid" });
    }

    if (LINKED_ROLES.includes(role) && !siswa_id) {
      return res.status(400).json({ success: false, message: "Pilih data siswa yang akan dihubungkan" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email sudah terdaftar"
      });
    }

    const transaction = await db.sequelize.transaction();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashedPassword, role, profession }, { transaction });
      await upsertPortalLink(user.id, siswa_id, role, transaction);
      await transaction.commit();

      const [payload] = await buildUsersPayload([user]);
      return res.status(201).json({ success: true, message: "Pengguna berhasil ditambahkan", data: payload });
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: error.message });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan pengguna",
      error: error.message
    });
  }
};

/**
 * Controller Express: memperbarui data pengguna yang sudah ada dan menyesuaikan
 * tautan portalnya. Hanya field yang dikirim yang diubah; bila peran baru bukan
 * siswa/orang tua maka tautan portal dihapus. Seluruh perubahan dijalankan dalam transaksi.
 *
 * @param {import('express').Request} req - req.params.id ID pengguna; req.body memuat
 *   name, email, password, role, profession, siswa_id (semuanya opsional).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 dengan data terbaru bila sukses; 404 bila
 *   pengguna tak ada, 409 bila email bentrok, 400 untuk validasi/transaksi gagal,
 *   atau 500 untuk error server. Efek samping: update User dan sinkronisasi
 *   PortalAccountLink dalam transaksi (kata sandi di-hash bila diganti).
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, profession, siswa_id } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan"
      });
    }

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Email sudah terdaftar"
        });
      }
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "Peran akun tidak valid" });
    }

    if (role && LINKED_ROLES.includes(role) && !siswa_id) {
      return res.status(400).json({ success: false, message: "Pilih data siswa yang akan dihubungkan" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (profession !== undefined) updateData.profession = profession;
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const nextRole = role || user.role;
    const transaction = await db.sequelize.transaction();

    try {
      await user.update(updateData, { transaction });
      if (LINKED_ROLES.includes(nextRole)) await upsertPortalLink(user.id, siswa_id, nextRole, transaction);
      else if (PortalAccountLink) await PortalAccountLink.destroy({ where: { user_id: user.id }, transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: error.message });
    }

    const [payload] = await buildUsersPayload([user]);

    return res.json({
      success: true,
      message: "Pengguna berhasil diperbarui",
      data: payload
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui pengguna",
      error: error.message
    });
  }
};

/**
 * Controller Express: menghapus pengguna berdasarkan id, dengan pengaman agar admin
 * tidak dapat menghapus akunnya sendiri.
 *
 * @param {import('express').Request} req - req.params.id ID pengguna yang dihapus;
 *   req.user.id dipakai untuk mencegah penghapusan akun sendiri.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 bila berhasil; 404 bila pengguna tak ada,
 *   400 bila mencoba menghapus akun sendiri, atau 500 untuk error server.
 *   Efek samping: menghapus baris User dari database.
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Pengguna tidak ditemukan"
      });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Tidak dapat menghapus akun sendiri"
      });
    }

    await user.destroy();

    return res.json({
      success: true,
      message: "Pengguna berhasil dihapus"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus pengguna",
      error: error.message
    });
  }
};


/**
 * Menghasilkan kata sandi acak berformat "CNB-XXXXXXXX" (8 karakter hex huruf besar)
 * untuk dipakai saat admin mereset kata sandi tanpa menentukan sandi sendiri.
 *
 * @returns {string} String kata sandi acak. Efek samping: menggunakan crypto untuk
 *   menghasilkan byte acak (tidak menyentuh database).
 */
function generatePassword() {
  return `CNB-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Controller Express: mengatur ulang (reset paksa) kata sandi seorang pengguna oleh
 * admin. Bila admin tidak mengirim kata sandi, sistem membuatkan sandi acak. Pengguna
 * diwajibkan mengganti kata sandi pada login berikutnya, dan aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.params.id ID pengguna; req.body.password
 *   kata sandi baru opsional (minimal 6 karakter); req dipakai oleh logAudit (identitas admin).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi data user dan generated_password (bila
 *   dibuat otomatis); 400 bila sandi terlalu pendek, 404 bila user tak ada, atau 500.
 *   Efek samping: update kata sandi (di-hash) & must_change_password, serta menulis audit log.
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const requestedPassword = req.body.password || generatePassword();

    if (String(requestedPassword).length < 6) {
      return res.status(400).json({ success: false, message: "Kata sandi minimal 6 karakter" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan" });
    }

    await user.update({
      password: await bcrypt.hash(requestedPassword, 10),
      must_change_password: true
    });

    await logAudit(req, {
      action: "password.force_reset",
      entityType: "user_account",
      entityId: user.id,
      metadata: { role: user.role, generated: !req.body.password }
    });

    return res.json({
      success: true,
      message: "Kata sandi pengguna berhasil diatur ulang. Pengguna wajib mengganti kata sandi saat masuk berikutnya.",
      data: {
        user: safeUser(user),
        generated_password: req.body.password ? null : requestedPassword
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengatur ulang kata sandi pengguna", error: error.message });
  }
};

/**
 * Controller Express: mengambil daftar permintaan reset kata sandi (dari pengguna),
 * difilter berdasarkan status. Disajikan untuk admin agar dapat memproses/menolak.
 *
 * @param {import('express').Request} req - req.query.status status filter (default
 *   "pending"); bila status tidak valid maka tidak difilter (semua status diambil).
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi daftar permintaan reset (lengkap relasi
 *   matchedUser & processedBy yang sudah disaring), atau 500 bila gagal. Efek samping:
 *   query baca ke PasswordResetRequest beserta relasi User.
 */
exports.getPasswordResetRequests = async (req, res) => {
  try {
    const status = String(req.query.status || "pending").trim().toLowerCase();
    const where = RESET_REQUEST_STATUSES.includes(status) ? { status } : {};
    const requests = await PasswordResetRequest.findAll({
      where,
      include: [
        { model: User, as: "matchedUser", attributes: SAFE_ATTRS },
        { model: User, as: "processedBy", attributes: SAFE_ATTRS }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.json({ success: true, data: requests.map(safePasswordResetRequest) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memuat permintaan reset password" });
  }
};

/**
 * Controller Express: memproses (menyetujui) permintaan reset kata sandi yang masih
 * "pending". Memvalidasi bahwa akun cocok otomatis dan perannya sesuai, lalu mengganti
 * kata sandi user (di-hash) sambil menandai must_change_password. Permintaan ditandai
 * "completed". Seluruh langkah berjalan dalam satu transaksi dan dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.params.id ID permintaan reset; req.body.password
 *   kata sandi baru opsional (minimal 6 karakter; bila kosong dibuat otomatis);
 *   req.user.id dipakai sebagai pemroses.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi request, user, dan generated_password
 *   (bila otomatis); 404 bila permintaan tak ada; 400 bila sudah diproses, sandi pendek,
 *   atau akun tidak cocok/valid; 500 untuk error server. Efek samping: update User &
 *   PasswordResetRequest dalam transaksi, menulis audit log.
 */
exports.processPasswordResetRequest = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const request = await PasswordResetRequest.findByPk(req.params.id, { transaction });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Permintaan reset password tidak ditemukan" });
    }

    if (request.status !== "pending") {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Permintaan ini sudah diproses" });
    }

    const requestedPassword = req.body.password || generatePassword();
    if (String(requestedPassword).length < 6) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Kata sandi minimal 6 karakter" });
    }

    if (!request.matched_user_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Akun belum cocok otomatis. Tolak permintaan atau reset manual dari menu akun setelah verifikasi."
      });
    }

    const user = await User.findByPk(request.matched_user_id, { transaction });
    if (!user || user.role !== request.role) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Akun yang cocok tidak valid. Tolak permintaan atau reset manual dari menu akun."
      });
    }

    await user.update({
      password: await bcrypt.hash(requestedPassword, 10),
      must_change_password: true
    }, { transaction });

    await request.update({
      status: "completed",
      matched_user_id: user.id,
      processed_by: req.user.id,
      processed_at: new Date(),
      rejection_reason: null
    }, { transaction });

    await logAudit(req, {
      action: "password.reset.request.complete",
      entityType: "password_reset_request",
      entityId: request.id,
      metadata: { role: user.role, user_id: user.id, generated: !req.body.password }
    }, { transaction });

    await transaction.commit();

    return res.json({
      success: true,
      message: "Permintaan reset selesai. Pengguna wajib mengganti kata sandi saat login berikutnya.",
      data: {
        request: safePasswordResetRequest(request),
        user: safeUser(user),
        generated_password: req.body.password ? null : requestedPassword
      }
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: "Gagal memproses permintaan reset password" });
  }
};

/**
 * Controller Express: menolak permintaan reset kata sandi yang masih "pending" dengan
 * alasan penolakan. Aksi dicatat ke audit log.
 *
 * @param {import('express').Request} req - req.params.id ID permintaan; req.body.reason
 *   atau req.body.alasan_penolakan sebagai alasan (default "Ditolak administrator");
 *   req.user.id dipakai sebagai pemroses.
 * @param {import('express').Response} res - Objek respons Express.
 * @returns {Promise<void>} Mengirim 200 berisi data request yang ditolak; 404 bila
 *   permintaan tak ada; 400 bila sudah diproses; 500 untuk error server. Efek samping:
 *   update PasswordResetRequest menjadi "rejected" dan menulis audit log.
 */
exports.rejectPasswordResetRequest = async (req, res) => {
  try {
    const request = await PasswordResetRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Permintaan reset password tidak ditemukan" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, message: "Permintaan ini sudah diproses" });
    }

    const rejectionReason = normalizeText(req.body.reason || req.body.alasan_penolakan || "Ditolak administrator");
    await request.update({
      status: "rejected",
      processed_by: req.user.id,
      processed_at: new Date(),
      rejection_reason: rejectionReason
    });

    await logAudit(req, {
      action: "password.reset.request.reject",
      entityType: "password_reset_request",
      entityId: request.id,
      metadata: { role: request.role }
    });

    return res.json({
      success: true,
      message: "Permintaan reset password ditolak.",
      data: { request: safePasswordResetRequest(request) }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal menolak permintaan reset password" });
  }
};

/**
 * Controller Express (admin): laporan ringkas sistem. Mengagregasi data PPDB,
 * Siswa (per status), Guru (per status), mutasi/riwayat kelas, dan absensi
 * untuk ditampilkan pada modul Laporan.
 *
 * @param {import('express').Request} req - Request Express.
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} HTTP 200 berisi objek laporan; 500 bila gagal.
 */
exports.getReports = async (req, res) => {
  try {
    const PPDB = db.PPDB;
    const Guru = db.Guru;
    const RiwayatKelas = db.RiwayatKelas;
    const AbsensiSiswa = db.AbsensiSiswa;

    const [ppdbAll, siswaAll, guruAll, mutasiTotal, absensiTotal] = await Promise.all([
      PPDB.findAll(),
      Siswa.findAll(),
      Guru.findAll(),
      RiwayatKelas.count(),
      AbsensiSiswa.count()
    ]);

    const countStatus = (rows, status) => rows.filter((row) => row.status === status).length;

    return res.json({
      success: true,
      message: "Laporan sistem berhasil diambil",
      data: {
        ppdb: {
          total: ppdbAll.length,
          pending: countStatus(ppdbAll, "pending"),
          diterima: countStatus(ppdbAll, "diterima"),
          ditolak: countStatus(ppdbAll, "ditolak"),
          daftar_ulang: ppdbAll.filter((row) => row.status_daftar_ulang === "sudah").length
        },
        siswa: {
          total: siswaAll.length,
          aktif: countStatus(siswaAll, "aktif"),
          lulus: countStatus(siswaAll, "lulus"),
          pindah: countStatus(siswaAll, "pindah"),
          keluar: countStatus(siswaAll, "keluar"),
          berhenti: countStatus(siswaAll, "berhenti")
        },
        guru: {
          total: guruAll.length,
          aktif: countStatus(guruAll, "aktif"),
          non_aktif: countStatus(guruAll, "non-aktif"),
          resign: countStatus(guruAll, "resign")
        },
        mutasi_kelas: mutasiTotal,
        absensi_tercatat: absensiTotal
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil laporan sistem", error: error.message });
  }
};

/**
 * Controller Express (admin): mengambil riwayat audit (audit log) terbaru untuk
 * keperluan jejak: verifikasi PPDB, perpindahan kelas, update NIS, guru resign, dll.
 *
 * @param {import('express').Request} req - req.query.limit (default 100).
 * @param {import('express').Response} res - Response Express.
 * @returns {Promise<void>} HTTP 200 berisi daftar audit log; 500 bila gagal.
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const AuditLog = db.AuditLog;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const logs = await AuditLog.findAll({ order: [["createdAt", "DESC"]], limit });
    return res.json({ success: true, message: "Riwayat audit berhasil diambil", data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil riwayat audit", error: error.message });
  }
};
