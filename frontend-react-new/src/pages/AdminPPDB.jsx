import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPPDB, updatePPDB, deletePPDB, logout } from "../services/api";

function formatTanggal(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date)) return value;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

const STATUS_LABEL = {
  pending: "Menunggu Verifikasi",
  diterima: "Diterima",
  ditolak: "Ditolak"
};

function AdminPPDB() {
  const navigate = useNavigate();
  const [ppdb, setPPDB] = useState([]);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  const loadPPDB = async () => {
    const result = await getPPDB();
    if (result.success) setPPDB(result.data || []);
  };

  useEffect(() => {
    (async () => {
      await loadPPDB();
    })();
  }, []);

  const handleVerify = async (id, status) => {
    const result = await updatePPDB(id, { status });
    alert(result.message);
    loadPPDB();
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus data pendaftar ini secara permanen?")) return;
    const result = await deletePPDB(id);
    alert(result.message);
    loadPPDB();
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  const counts = {
    all: ppdb.length,
    pending: ppdb.filter((p) => p.status === "pending").length,
    diterima: ppdb.filter((p) => p.status === "diterima").length,
    ditolak: ppdb.filter((p) => p.status === "ditolak").length
  };

  const filtered = filter === "all" ? ppdb : ppdb.filter((p) => p.status === filter);

  return (
    <div className="dashboard-layout">
      <aside className="admin-sidebar-card">
        <span className="sidebar-title">Dashboard</span>
        <h3>Admin</h3>

        <nav className="admin-menu">
          <Link to="/dashboard-admin">Dashboard</Link>
          <Link to="/admin/kegiatan">Kegiatan</Link>
          <Link to="/admin/pengumuman">Pengumuman</Link>
          <Link to="/admin/galeri">Galeri</Link>
          <Link className="active" to="/admin/ppdb">PPDB</Link>
          <Link to="/admin/guru">Guru</Link>
          <Link to="/admin/kepala-sekolah">Kepala Sekolah</Link>
          <Link to="/admin/kelas">Kelas</Link>
          <Link to="/admin/siswa">Siswa</Link>
          <Link to="/admin/akun-siswa">Akun Siswa</Link>
          <Link to="/admin/profil-sekolah">Profil Sekolah</Link>
        </nav>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Verifikasi PPDB</h1>
            <p>Tinjau dan verifikasi data calon peserta didik yang telah mendaftar.</p>
          </div>

          <div className="dashboard-actions">
            <Link to="/" className="btn secondary">Website</Link>
            <button onClick={handleLogout} className="btn primary">Logout</button>
          </div>
        </div>

        <div className="ppdb-filter">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Semua ({counts.all})</button>
          <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Menunggu ({counts.pending})</button>
          <button className={filter === "diterima" ? "active" : ""} onClick={() => setFilter("diterima")}>Diterima ({counts.diterima})</button>
          <button className={filter === "ditolak" ? "active" : ""} onClick={() => setFilter("ditolak")}>Ditolak ({counts.ditolak})</button>
        </div>

        <div className="ppdb-verify-list">
          {filtered.length === 0 ? (
            <p className="empty-text">Belum ada pendaftar pada kategori ini.</p>
          ) : (
            filtered.map((item) => (
              <div className="ppdb-verify-item" key={item.id}>
                <div className="ppdb-verify-head" onClick={() => setOpenId(openId === item.id ? null : item.id)}>
                  <div>
                    <h4>{item.nama_lengkap}</h4>
                    <p>NISN: {item.nisn || "-"} • {item.tahun_ajaran} • Daftar {formatTanggal(item.createdAt)}</p>
                  </div>
                  <span className={`status-badge ${item.status}`}>{STATUS_LABEL[item.status]}</span>
                </div>

                {openId === item.id && (
                  <div className="ppdb-verify-detail">
                    <div><strong>Jenis Kelamin</strong><span>{item.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</span></div>
                    <div><strong>Tempat, Tgl Lahir</strong><span>{item.tempat_lahir}, {formatTanggal(item.tanggal_lahir)}</span></div>
                    <div><strong>Agama</strong><span>{item.agama}</span></div>
                    <div><strong>Asal Sekolah</strong><span>{item.asal_sekolah || "-"}</span></div>
                    <div><strong>Alamat</strong><span>{item.alamat}</span></div>
                    <div><strong>Nama Ayah</strong><span>{item.nama_ayah} ({item.pekerjaan_ayah || "-"})</span></div>
                    <div><strong>Nama Ibu</strong><span>{item.nama_ibu} ({item.pekerjaan_ibu || "-"})</span></div>
                    <div><strong>No WhatsApp</strong><span>{item.no_telepon}</span></div>
                    <div><strong>Email</strong><span>{item.email || "-"}</span></div>
                  </div>
                )}

                <div className="ppdb-verify-actions">
                  <button className="verify-accept" disabled={item.status === "diterima"} onClick={() => handleVerify(item.id, "diterima")}>Terima</button>
                  <button className="verify-reject" disabled={item.status === "ditolak"} onClick={() => handleVerify(item.id, "ditolak")}>Tolak</button>
                  <button className="verify-pending" disabled={item.status === "pending"} onClick={() => handleVerify(item.id, "pending")}>Set Pending</button>
                  <button className="verify-delete" onClick={() => handleDelete(item.id)}>Hapus</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminPPDB;
