import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getKepalaSekolahDashboard,
  logout
} from "../services/api";
import { exportExcel, exportPdf } from "../utils/exportExcel";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dasbor" },
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
        navigate("/login-kepala-sekolah");
        return;
      }

      setDashboard(result.data);
      setLoading(false);
    };

    load();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login-kepala-sekolah");
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

  const buildExportPayload = () => ({
    title: "Rekapitulasi Absensi Sekolah",
    subtitle: `Periode ${filter.dari || "awal"} sampai ${filter.sampai || "akhir"}`,
    summary: [
      { label: "Hadir", value: dashboard.absensi?.summary?.hadir || 0 },
      { label: "Izin", value: dashboard.absensi?.summary?.izin || 0 },
      { label: "Sakit", value: dashboard.absensi?.summary?.sakit || 0 },
      { label: "Alpha", value: dashboard.absensi?.summary?.alpha || 0 },
      { label: "Total", value: dashboard.absensi?.summary?.total || 0 }
    ],
    columns: [
      { header: "No", value: (_row, index) => index + 1 },
      { header: "Tanggal", value: (row) => formatDate(row.tanggal) },
      { header: "Nama Siswa", value: (row) => row.siswa?.nama || "-" },
      { header: "Kelas", value: (row) => row.kelas?.nama_kelas || "-" },
      { header: "Mapel", value: (row) => row.mapel || "Wali Kelas" },
      { header: "Status", value: (row) => row.status?.toUpperCase() || "-" },
      { header: "Keterangan", value: (row) => row.keterangan || "-" }
    ],
    rows: dashboard?.absensi?.rows || []
  });

  const exportRekap = () => {
    const payload = buildExportPayload();
    if (!payload.rows.length) return;
    getKepalaSekolahDashboard({ ...filter, export_type: "excel" });
    exportExcel({ filename: `rekapitulasi-sekolah-${filter.dari}-${filter.sampai}.xls`, ...payload });
  };

  const exportRekapPdf = () => {
    const payload = buildExportPayload();
    if (!payload.rows.length) return;
    getKepalaSekolahDashboard({ ...filter, export_type: "pdf" });
    exportPdf(payload);
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
  const monitoring = dashboard.monitoring || {};
  const scopeLabel = dashboard.scopeJenjang ? dashboard.scopeJenjang.toUpperCase() : "Semua Jenjang";

  const renderProfil = () => {
    const principalDetails = [
      ["Nama", kepala?.nama || dashboard.user?.name],
      ["NIP", kepala?.nip || "-"],
      ["Jenjang Akses", scopeLabel],
      ["Jabatan", "Kepala Sekolah"],
      ["No. HP", kepala?.no_telepon || "-"],
      ["Email", kepala?.email || dashboard.user?.email],
      ["Alamat", kepala?.alamat || "-"]
    ];

    return (
    <section className="teacher-panel principal-panel">
      <div className="teacher-panel-header principal-hero compact">
        <span>Dasbor</span>
        <h1>Monitoring Kepala Sekolah</h1>
        <p>Pantau ringkasan guru, siswa, kelas, dan rekap absensi untuk jenjang {scopeLabel}.</p>
      </div>

      <div className="principal-stat-grid">
        <div className="principal-stat-card"><span>Jumlah Siswa</span><strong>{monitoring.totalSiswa || 0}</strong><small>Siswa aktif sesuai jenjang</small></div>
        <div className="principal-stat-card"><span>Guru Wali Kelas</span><strong>{monitoring.totalGuruWaliKelas || 0}</strong><small>Guru wali dalam cakupan</small></div>
        <div className="principal-stat-card"><span>Guru Mapel</span><strong>{monitoring.totalGuruMapel || 0}</strong><small>Pengajar mata pelajaran</small></div>
        <div className="principal-stat-card"><span>Data Kelas</span><strong>{monitoring.totalKelas || 0}</strong><small>Kelas terdaftar</small></div>
        <div className="principal-stat-card alert"><span>Absensi Tercatat</span><strong>{absensi.summary.total || 0}</strong><small>Total data absensi</small></div>
      </div>

      <div className="principal-profile-card">
        <div className="principal-profile-summary">
          <div className="principal-avatar">
            {kepala?.foto ? <img src={kepala.foto} alt="Foto kepala sekolah" /> : <span>{(kepala?.nama || dashboard.user?.name || "K").slice(0, 1)}</span>}
          </div>
          <div>
            <span className="principal-role-chip">Monitoring {scopeLabel}</span>
            <h2>{kepala?.nama || dashboard.user?.name}</h2>
            <p>Kepala Sekolah</p>
          </div>
        </div>

        <div className="principal-detail-grid">
          {principalDetails.map(([label, value]) => (
            <div className={label === "Alamat" ? "wide" : ""} key={label}>
              <span>{label}</span>
              <strong>{value || "-"}</strong>
            </div>
          ))}
        </div>

        <p className="principal-note">Akun ini hanya untuk monitoring. Perubahan data utama tetap dilakukan oleh admin.</p>
      </div>

      <div className="teacher-grid two-columns lower-grid principal-feed-grid">
        <article className="teacher-card principal-feed-card">
          <h3>Pengumuman Terbaru</h3>
          {(dashboard.pengumuman || []).length === 0 ? <p className="teacher-empty">Belum ada pengumuman.</p> : (
            <div className="teacher-announcement-list">
              {dashboard.pengumuman.map((item) => (
                <div className="teacher-announcement" key={item.id}>
                  <span>{formatDate(item.date)}</span>
                  <strong>{item.title}</strong>
                  <p>{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="teacher-card principal-feed-card">
          <h3>Kegiatan Sekolah</h3>
          {(dashboard.kegiatan || []).length === 0 ? <p className="teacher-empty">Belum ada kegiatan tampil.</p> : (
            <div className="teacher-announcement-list">
              {dashboard.kegiatan.map((item) => (
                <div className="teacher-announcement" key={item.id}>
                  <span>{formatDate(item.date)}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
    );
  };

  const renderDataGuru = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Data Pegawai</span>
        <h1>Data Guru</h1>
          <p>Daftar guru yang sesuai dengan jenjang akses kepala sekolah.</p>
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
          <p>Daftar siswa yang sesuai dengan jenjang akses kepala sekolah.</p>
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
    <section className="teacher-panel principal-panel principal-recap-panel">
      <div className="teacher-panel-header principal-hero compact">
        <span>Rekapitulasi</span>
        <h1>Rekapitulasi Absensi Sekolah</h1>
        <p>Filter data absensi berdasarkan kelas dan periode agar laporan lebih mudah dibaca.</p>
      </div>

      <div className="principal-filter-card">
        <div className="principal-filter-grid">
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
        </div>
        <div className="principal-filter-actions">
          <button type="button" className="teacher-primary" onClick={loadRekap} disabled={rekapLoading}>{rekapLoading ? "Memuat..." : "Tampilkan"}</button>
          <button type="button" className="teacher-secondary" onClick={exportRekap} disabled={!absensi.rows.length}>Ekspor Excel</button>
          <button type="button" className="teacher-secondary" onClick={exportRekapPdf} disabled={!absensi.rows.length}>Ekspor PDF</button>
        </div>
      </div>

      <div className="principal-attend-cards">
        <div className="attend-card hadir"><span>Hadir</span><strong>{absensi.summary.hadir}</strong><small>Siswa tercatat hadir</small></div>
        <div className="attend-card tidak"><span>Tidak Hadir</span><strong>{absensi.summary.tidak_hadir}</strong><small>Total izin, sakit, dan alpha</small></div>
        <div className="attend-card keterangan"><span>Keterangan</span><strong>Izin {absensi.summary.izin} • Sakit {absensi.summary.sakit} • Alpha {absensi.summary.alpha}</strong></div>
      </div>

      <div className="teacher-table-wrap principal-table-wrap">
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
        <button type="button" onClick={handleLogout} className="teacher-logout">Keluar</button>
      </header>

      <div className="teacher-layout">
        <aside className="teacher-sidebar">
          <div className="teacher-avatar"><span>{dashboard.user?.name?.slice(0, 1) || "K"}</span></div>
          <h2>{dashboard.user?.name}</h2>
          <p>Kepala Sekolah</p>
          <span className="teacher-role-pill">Monitoring {scopeLabel}</span>

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
