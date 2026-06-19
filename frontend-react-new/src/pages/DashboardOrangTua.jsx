import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getOrangTuaAbsensi,
  getOrangTuaDashboard,
  logout,
  updateOrangTuaProfile
} from "../services/api";
import { exportExcel } from "../utils/exportExcel";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "data-siswa", label: "Data Siswa" },
  { id: "kehadiran", label: "Kehadiran Siswa" }
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

function groupByDate(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.tanggal)) map.set(row.tanggal, []);
    map.get(row.tanggal).push(row);
  });
  return [...map.entries()].map(([tanggal, items]) => ({ tanggal, items }));
}

function DashboardOrangTua() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", no_telepon: "", alamat: "", email: "" });
  const [absensi, setAbsensi] = useState({ summary: emptySummary, rows: [] });
  const [absensiLoading, setAbsensiLoading] = useState(false);
  const [filter, setFilter] = useState({ dari: firstDayOfMonthISO(), sampai: todayISO() });

  useEffect(() => {
    const load = async () => {
      const result = await getOrangTuaDashboard();
      if (!result.success) {
        alert(result.message || "Gagal membuka dashboard orang tua");
        navigate("/login-orangtua");
        return;
      }

      const data = result.data;
      setDashboard(data);
      setProfileForm({
        name: data.user?.name || "",
        no_telepon: data.siswa?.no_telepon || "",
        alamat: data.siswa?.alamat || "",
        email: data.user?.email || ""
      });
      setLoading(false);
    };

    load();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login-orangtua");
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setNotice(null);

    const result = await updateOrangTuaProfile(profileForm);
    setSavingProfile(false);
    setNotice({ type: result.success ? "success" : "error", text: result.message });
    if (result.success) {
      setEditing(false);
      setDashboard((previous) => ({
        ...previous,
        user: result.data.user,
        siswa: result.data.siswa
      }));
    }
  };

  const loadAbsensi = async () => {
    setAbsensiLoading(true);
    setNotice(null);
    const result = await getOrangTuaAbsensi(filter);
    setAbsensiLoading(false);
    if (!result.success) {
      setNotice({ type: "error", text: result.message });
      return;
    }
    setAbsensi(result.data || { summary: emptySummary, rows: [] });
  };

  const exportAbsensi = () => {
    if (!absensi.rows.length) return;
    exportExcel({
      filename: `absensi-anak-${filter.dari}-${filter.sampai}.xls`,
      title: "Absensi Utama Anak",
      subtitle: `${siswa?.nama || "Anak"} • Guru Wali Kelas • ${filter.dari} sampai ${filter.sampai}`,
      summary: [
        { label: "Hadir", value: absensi.summary.hadir || 0 },
        { label: "Izin", value: absensi.summary.izin || 0 },
        { label: "Sakit", value: absensi.summary.sakit || 0 },
        { label: "Alpha", value: absensi.summary.alpha || 0 },
        { label: "Total", value: absensi.summary.total || 0 }
      ],
      columns: [
        { header: "No", value: (_row, index) => index + 1 },
        { header: "Tanggal", value: (row) => formatDate(row.tanggal) },
        { header: "Sumber", value: () => "Absensi utama wali kelas" },
        { header: "Guru Wali Kelas", value: (row) => row.guru?.name || "-" },
        { header: "Status", value: (row) => row.status?.toUpperCase() || "-" },
        { header: "Keterangan", value: (row) => row.keterangan || "-" }
      ],
      rows: absensi.rows
    });
  };

  const groupedAbsensi = useMemo(() => groupByDate(absensi.rows), [absensi.rows]);

  if (loading) {
    return (
      <main className="teacher-loading">
        <div>
          <span>CNB</span>
          <p>Memuat dashboard orang tua...</p>
        </div>
      </main>
    );
  }

  if (!dashboard) return null;

  const info = dashboard.informasiSekolah;
  const announcements = dashboard.pengumumanTerbaru || [];
  const siswa = dashboard.siswa;

  const renderDashboard = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header">
        <span>Dashboard</span>
        <h1>Informasi Sekolah</h1>
        <p>Pantau perkembangan anak dan informasi terbaru dari sekolah.</p>
      </div>

      <div className="teacher-grid two-columns">
        <article className="teacher-card">
          <div className="teacher-card-title">
            <span>Profil Orang Tua</span>
            <strong>{siswa?.kelas?.nama_kelas || "Kelas -"}</strong>
          </div>
          <h2>{dashboard.user?.name}</h2>
          <p>{dashboard.user?.email}</p>
          <div className="teacher-profile-list">
            <div><span>Anak</span><strong>{siswa?.nama || "Belum tertaut"}</strong></div>
            <div><span>No. HP</span><strong>{siswa?.no_telepon || "-"}</strong></div>
          </div>
        </article>

        <article className="teacher-card announcement-card">
          <h3>Pengumuman Terbaru</h3>
          {announcements.length === 0 ? (
            <p className="teacher-empty">Belum ada pengumuman terbaru.</p>
          ) : (
            <div className="teacher-announcement-list">
              {announcements.map((item) => (
                <div className="teacher-announcement" key={item.id}>
                  <span>{formatDate(item.date)}</span>
                  <strong>{item.title}</strong>
                  <p>{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <article className="teacher-card vision-card">
        <h3>Profil Sekolah</h3>
        <p><strong>{info?.nama_sekolah || "Profil sekolah belum diisi"}</strong></p>
        <p>{info?.alamat || "Alamat belum tersedia"}</p>
      </article>
    </section>
  );

  const renderProfilOrangTua = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Profil</span>
        <h1>Profil Orang Tua</h1>
        <p>Data kontak orang tua/wali untuk komunikasi dengan sekolah.</p>
      </div>

      {editing ? (
        <form className="profile-layout" onSubmit={handleSaveProfile}>
          <div className="profile-photo-card">
            <div className="profile-photo"><span>Foto</span></div>
          </div>
          <div className="profile-fields">
            <label className="teacher-field">Nama
              <input name="name" value={profileForm.name} onChange={handleProfileChange} required />
            </label>
            <label className="teacher-field">No. HP
              <input name="no_telepon" value={profileForm.no_telepon} onChange={handleProfileChange} placeholder="08xxxxxxxxxx" />
            </label>
            <label className="teacher-field">Alamat
              <input name="alamat" value={profileForm.alamat} onChange={handleProfileChange} placeholder="Alamat tempat tinggal" />
            </label>
            <label className="teacher-field">Email
              <input type="email" name="email" value={profileForm.email} onChange={handleProfileChange} />
            </label>
            <div className="teacher-actions-row">
              <button type="button" className="teacher-secondary" onClick={() => setEditing(false)}>Batal</button>
              <button type="submit" className="teacher-primary" disabled={savingProfile}>{savingProfile ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </form>
      ) : (
        <div className="profile-layout">
          <div className="profile-photo-card">
            <div className="profile-photo"><span>Foto</span></div>
          </div>
          <div className="profile-readonly">
            <div><span>Nama</span><strong>{dashboard.user?.name}</strong></div>
            <div><span>No. HP</span><strong>{siswa?.no_telepon || "-"}</strong></div>
            <div><span>Alamat</span><strong>{siswa?.alamat || "-"}</strong></div>
            <div><span>Email</span><strong>{dashboard.user?.email}</strong></div>
            <div className="teacher-actions-row">
              <button type="button" className="teacher-primary" onClick={() => setEditing(true)}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderDataSiswa = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Data Anak</span>
        <h1>Data Siswa</h1>
        <p>Profil anak yang tertaut dengan akun ini.</p>
      </div>

      {!siswa ? (
        <p className="teacher-empty">Belum ada data siswa yang tertaut dengan akun ini.</p>
      ) : (
        <div className="teacher-grid two-columns">
          <article className="teacher-card">
            <div className="teacher-card-title"><span>Profil Siswa</span><strong>{siswa.kelas?.nama_kelas || "-"}</strong></div>
            <div className="teacher-profile-list">
              <div><span>Nama</span><strong>{siswa.nama}</strong></div>
              <div><span>NIS</span><strong>{siswa.nisn}</strong></div>
              <div><span>Jenis Kelamin</span><strong>{siswa.jenis_kelamin === "P" ? "Perempuan" : "Laki-laki"}</strong></div>
              <div><span>Email Login</span><strong>{siswa.email || "-"}</strong></div>
            </div>
          </article>
          <article className="teacher-card">
            <div className="teacher-card-title"><span>Kontak</span><strong>Wali</strong></div>
            <div className="teacher-profile-list">
              <div><span>No. HP</span><strong>{siswa.no_telepon || "-"}</strong></div>
              <div><span>Alamat</span><strong>{siswa.alamat || "-"}</strong></div>
            </div>
          </article>
        </div>
      )}
    </section>
  );

  const renderKehadiran = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Kehadiran</span>
        <h1>Absensi Utama Anak Saya</h1>
        <p>Data yang tampil hanya absensi utama dari Guru Wali Kelas, satu data untuk setiap hari sekolah.</p>
      </div>

      <div className="teacher-form-grid four-columns">
        <label className="teacher-field">Dari
          <input type="date" value={filter.dari} onChange={(event) => setFilter((prev) => ({ ...prev, dari: event.target.value }))} />
        </label>
        <label className="teacher-field">Sampai
          <input type="date" value={filter.sampai} onChange={(event) => setFilter((prev) => ({ ...prev, sampai: event.target.value }))} />
        </label>
        <button type="button" className="teacher-primary action-height" onClick={loadAbsensi} disabled={absensiLoading}>
          {absensiLoading ? "Memuat..." : "Tampilkan"}
        </button>
        <button type="button" className="teacher-secondary action-height" onClick={exportAbsensi} disabled={!absensi.rows.length}>
          Export Excel
        </button>
      </div>

      <div className="attend-cards">
        <div className="attend-card hadir"><span>HADIR</span><strong>{absensi.summary.hadir}</strong></div>
        <div className="attend-card tidak"><span>TIDAK HADIR</span><strong>{absensi.summary.tidak_hadir}</strong></div>
        <div className="attend-card keterangan"><span>KETERANGAN</span><strong>IZIN {absensi.summary.izin} • SAKIT {absensi.summary.sakit} • ALPHA {absensi.summary.alpha}</strong></div>
      </div>

      {groupedAbsensi.length === 0 ? (
        <p className="teacher-empty">Belum ada data absensi pada rentang ini.</p>
      ) : groupedAbsensi.map((group) => (
        <div className="attend-group" key={group.tanggal}>
          <h4>Tanggal {formatDate(group.tanggal)}</h4>
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr><th>No</th><th>Nama</th><th>Guru Wali Kelas</th><th>Status</th><th>Keterangan</th></tr>
              </thead>
              <tbody>
                {group.items.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.siswa?.nama || siswa?.nama || "-"}</td>
                    <td>{row.guru?.name || "-"}</td>
                    <td><span className={statusClass(row.status)}>{row.status.toUpperCase()}</span></td>
                    <td>{row.keterangan || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );

  const renderActivePanel = () => {
    if (activeMenu === "data-siswa") return renderDataSiswa();
    if (activeMenu === "kehadiran") return renderKehadiran();
    return (
      <>
        {renderProfilOrangTua()}
        {renderDashboard()}
      </>
    );
  };

  return (
    <div className="teacher-shell">
      <header className="teacher-topbar">
        <div className="teacher-brand">
          <span>CNB</span>
          <div>
            <strong>Portal Orang Tua</strong>
            <small>Sistem Informasi Sekolah</small>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="teacher-logout">Keluar</button>
      </header>

      <div className="teacher-layout">
        <aside className="teacher-sidebar">
          <div className="teacher-avatar"><span>{dashboard.user?.name?.slice(0, 1) || "O"}</span></div>
          <h2>{dashboard.user?.name}</h2>
          <p>Orang Tua</p>
          <span className="teacher-role-pill">{siswa?.nama || "Wali Siswa"}</span>

          <nav className="teacher-menu" aria-label="Menu dashboard orang tua">
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

export default DashboardOrangTua;
