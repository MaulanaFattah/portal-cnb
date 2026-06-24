import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSiswaAbsensi,
  getSiswaDashboard,
  logout,
  updateSiswaProfile
} from "../services/api";
import { exportExcel } from "../utils/exportExcel";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dasbor" },
  { id: "profil", label: "Profil Siswa" },
  { id: "absensi", label: "Absensi" }
];

const emptySummary = { hadir: 0, tidak_hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };

function toDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayISO() {
  return toDateInputValue();
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

function DashboardSiswa() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [showReminder, setShowReminder] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nama: "",
    nisn: "",
    kelas: "",
    no_telepon: "",
    alamat: "",
    jenis_kelamin: "",
    email: "",
    foto: ""
  });
  const [absensi, setAbsensi] = useState({ summary: emptySummary, rows: [] });
  const [absensiLoading, setAbsensiLoading] = useState(false);
  const [filter, setFilter] = useState({ dari: firstDayOfMonthISO(), sampai: todayISO() });

  useEffect(() => {
    const load = async () => {
      const result = await getSiswaDashboard();
      if (!result.success) {
        alert(result.message || "Gagal membuka dashboard siswa");
        navigate("/login-siswa");
        return;
      }

      const data = result.data;
      const siswa = data.siswa;
      setDashboard(data);
      setProfileForm({
        nama: siswa?.nama || data.user?.name || "",
        nisn: siswa?.nisn || "",
        kelas: siswa?.kelas?.nama_kelas || "",
        no_telepon: siswa?.no_telepon || "",
        alamat: siswa?.alamat || "",
        jenis_kelamin: siswa?.jenis_kelamin || "",
        email: siswa?.email || data.user?.email || "",
        foto: siswa?.foto || ""
      });
      setShowReminder(Boolean(data.perluLengkapiProfil));
      setLoading(false);
    };

    load();
  }, [navigate]);

  const announcements = dashboard?.pengumumanTerbaru || [];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleFoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileForm((previous) => ({ ...previous, foto: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setNotice(null);

    const result = await updateSiswaProfile({
      nama: profileForm.nama,
      no_telepon: profileForm.no_telepon,
      alamat: profileForm.alamat,
      jenis_kelamin: profileForm.jenis_kelamin,
      email: profileForm.email,
      foto: profileForm.foto
    });

    setSavingProfile(false);
    setNotice({ type: result.success ? "success" : "error", text: result.message });
    if (result.success) setShowReminder(false);
  };

  const loadAbsensi = async () => {
    setAbsensiLoading(true);
    setNotice(null);
    const result = await getSiswaAbsensi(filter);
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
      filename: `absensi-saya-${filter.dari}-${filter.sampai}.xls`,
      title: "Absensi Utama Saya",
      subtitle: `${dashboard.siswa?.nama || dashboard.user?.name || "Siswa"} â€¢ Guru Wali Kelas â€¢ ${filter.dari} sampai ${filter.sampai}`,
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
          <p>Memuat dashboard siswa...</p>
        </div>
      </main>
    );
  }

  if (!dashboard) return null;

  const renderDashboard = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header">
        <span>Dasbor</span>
        <h1>Informasi Sekolah</h1>
        <p>Ringkasan profil dan pengumuman terbaru dari sekolah.</p>
      </div>

      <div className="teacher-grid two-columns">
        <article className="teacher-card">
          <div className="teacher-card-title">
              <span>Ringkasan Profil</span>
            <strong>{dashboard.siswa?.kelas?.nama_kelas || "Kelas -"}</strong>
          </div>
          <h2>{dashboard.siswa?.nama || dashboard.user?.name}</h2>
          <p>NIS: {dashboard.siswa?.nisn || "-"}</p>
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
    </section>
  );

  const renderProfil = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Profil</span>
        <h1>Profil Siswa</h1>
        <p>Lengkapi data diri agar informasi sekolah tersampaikan dengan benar.</p>
      </div>

      <form className="profile-layout" onSubmit={handleSaveProfile}>
        <div className="profile-photo-card">
          <div className="profile-photo">
            {profileForm.foto ? <img src={profileForm.foto} alt="Foto siswa" /> : <span>Foto</span>}
          </div>
          <label className="profile-photo-btn">
            Ubah Foto
            <input type="file" accept="image/*" onChange={handleFoto} hidden />
          </label>
        </div>

        <div className="profile-fields">
          <label className="teacher-field">Nama
            <input name="nama" value={profileForm.nama} onChange={handleProfileChange} required />
          </label>
          <label className="teacher-field">NIS
            <input name="nisn" value={profileForm.nisn} readOnly />
          </label>
          <label className="teacher-field">Kelas
            <input name="kelas" value={profileForm.kelas} readOnly />
          </label>
          <label className="teacher-field">No. HP
            <input name="no_telepon" value={profileForm.no_telepon} onChange={handleProfileChange} placeholder="08xxxxxxxxxx" />
          </label>
          <label className="teacher-field">Alamat
            <input name="alamat" value={profileForm.alamat} onChange={handleProfileChange} placeholder="Alamat tempat tinggal" />
          </label>
          <label className="teacher-field">Jenis Kelamin
            <select name="jenis_kelamin" value={profileForm.jenis_kelamin} onChange={handleProfileChange}>
              <option value="">Pilih</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </label>
          <label className="teacher-field">Email
            <input type="email" name="email" value={profileForm.email} readOnly disabled />
          </label>

          <div className="teacher-actions-row">
            <button className="teacher-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );

  const renderAbsensi = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Absensi</span>
        <h1>Absensi Utama Saya</h1>
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
          Ekspor Excel
        </button>
      </div>

      <div className="attend-cards">
        <div className="attend-card hadir">
          <span>HADIR</span>
          <strong>{absensi.summary.hadir}</strong>
        </div>
        <div className="attend-card tidak">
          <span>TIDAK HADIR</span>
          <strong>{absensi.summary.tidak_hadir}</strong>
        </div>
        <div className="attend-card keterangan">
          <span>KETERANGAN</span>
          <strong>IZIN {absensi.summary.izin} â€¢ SAKIT {absensi.summary.sakit} â€¢ ALPHA {absensi.summary.alpha}</strong>
        </div>
      </div>

      {groupedAbsensi.length === 0 ? (
        <p className="teacher-empty">Belum ada data absensi pada rentang ini.</p>
      ) : groupedAbsensi.map((group) => (
        <div className="attend-group" key={group.tanggal}>
          <h4>Tanggal {formatDate(group.tanggal)}</h4>
          <div className="teacher-table-wrap">
            <table className="teacher-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Guru Wali Kelas</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.siswa?.nama || dashboard.siswa?.nama || "-"}</td>
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
    if (activeMenu === "profil") return renderProfil();
    if (activeMenu === "absensi") return renderAbsensi();
    return renderDashboard();
  };

  return (
    <div className="teacher-shell">
      {showReminder && (
        <div className="portal-modal" role="dialog" aria-modal="true">
          <div className="portal-modal-card">
            <button type="button" className="portal-modal-close" onClick={() => setShowReminder(false)} aria-label="Tutup">Ã—</button>
            <h3>INFORMASI PENTING</h3>
            <p>Lengkapi Profil Anda</p>
            <button type="button" className="teacher-primary" onClick={() => { setShowReminder(false); setActiveMenu("profil"); }}>
              Lengkapi Sekarang
            </button>
          </div>
        </div>
      )}

      <header className="teacher-topbar">
        <div className="teacher-brand">
          <span>CNB</span>
          <div>
            <strong>Portal Siswa</strong>
            <small>Sistem Informasi Sekolah</small>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="teacher-logout">Keluar</button>
      </header>

      <div className="teacher-layout">
        <aside className="teacher-sidebar">
          <div className="teacher-avatar"><span>{dashboard.siswa?.nama?.slice(0, 1) || "S"}</span></div>
          <h2>{dashboard.siswa?.nama || dashboard.user?.name}</h2>
          <p>Siswa</p>
          <span className="teacher-role-pill">{dashboard.siswa?.kelas?.nama_kelas || "Kelas -"}</span>

          <nav className="teacher-menu" aria-label="Menu dashboard siswa">
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

export default DashboardSiswa;
