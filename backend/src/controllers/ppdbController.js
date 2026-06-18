const db = require("../models");

const PPDB = db.PPDB;
const { notifyNewPPDB } = require("../services/ppdbNotifier");

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
      return res.status(400).json({ success: false, message: "Target jenjang tidak valid" });
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
      message: "Pendaftaran berhasil dikirim. Informasi verifikasi akan diberitahukan melalui email orang tua/wali atau WhatsApp.",
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

    await ppdb.update(req.body);

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

    await ppdb.destroy();

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
