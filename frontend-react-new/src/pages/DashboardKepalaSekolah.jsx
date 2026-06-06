import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getKepalaSekolahDashboard,
  logout
} from "../services/api";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "guru", label: "Data Guru" },
  { id: "siswa", label: "Data Siswa" },
  { id: "rekap", label: "Rekapitulasi Absensi" }
];

const emptySummary = { hadir: 0, tidak_hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function statusClass(status) {
  return `attend-status attend-${status}`;
}

function csvSafe(value) {
  return `"${String(value || "").replace(/"/g, '""')}"`;
}

function DashboardKepalaSekolah() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [filter, setFilter] = useState({ kelas_id: "", dari: firstDayOfMonthISO(), sampai: todayISO() });

  useEffect(() => {
    const load = async () => {
      const result = await getKepalaSekolahDashboard();
      if (!result.success) {
        alert(result.message || "Gagal membuka dashboard kepala sekolah");
        navigate("/admin-login");
        return;
      }

      setDashboard(result.data);
      setLoading(false);
    };

    load();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilter((previous) => ({ ...previous, [name]: value }));
  };

  const loadRekap = async () => {
    setRekapLoading(true);
    setNotice(null);
    const result = await getKepalaSekolahDashboard(filter);
    setRekapLoading(false);

    if (!result.success) {
      setNotice({ type: "error", text: result.message });
      return;
    }

    setDashboard((previous) => ({
      ...previous,
      absensi: result.data.absensi
    }));
  };

  const exportRekap = () => {
    const rows = dashboard?.absensi?.rows || [];
    if (!rows.length) return;

    const header = ["Tanggal", "Nama Siswa", "Kelas", "Mapel", "Status", "Keterangan"];
    const csvRows = rows.map((row) => [
      row.tanggal,
      row.siswa?.nama,
      row.kelas?.nama_kelas,
      row.mapel || "Wali Kelas",
      row.status,
      row.keterangan
    ]);
    const csv = [header, ...csvRows].map((row) => row.map(csvSafe).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rekapitulasi-sekolah-${filter.dari}-${filter.sampai}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="teacher-loading">
        <div>
          <span>CNB</span>
          <p>Memuat dashboard kepala sekolah...</p>
        </div>
      </main>
    );
  }

  if (!dashboard) return null;

  const kepala = dashboard.kepalaSekolah;
  const absensi = dashboard.absensi || { summary: emptySummary, rows: [] };

  const renderProfil = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Profil Utama</span>
        <h1>Profil Kepala Sekolah</h1>
        <p>Data profil kepala sekolah yang sedang menjabat.</p>
      </div>

      <div className="profile-layout">
        <div className="profile-photo-card">
          <div className="profile-photo">
            {kepala?.foto ? <img src={kepala.foto} alt="Foto kepala sekolah" /> : <span>Foto</span>}
          </div>
        </div>
        <div className="profile-readonly">
          <div><span>Nama</span><strong>{kepala?.nama || dashboard.user?.name}</strong></div>
          <div><span>NIP</span><strong>{kepala?.nip || "-"}</strong></div>
          <div><span>Jabatan</span><strong>Kepala Sekolah</strong></div>
          <div><span>No. HP</span><strong>{kepala?.no_telepon || "-"}</strong></div>
          <div><span>Alamat</span><strong>{kepala?.alamat || "-"}</strong></div>
          <div><span>Email</span><strong>{kepala?.email || dashboard.user?.email}</strong></div>
          <div className="teacher-actions-row">
            <button type="button" className="teacher-primary" onClick={() => navigate("/dashboard-admin")}>Edit di Admin Panel</button>
          </div>
        </div>
      </div>
    </section>
  );

  const renderDataGuru = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Data Pegawai</span>
        <h1>Data Guru</h1>
        <p>Daftar seluruh guru yang terdaftar dalam sistem.</p>
      </div>

      <div className="teacher-table-wrap">
        <table className="teacher-table">
          <thead>
            <tr><th>No</th><th>Nama</th><th>Jenis Kelamin</th><th>No. HP</th><th>Pendidikan</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(dashboard.guru || []).length === 0 ? (
              <tr><td colSpan="6" className="teacher-empty-cell">Belum ada data guru.</td></tr>
            ) : dashboard.guru.map((guru, index) => (
              <tr key={guru.id}>
                <td>{index + 1}</td>
                <td>{guru.nama}</td>
                <td>{guru.jenis_kelamin === "P" ? "Perempuan" : guru.jenis_kelamin === "L" ? "Laki-laki" : "-"}</td>
                <td>{guru.no_telepon || "-"}</td>
                <td>{guru.pendidikan_terakhir || "-"}</td>
                <td><span className={guru.status === "aktif" ? "teacher-badge active" : "teacher-badge"}>{guru.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderDataSiswa = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Data Murid</span>
        <h1>Data Siswa</h1>
        <p>Daftar seluruh siswa yang terdaftar dalam sistem.</p>
      </div>

      <div className="teacher-table-wrap">
        <table className="teacher-table">
          <thead>
            <tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th>Kelas</th><th>Jenis Kelamin</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(dashboard.siswa || []).length === 0 ? (
              <tr><td colSpan="6" className="teacher-empty-cell">Belum ada data siswa.</td></tr>
            ) : dashboard.siswa.map((siswa, index) => (
              <tr key={siswa.id}>
                <td>{index + 1}</td>
                <td>{siswa.nisn}</td>
                <td>{siswa.nama}</td>
                <td>{siswa.kelas?.nama_kelas || "-"}</td>
                <td>{siswa.jenis_kelamin === "P" ? "Perempuan" : siswa.jenis_kelamin === "L" ? "Laki-laki" : "-"}</td>
                <td><span className={siswa.status === "aktif" ? "teacher-badge active" : "teacher-badge"}>{siswa.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderRekap = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Rekapitulasi</span>
        <h1>Rekapitulasi Absensi Sekolah</h1>
        <p>Lihat rekapitulasi kehadiran seluruh siswa atau berdasarkan kelas.</p>
      </div>

      <div className="teacher-form-grid four-columns">
        <label className="teacher-field">Kelas
          <select name="kelas_id" value={filter.kelas_id} onChange={handleFilterChange}>
            <option value="">Semua Kelas</option>
            {(dashboard.kelas || []).map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama_kelas}</option>)}
          </select>
        </label>
        <label className="teacher-field">Dari
          <input type="date" name="dari" value={filter.dari} onChange={handleFilterChange} />
        </label>
        <label className="teacher-field">Sampai
          <input type="date" name="sampai" value={filter.sampai} onChange={handleFilterChange} />
        </label>
        <div className="teacher-actions-row action-height" style={{ alignItems: "flex-end", paddingBottom: "2px" }}>
          <button type="button" className="teacher-primary" onClick={loadRekap} disabled={rekapLoading}>{rekapLoading ? "Memuat..." : "Tampilkan"}</button>
          <button type="button" className="teacher-secondary" onClick={exportRekap} disabled={!absensi.rows.length}>Export</button>
        </div>
      </div>

      <div className="attend-cards">
        <div className="attend-card hadir"><span>HADIR</span><strong>{absensi.summary.hadir}</strong></div>
        <div className="attend-card tidak"><span>TIDAK HADIR</span><strong>{absensi.summary.tidak_hadir}</strong></div>
        <div className="attend-card keterangan"><span>KETERANGAN</span><strong>IZIN {absensi.summary.izin} • SAKIT {absensi.summary.sakit} • ALPHA {absensi.summary.alpha}</strong></div>
      </div>

      <div className="teacher-table-wrap">
        <table className="teacher-table">
          <thead>
            <tr><th>No</th><th>Tanggal</th><th>Siswa</th><th>Kelas</th><th>Mapel</th><th>Status</th><th>Keterangan</th></tr>
          </thead>
          <tbody>
            {!absensi.rows.length ? (
              <tr><td colSpan="7" className="teacher-empty-cell">Belum ada data rekap pada filter ini.</td></tr>
            ) : absensi.rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{formatDate(row.tanggal)}</td>
                <td>{row.siswa?.nama || "-"}</td>
                <td>{row.kelas?.nama_kelas || "-"}</td>
                <td>{row.mapel || "Wali Kelas"}</td>
                <td><span className={statusClass(row.status)}>{row.status.toUpperCase()}</span></td>
                <td>{row.keterangan || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderActivePanel = () => {
    if (activeMenu === "guru") return renderDataGuru();
    if (activeMenu === "siswa") return renderDataSiswa();
    if (activeMenu === "rekap") return renderRekap();
    return renderProfil();
  };

  return (
    <div className="teacher-shell">
      <header className="teacher-topbar">
        <div className="teacher-brand">
          <span>CNB</span>
          <div>
            <strong>Portal Kepala Sekolah</strong>
            <small>Sistem Informasi Sekolah</small>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="teacher-logout">Logout</button>
      </header>

      <div className="teacher-layout">
        <aside className="teacher-sidebar">
          <div className="teacher-avatar"><span>{dashboard.user?.name?.slice(0, 1) || "K"}</span></div>
          <h2>{dashboard.user?.name}</h2>
          <p>Kepala Sekolah</p>
          <span className="teacher-role-pill">Administrator Utama</span>

          <nav className="teacher-menu" aria-label="Menu dashboard kepala sekolah">
            {MENU_ITEMS.map((item) => (
              <button type="button" key={item.id} className={activeMenu === item.id ? "active" : ""} onClick={() => setActiveMenu(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="teacher-main">
          {notice && <div className={`teacher-notice ${notice.type}`}>{notice.text}</div>}
          {renderActivePanel()}
        </main>
      </div>
    </div>
  );
}

export default DashboardKepalaSekolah;
