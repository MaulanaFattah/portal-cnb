/**
 * ============================================================================
 * Service Notifikasi PPDB (ppdbNotifier)
 * ----------------------------------------------------------------------------
 * Mengirim notifikasi ketika ada pendaftaran PPDB baru, melalui beberapa kanal:
 *   - Webhook (URL dari env PPDB_NOTIFY_WEBHOOK_URL).
 *   - WhatsApp Cloud API (Graph API Facebook).
 * Berisi pula utilitas pembentukan pesan dan pengiriman HTTP JSON.
 * ============================================================================
 */

/**
 * formatDateTime
 * Memformat nilai tanggal/waktu ke format lokal Indonesia (zona Asia/Jakarta)
 * dengan tampilan tanggal, bulan (nama panjang), tahun, jam, dan menit.
 *
 * @param {Date|string|number} [value=new Date()] Nilai tanggal yang akan
 *        diformat; default waktu saat ini.
 * @returns {string} String tanggal-waktu terformat dalam locale "id-ID".
 */
function formatDateTime(value = new Date()) {
  return new Date(value).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * buildPPDBMessage
 * Menyusun teks pesan notifikasi yang berisi ringkasan data pendaftaran PPDB
 * (nama, no HP, email, asal sekolah, jenis pendaftaran, jenjang, dan waktu daftar).
 *
 * @param {Object|{toJSON: Function}} application Data pendaftaran PPDB; dapat
 *        berupa instance model Sequelize (memiliki toJSON) atau objek biasa.
 * @returns {string} Pesan multi-baris yang siap dikirim ke kanal notifikasi.
 */
function buildPPDBMessage(application) {
  const data = application.toJSON ? application.toJSON() : application;
  return [
    "Pendaftaran PPDB baru masuk",
    `Nama siswa: ${data.nama_lengkap || "-"}`,
    `No HP: ${data.no_telepon || "-"}`,
    `Email orang tua/wali: ${data.email || "-"}`,
    `Asal sekolah: ${data.asal_sekolah || "-"}`,
    `Jenis pendaftaran: ${data.jenis_pendaftaran || "-"}`,
    `Jenjang pilihan: ${String(data.target_jenjang || "-").toUpperCase()}`,
    `Waktu daftar: ${formatDateTime(data.createdAt)}`
  ].join("\n");
}

/**
 * postJson
 * Mengirim permintaan HTTP POST dengan body JSON ke URL tujuan, lalu mem-parse
 * respons sebagai JSON. Melempar error bila status respons tidak OK (non-2xx).
 *
 * @param {string} url URL tujuan permintaan.
 * @param {Object} payload Data yang akan dikirim sebagai body JSON.
 * @param {Object} [headers={}] Header tambahan (mis. Authorization); digabung
 *        dengan Content-Type application/json.
 * @returns {Promise<Object>} Hasil parse JSON dari respons; bila body tidak bisa
 *          diparse mengembalikan { ok: true }.
 * @throws {Error} Bila respons tidak OK, melempar error berisi status HTTP dan
 *         cuplikan body respons.
 */
async function postJson(url, payload, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}${text ? `: ${text.slice(0, 160)}` : ""}`);
  }

  return response.json().catch(() => ({ ok: true }));
}

/**
 * notifyWebhook
 * Mengirim notifikasi pendaftaran PPDB ke endpoint webhook yang dikonfigurasi
 * lewat env PPDB_NOTIFY_WEBHOOK_URL. Bila URL tidak diset, fungsi dilewati.
 *
 * @param {Object|{toJSON: Function}} application Data pendaftaran PPDB.
 * @param {string} message Pesan notifikasi yang sudah disusun.
 * @returns {Promise<string|null>} "webhook" bila notifikasi terkirim, atau null
 *          bila webhook tidak dikonfigurasi.
 * @throws {Error} Bila pengiriman HTTP gagal (diteruskan dari postJson).
 */
async function notifyWebhook(application, message) {
  const url = process.env.PPDB_NOTIFY_WEBHOOK_URL;
  if (!url) return null;

  const data = application.toJSON ? application.toJSON() : application;
  await postJson(url, {
    event: "ppdb.created",
    message,
    admin_email: process.env.PPDB_ADMIN_EMAIL || null,
    admin_whatsapp: process.env.PPDB_ADMIN_WHATSAPP || null,
    application: data
  });

  return "webhook";
}

/**
 * notifyWhatsApp
 * Mengirim notifikasi pendaftaran PPDB via WhatsApp Cloud API (Graph API
 * Facebook) ke nomor admin. Membutuhkan env WHATSAPP_PHONE_NUMBER_ID,
 * WHATSAPP_ACCESS_TOKEN, dan PPDB_ADMIN_WHATSAPP. Bila salah satu tidak ada,
 * fungsi dilewati.
 *
 * @param {string} message Pesan teks yang akan dikirim ke admin via WhatsApp.
 * @returns {Promise<string|null>} "whatsapp" bila terkirim, atau null bila
 *          konfigurasi WhatsApp tidak lengkap.
 * @throws {Error} Bila pengiriman HTTP gagal (diteruskan dari postJson).
 */
async function notifyWhatsApp(message) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const adminPhone = process.env.PPDB_ADMIN_WHATSAPP;

  if (!phoneNumberId || !accessToken || !adminPhone) return null;

  await postJson(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to: adminPhone,
      type: "text",
      text: { preview_url: false, body: message }
    },
    { Authorization: `Bearer ${accessToken}` }
  );

  return "whatsapp";
}

/**
 * notifyNewPPDB
 * Titik masuk utama untuk mengirim notifikasi pendaftaran PPDB baru. Menyusun
 * pesan, lalu mencoba seluruh kanal notifikasi yang tersedia (webhook dan
 * WhatsApp) secara berurutan. Error pada salah satu kanal dikumpulkan tanpa
 * menghentikan kanal lain. Bila tidak ada kanal terkonfigurasi sama sekali,
 * akan mencatat info ke console.
 *
 * @param {Object|{toJSON: Function}} application Data pendaftaran PPDB.
 * @returns {Promise<{sent: boolean, channels: string[], errors: string[], message: string}>}
 *          Objek hasil: sent (apakah minimal satu kanal berhasil), channels
 *          (daftar kanal yang berhasil), errors (daftar pesan error), dan message
 *          (teks notifikasi yang dibuat).
 */
exports.notifyNewPPDB = async (application) => {
  const message = buildPPDBMessage(application);
  const channels = [];
  const errors = [];

  for (const notify of [notifyWebhook, notifyWhatsApp]) {
    try {
      const channel = await notify(application, message);
      if (channel) channels.push(channel);
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (!channels.length && !errors.length) {
    console.info("PPDB notification skipped: configure PPDB_NOTIFY_WEBHOOK_URL or WhatsApp environment variables.");
  }

  return { sent: channels.length > 0, channels, errors, message };
};
