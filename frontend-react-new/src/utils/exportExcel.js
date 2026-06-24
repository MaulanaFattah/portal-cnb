function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeCell(value) {
  const text = String(value ?? "");
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function escapeCsv(value) {
  const text = safeCell(value);
  return `"${String(text ?? "").replace(/"/g, '""')}"`;
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

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
