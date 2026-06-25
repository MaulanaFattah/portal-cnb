import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { getPPDB, updatePPDB, deletePPDB, logout, resolveMediaUrl } from "../services/api";

function formatTanggal(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return value;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const STATUS_LABEL = { pending: "Menunggu Verifikasi", diterima: "Diterima", ditolak: "Ditolak" };
const TYPE_LABEL = { pendaftaran_baru: "Pendaftaran Baru", siswa_pindahan: "Siswa Pindahan" };
const LEVEL_LABEL = { tk: "TK", sd: "SD", smp: "SMP" };

function getRequiredDocuments(item) {
  return [
    { key: "berkas_kk", label: "Fotokopi KK", value: resolveMediaUrl(item.berkas_kk), required: true },
    { key: "berkas_raport", label: "Raport Terakhir", value: resolveMediaUrl(item.berkas_raport), required: ["sd", "smp"].includes(item.target_jenjang) },
    { key: "foto_siswa", label: "Foto Calon Siswa", value: resolveMediaUrl(item.foto_siswa), required: true },
    { key: "berkas_surat_pindah", label: "Surat Pindahan", value: resolveMediaUrl(item.berkas_surat_pindah), required: item.jenis_pendaftaran === "siswa_pindahan" }
  ];
}

function getFileType(value) {
  if (!value) return "missing";
  const fileValue = String(value).toLowerCase();
  if (fileValue.startsWith("data:image/") || /\.(jpg|jpeg|png|webp)(\?|#|$)/.test(fileValue)) return "image";
  if (fileValue.startsWith("data:application/pdf") || /\.pdf(\?|#|$)/.test(fileValue)) return "pdf";
  return "file";
}

function DetailField({ label, value }) {
  return (
    <div>
      <strong>{label}</strong>
      <span>{value || "-"}</span>
    </div>
  );
}

function DocumentPreview({ document }) {
  const fileType = getFileType(document.value);
  const available = fileType !== "missing";

  return (
    <article className={`ppdb-document-card ${available ? "available" : "missing"}`}>
      <div className="ppdb-document-card-head">
        <div>
          <h4>{document.label}</h4>
          <p>{document.required ? "Wajib diverifikasi" : "Opsional sesuai kondisi pendaftar"}</p>
        </div>
        <span>{available ? "Ada" : document.required ? "Belum ada" : "Opsional"}</span>
      </div>

      {available ? (
        <>
          <div className="ppdb-document-preview">
            {fileType === "image" && <img src={document.value} alt={`Preview ${document.label}`} />}
            {fileType === "pdf" && <iframe title={`Preview ${document.label}`} src={document.value} />}
            {fileType === "file" && <div className="ppdb-file-placeholder">Preview tidak tersedia</div>}
          </div>
          <a className="ppdb-file-open" href={document.value} target="_blank" rel="noreferrer">Buka berkas di tab baru</a>
        </>
      ) : (
        <p className="ppdb-document-missing">Berkas belum diunggah oleh pendaftar.</p>
      )}
    </article>
  );
}

function PPDBDetailModal({ item, onClose, onVerify, onDelete }) {
  if (!item) return null;

  const documents = getRequiredDocuments(item);
  const completedDocuments = documents.filter((document) => document.value || !document.required).length;

  return (
    <div className="ppdb-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="ppdb-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ppdb-detail-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="ppdb-modal-close" onClick={onClose} aria-label="Tutup detail PPDB">&times;</button>

        <div className="ppdb-modal-header">
          <div>
            <span className="ppdb-modal-eyebrow">Detail Pendaftar PPDB</span>
            <h2 id="ppdb-detail-title">{item.nama_lengkap}</h2>
            <p>{LEVEL_LABEL[item.target_jenjang] || "-"} - {TYPE_LABEL[item.jenis_pendaftaran] || "-"} - Daftar {formatTanggal(item.createdAt)}</p>
          </div>
          <span className={`status-badge ${item.status}`}>{STATUS_LABEL[item.status]}</span>
        </div>

        <div className="ppdb-modal-summary">
          <div>
            <strong>{completedDocuments}/{documents.length}</strong>
            <span>Kelengkapan berkas</span>
          </div>
          <div>
            <strong>{formatTanggal(item.tanggal_lahir)}</strong>
            <span>Tanggal lahir</span>
          </div>
          <div>
            <strong>{item.no_telepon || "-"}</strong>
            <span>WhatsApp wali</span>
          </div>
        </div>

        <div className="ppdb-verify-detail ppdb-modal-grid">
          <DetailField label="Jenis Kelamin" value={item.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"} />
          <DetailField label="Tahun Ajaran" value={item.tahun_ajaran} />
          <DetailField label="Alamat" value={item.alamat} />
          <DetailField label="Orang Tua/Wali" value={item.nama_orang_tua || item.nama_ayah || item.nama_ibu} />
          <DetailField label="No WhatsApp" value={item.no_telepon} />
          <DetailField label="Email" value={item.email} />
          <DetailField label="Catatan Notifikasi" value={item.notification_note || "Belum ada"} />
        </div>

        <div className="ppdb-document-section">
          <div className="ppdb-section-title">
            <h3>Berkas Pendaftaran</h3>
            <p>Cek isi file sebelum mengubah status verifikasi.</p>
          </div>
          <div className="ppdb-document-grid">
            {documents.map((document) => <DocumentPreview key={document.key} document={document} />)}
          </div>
        </div>

        <div className="ppdb-modal-actions ppdb-verify-actions">
          <button className="verify-accept" disabled={item.status === "diterima"} onClick={() => onVerify(item, "diterima")}>Terima</button>
          <button className="verify-reject" disabled={item.status === "ditolak"} onClick={() => onVerify(item, "ditolak")}>Tolak</button>
          <button className="verify-pending" disabled={item.status === "pending"} onClick={() => onVerify(item, "pending")}>Set Pending</button>
          <button className="verify-delete" onClick={() => onDelete(item.id)}>Hapus</button>
        </div>
      </section>
    </div>
  );
}

function AdminPPDB() {
  const navigate = useNavigate();
  const [ppdb, setPPDB] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedPPDB, setSelectedPPDB] = useState(null);

  const loadPPDB = async () => {
    const result = await getPPDB();
    if (result.success) setPPDB(result.data || []);
  };

  useEffect(() => { (async () => { await loadPPDB(); })(); }, []);

  const handleVerify = async (item, status) => {
    let notification_note = "Menunggu verifikasi admin.";

    if (status === "diterima") {
      notification_note = "Diterima. Nama calon siswa otomatis masuk ke Pengumuman PPDB di Beranda. Calon siswa diminta datang ke sekolah untuk pendaftaran ulang.";
    }

    if (status === "ditolak") {
      const reason = prompt("Tuliskan alasan penolakan. Catatan ini akan tampil ke pendaftar saat mengecek status PPDB:");
      if (reason === null) return;
      if (!reason.trim()) {
        alert("Alasan penolakan wajib diisi.");
        return;
      }
      notification_note = `Berkas pendaftaran belum dapat diterima. Alasan: ${reason.trim()}`;
    }

    const result = await updatePPDB(item.id, { status, notification_note });
    alert(status === "diterima"
      ? `${result.message}\n\nPengumuman PPDB otomatis diperbarui di Beranda. Semua nama siswa yang diterima akan tercantum dan diminta datang ke sekolah untuk pendaftaran ulang.`
      : status === "ditolak"
        ? `${result.message}\n\nPendaftar dapat melihat status & alasan penolakan melalui menu "Cek Status Pendaftaran" di halaman PPDB.`
        : result.message);
    setSelectedPPDB(null);
    loadPPDB();
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus data pendaftar ini secara permanen?")) return;
    const result = await deletePPDB(id);
    alert(result.message);
    setSelectedPPDB(null);
    loadPPDB();
  };

  const handleLogout = () => { logout(); navigate("/admin-login"); };

  const counts = {
    all: ppdb.length,
    pending: ppdb.filter((p) => p.status === "pending").length,
    diterima: ppdb.filter((p) => p.status === "diterima").length,
    ditolak: ppdb.filter((p) => p.status === "ditolak").length
  };
  const filtered = filter === "all" ? ppdb : ppdb.filter((p) => p.status === filter);

  return (
    <div className="dashboard-layout">
      <AdminSidebar active="/admin/ppdb" />

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Verifikasi PPDB</h1>
            <p>Data pendaftar masuk dari halaman form PPDB dan diverifikasi admin.</p>
          </div>
          <div className="dashboard-actions">
            <Link to="/form-ppdb" className="btn secondary">Lihat Form</Link>
            <button onClick={handleLogout} className="btn primary">Keluar</button>
          </div>
        </div>

        <div className="ppdb-filter">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Semua ({counts.all})</button>
          <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Menunggu ({counts.pending})</button>
          <button className={filter === "diterima" ? "active" : ""} onClick={() => setFilter("diterima")}>Diterima ({counts.diterima})</button>
          <button className={filter === "ditolak" ? "active" : ""} onClick={() => setFilter("ditolak")}>Ditolak ({counts.ditolak})</button>
        </div>

        <div className="ppdb-verify-list">
          {filtered.length === 0 ? <p className="empty-text">Belum ada pendaftar pada kategori ini.</p> : filtered.map((item) => (
            <div className="ppdb-verify-item" key={item.id}>
              <div className="ppdb-verify-head">
                <div>
                  <h4>{item.nama_lengkap}</h4>
                  <p>{LEVEL_LABEL[item.target_jenjang] || "-"} - {TYPE_LABEL[item.jenis_pendaftaran] || "-"} - Daftar {formatTanggal(item.createdAt)}</p>
                </div>
                <div className="ppdb-verify-meta">
                  <span className={`status-badge ${item.status}`}>{STATUS_LABEL[item.status]}</span>
                  <button type="button" className="ppdb-detail-button" onClick={() => setSelectedPPDB(item)}>Detail & Berkas</button>
                </div>
              </div>

              <div className="ppdb-document-summary" aria-label="Ringkasan kelengkapan berkas">
                {getRequiredDocuments(item).map((document) => (
                  <span key={document.key} className={document.value ? "ready" : document.required ? "missing" : "optional"}>
                    {document.label}: {document.value ? "Ada" : document.required ? "Belum ada" : "Opsional"}
                  </span>
                ))}
              </div>

              <div className="ppdb-verify-actions">
                <button className="verify-accept" disabled={item.status === "diterima"} onClick={() => handleVerify(item, "diterima")}>Terima</button>
                <button className="verify-reject" disabled={item.status === "ditolak"} onClick={() => handleVerify(item, "ditolak")}>Tolak</button>
                <button className="verify-pending" disabled={item.status === "pending"} onClick={() => handleVerify(item, "pending")}>Set Pending</button>
                <button className="verify-delete" onClick={() => handleDelete(item.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>

        <PPDBDetailModal item={selectedPPDB} onClose={() => setSelectedPPDB(null)} onVerify={handleVerify} onDelete={handleDelete} />
      </main>
    </div>
  );
}

export default AdminPPDB;
