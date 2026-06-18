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
