/**
 * Meng-escape karakter khusus HTML agar nilai aman dimasukkan ke dalam markup HTML.
 *
 * Mengubah karakter &, <, >, dan " menjadi entitas HTML yang setara untuk mencegah
 * konten merusak struktur tabel atau menimbulkan injeksi HTML.
 *
 * @param {*} value - Nilai apa pun yang akan dikonversi ke string lalu di-escape.
 * @returns {string} Teks yang sudah aman untuk disisipkan ke dalam HTML.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Mengamankan nilai sel agar tidak diinterpretasikan sebagai formula oleh
 * aplikasi spreadsheet (pencegahan CSV/Excel formula injection).
 *
 * Jika teks diawali karakter =, +, -, atau @, ditambahkan tanda kutip tunggal (')
 * di depannya sehingga dibaca sebagai teks biasa, bukan rumus.
 *
 * @param {*} value - Nilai sel yang akan diperiksa.
 * @returns {string} Teks sel yang aman dari interpretasi formula.
 */
function safeCell(value) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

/**
 * Meng-escape sebuah nilai menjadi field CSV yang valid.
 *
 * Nilai terlebih dahulu diamankan via safeCell(), kemudian dibungkus tanda kutip
 * ganda dan setiap tanda kutip ganda di dalamnya digandakan ("") sesuai aturan CSV.
 *
 * @param {*} value - Nilai sel yang akan diubah menjadi field CSV.
 * @returns {string} Field CSV yang sudah ter-escape dan terbungkus tanda kutip.
 */
function escapeCsv(value) {
  const text = safeCell(value);
  return `"${String(text ?? "").replace(/"/g, '""')}"`;
}

/**
 * Mendeteksi apakah perangkat yang dipakai adalah perangkat mobile.
 *
 * Pemeriksaan dilakukan berdasarkan userAgent (Android/iPhone/iPad/iPod/Mobile).
 * Dipakai untuk memutuskan format unduhan: CSV untuk mobile, .xls untuk desktop.
 *
 * @returns {boolean} true bila terdeteksi perangkat mobile, selain itu false.
 */
function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

/**
 * Memicu proses unduhan sebuah Blob sebagai berkas di browser.
 *
 * Membuat object URL sementara, lalu membuat elemen <a> tersembunyi untuk memicu
 * klik unduhan, kemudian membersihkan elemen dan mencabut object URL setelah jeda
 * singkat untuk mencegah kebocoran memori.
 *
 * @param {Blob} blob - Data berkas yang akan diunduh.
 * @param {string} filename - Nama berkas hasil unduhan.
 * @returns {void}
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

/**
 * Membangun konten CSV lengkap dari konfigurasi judul, ringkasan, kolom, dan baris.
 *
 * Menyusun baris judul, subjudul, blok ringkasan (label/value), baris header kolom,
 * lalu setiap baris data. Nilai kolom dapat berupa fungsi (dipanggil dengan
 * (row, index)) atau nama properti pada objek baris. Diawali BOM ("\ufeff") agar
 * karakter UTF-8 terbaca benar di Excel.
 *
 * @param {Object} config - Konfigurasi pembentukan CSV.
 * @param {string} config.title - Judul yang ditempatkan pada baris pertama.
 * @param {string} config.subtitle - Subjudul opsional pada baris kedua.
 * @param {Array<{label: string, value: *}>} [config.summary=[]] - Daftar item ringkasan.
 * @param {Array<{header: string, value: (Function|string)}>} config.columns - Definisi kolom.
 * @param {Array<Object>} config.rows - Data baris yang akan ditulis.
 * @returns {string} String CSV lengkap (dipisah CRLF) dengan BOM UTF-8.
 */
function buildCsv({ title, subtitle, summary = [], columns, rows }) {
  const lines = [];
  if (title) lines.push([title].map(escapeCsv).join(","));
  if (subtitle) lines.push([subtitle].map(escapeCsv).join(","));
  if (summary.length) {
    lines.push("");
    summary.filter((item) => item && item.label).forEach((item) => {
      lines.push([item.label, item.value].map(escapeCsv).join(","));
    });
  }
  lines.push("");
  lines.push(columns.map((column) => escapeCsv(column.header)).join(","));
  rows.forEach((row, index) => {
    lines.push(columns.map((column) => {
      const value = typeof column.value === "function" ? column.value(row, index) : row[column.value];
      return escapeCsv(value);
    }).join(","));
  });
  return "\ufeff" + lines.join("\r\n");
}

