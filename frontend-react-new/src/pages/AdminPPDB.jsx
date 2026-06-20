import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import { getPPDB, updatePPDB, deletePPDB, logout } from "../services/api";

function formatTanggal(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return value;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const STATUS_LABEL = { pending: "Menunggu Verifikasi", diterima: "Diterima", ditolak: "Ditolak" };
const TYPE_LABEL = { pendaftaran_baru: "Pendaftaran Baru", siswa_pindahan: "Siswa Pindahan" };
const LEVEL_LABEL = { tk: "TK", sd: "SD", smp: "SMP" };

function FileLink({ label, value }) {
  return (
    <div>
      <strong>{label}</strong>
      {value ? <a href={value} target="_blank" rel="noreferrer">Lihat berkas</a> : <span>-</span>}
    </div>
  );
}

function AdminPPDB() {
  const navigate = useNavigate();
  const [ppdb, setPPDB] = useState([]);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  const loadPPDB = async () => {
    const result = await getPPDB();
    if (result.success) setPPDB(result.data || []);
  };

  useEffect(() => { (async () => { await loadPPDB(); })(); }, []);

  const handleVerify = async (item, status) => {
    const notification_note = status === "diterima"
      ? `Diterima. Pengumuman otomatis dibuat di Beranda. Hubungi orang tua/wali melalui email ${item.email || "-"} atau WhatsApp ${item.no_telepon || "-"}.`
      : status === "ditolak"
        ? `Ditolak. Beri tahu orang tua/wali melalui email ${item.email || "-"} atau WhatsApp ${item.no_telepon || "-"}.`
        : "Menunggu verifikasi admin.";
    const result = await updatePPDB(item.id, { status, notification_note });
    alert(status === "diterima" ? `${result.message}\n\nPengumuman penerimaan otomatis dibuat di Beranda.` : result.message);
    loadPPDB();
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus data pendaftar ini secara permanen?")) return;
    const result = await deletePPDB(id);
    alert(result.message);
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
              <div className="ppdb-verify-head" onClick={() => setOpenId(openId === item.id ? null : item.id)}>
                <div>
                  <h4>{item.nama_lengkap}</h4>
                  <p>{LEVEL_LABEL[item.target_jenjang] || "-"} • {TYPE_LABEL[item.jenis_pendaftaran] || "-"} • Daftar {formatTanggal(item.createdAt)}</p>
                </div>
                <span className={`status-badge ${item.status}`}>{STATUS_LABEL[item.status]}</span>
              </div>

              {openId === item.id && (
                <div className="ppdb-verify-detail">
                  <div><strong>Jenis Kelamin</strong><span>{item.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</span></div>
                  <div><strong>Tanggal Lahir</strong><span>{formatTanggal(item.tanggal_lahir)}</span></div>
                  <div><strong>Alamat</strong><span>{item.alamat}</span></div>
                  <div><strong>Orang Tua/Wali</strong><span>{item.nama_orang_tua || item.nama_ayah || item.nama_ibu || "-"}</span></div>
                  <div><strong>No WhatsApp</strong><span>{item.no_telepon}</span></div>
                  <div><strong>Email</strong><span>{item.email || "-"}</span></div>
                  <FileLink label="Fotokopi KK" value={item.berkas_kk} />
                  <FileLink label="Raport Terakhir" value={item.berkas_raport} />
                  <FileLink label="Foto Calon Siswa" value={item.foto_siswa} />
                  <FileLink label="Surat Pindahan" value={item.berkas_surat_pindah} />
                  <div><strong>Catatan Notifikasi</strong><span>{item.notification_note || "Belum ada"}</span></div>
                </div>
              )}

              <div className="ppdb-verify-actions">
                <button className="verify-accept" disabled={item.status === "diterima"} onClick={() => handleVerify(item, "diterima")}>Terima</button>
                <button className="verify-reject" disabled={item.status === "ditolak"} onClick={() => handleVerify(item, "ditolak")}>Tolak</button>
                <button className="verify-pending" disabled={item.status === "pending"} onClick={() => handleVerify(item, "pending")}>Set Pending</button>
                <button className="verify-delete" onClick={() => handleDelete(item.id)}>Hapus</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default AdminPPDB;
