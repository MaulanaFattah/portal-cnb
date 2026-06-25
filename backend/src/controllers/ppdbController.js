const db = require("../models");

const PPDB = db.PPDB;
const Pengumuman = db.Pengumuman;
const { notifyNewPPDB } = require("../services/ppdbNotifier");

const ACCEPTED_PPDB_ANNOUNCEMENT_TITLE = "Pengumuman Siswa Diterima PPDB Sekolah Cipta Nusa Bakti";

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

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

    const statusMessage = {
      pending: "Pendaftaran Anda sedang diproses dan menunggu verifikasi admin.",
      diterima: "Selamat! Calon siswa dinyatakan DITERIMA. Silakan datang ke sekolah untuk pendaftaran ulang sesuai arahan panitia PPDB.",
      ditolak: match.notification_note && /alasan/i.test(match.notification_note)
        ? match.notification_note
        : "Mohon maaf, berkas pendaftaran belum dapat kami terima. Silakan hubungi panitia PPDB untuk informasi lebih lanjut."
    };

    return res.json({
      success: true,
      message: "Status pendaftaran ditemukan",
      data: {
        nama_lengkap: match.nama_lengkap,
        target_jenjang: match.target_jenjang,
        status: match.status,
        catatan: statusMessage[match.status] || "Status pendaftaran belum tersedia."
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil status pendaftaran", error: error.message });
  }
};

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

    if (req.body.status && !["pending", "diterima", "ditolak"].includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Status PPDB tidak valid"
      });
    }

    const previousStatus = ppdb.status;

    await ppdb.update(req.body);

    if (previousStatus !== ppdb.status && ["diterima", "pending", "ditolak"].includes(ppdb.status)) {
      await syncAcceptedPPDBAnnouncement();
    }

    res.json({
      success: true,
      message: "Data PPDB berhasil diperbarui",
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