/**
 * Mengekspor data tabel ke berkas Excel (.xls) atau CSV pada perangkat mobile.
 *
 * Pada perangkat desktop, data dirender sebagai dokumen HTML bergaya yang dikenali
 * Excel lalu diunduh sebagai .xls. Pada perangkat mobile (dideteksi via
 * isMobileDevice()), data diekspor sebagai berkas .csv untuk kompatibilitas yang
 * lebih baik. Nilai kolom bisa berupa fungsi (row, index) atau nama properti baris.
 *
 * @param {Object} config - Konfigurasi ekspor.
 * @param {string} config.filename - Nama berkas keluaran (ekstensi .xls/.xlsx akan disesuaikan).
 * @param {string} config.title - Judul dokumen.
 * @param {string} config.subtitle - Subjudul opsional dokumen.
 * @param {Array<{label: string, value: *}>} [config.summary=[]] - Daftar item ringkasan.
 * @param {Array<{header: string, value: (Function|string)}>} config.columns - Definisi kolom.
 * @param {Array<Object>} config.rows - Data baris yang diekspor.
 * @returns {void} Tidak mengembalikan nilai; langsung memicu unduhan berkas.
 */
export function exportExcel({ filename, title, subtitle, summary = [], columns, rows }) {
  const summaryRows = summary
    .filter((item) => item && item.label)
    .map((item) => `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td></tr>`)
    .join("");

  const tableHeader = columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join("");
  const tableRows = rows.map((row, index) => {
    const cells = columns.map((column) => {
      const value = typeof column.value === "function" ? column.value(row, index) : row[column.value];
      return `<td>${escapeHtml(safeCell(value))}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; }
          h1 { font-size: 20px; margin: 0 0 6px; }
          p { margin: 0 0 16px; color: #475569; }
          table { border-collapse: collapse; width: 100%; }
          th { background: #0f172a; color: #ffffff; font-weight: 700; text-align: left; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; }
          .summary { margin: 12px 0 18px; width: auto; }
          .summary th { background: #e2e8f0; color: #0f172a; }
          .summary td { min-width: 120px; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        ${summaryRows ? `<table class="summary">${summaryRows}</table>` : ""}
        <table>
          <thead><tr>${tableHeader}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>`;

  if (isMobileDevice()) {
    const csv = buildCsv({ title, subtitle, summary, columns, rows });
    const csvFilename = filename.replace(/\.(xls|xlsx)$/i, "") + ".csv";
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), csvFilename);
    return;
  }

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}


/**
 * Mengekspor data tabel ke PDF melalui jendela cetak browser.
 *
 * Data dirender sebagai dokumen HTML bergaya cetak, dibuka pada jendela/tab baru,
 * lalu dialog cetak browser dipanggil otomatis (window.print) sehingga pengguna
 * dapat menyimpannya sebagai PDF. Nilai kolom bisa berupa fungsi (row, index) atau
 * nama properti baris. Jika jendela baru gagal dibuka (mis. diblokir popup), fungsi
 * berhenti tanpa melakukan apa-apa.
 *
 * @param {Object} config - Konfigurasi ekspor.
 * @param {string} config.title - Judul dokumen.
 * @param {string} config.subtitle - Subjudul opsional dokumen.
 * @param {Array<{label: string, value: *}>} [config.summary=[]] - Daftar item ringkasan.
 * @param {Array<{header: string, value: (Function|string)}>} config.columns - Definisi kolom.
 * @param {Array<Object>} config.rows - Data baris yang diekspor.
 * @returns {void} Tidak mengembalikan nilai; membuka jendela cetak untuk PDF.
 */
export function exportPdf({ title, subtitle, summary = [], columns, rows }) {
  const summaryRows = summary
    .filter((item) => item && item.label)
    .map((item) => `<tr><th>${escapeHtml(item.label)}</th><td>${escapeHtml(item.value)}</td></tr>`)
    .join("");
  const tableHeader = columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join("");
  const tableRows = rows.map((row, index) => {
    const cells = columns.map((column) => {
      const value = typeof column.value === "function" ? column.value(row, index) : row[column.value];
      return `<td>${escapeHtml(safeCell(value))}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");

  const html = `<!doctype html><html><head><meta charset="UTF-8" /><title>${escapeHtml(title)}</title><style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    p { margin: 0 0 16px; color: #475569; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th { background: #0f172a; color: #fff; text-align: left; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; font-size: 12px; }
    .summary { width: auto; margin-bottom: 18px; }
    .summary th { background: #e2e8f0; color: #0f172a; }
    @media print { body { margin: 18mm; } }
  </style></head><body><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}${summaryRows ? `<table class="summary">${summaryRows}</table>` : ""}<table><thead><tr>${tableHeader}</tr></thead><tbody>${tableRows}</tbody></table><script>window.onload=()=>{window.print();}</script></body></html>`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
