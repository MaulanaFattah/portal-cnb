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
  { id: "dashboard", label: "Dasbor" },
  { id: "profil", label: "Profil Orang Tua" },
  { id: "data-siswa", label: "Data Siswa" },
  { id: "kehadiran", label: "Kehadiran Siswa" }
];

const emptySummary = { hadir: 0, tidak_hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };

/**
 * Mengubah objek Date menjadi string format "YYYY-MM-DD" untuk input bertipe date.
 * @param {Date} [date=new Date()] Tanggal yang akan dikonversi (default: hari ini).
 * @returns {string} Tanggal format "YYYY-MM-DD". Efek: murni.
 */
function toDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Mengembalikan tanggal hari ini dalam format "YYYY-MM-DD".
 * @returns {string} Tanggal hari ini. Efek: murni.
 */
function todayISO() {
  return toDateInputValue();
}

/**
 * Mengembalikan tanggal awal (tanggal 1) bulan berjalan dalam format "YYYY-MM-DD".
 * @returns {string} Tanggal awal bulan. Efek: murni.
 */
function firstDayOfMonthISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Memformat tanggal menjadi teks lokal Indonesia (contoh: "05 Januari 2024").
 * @param {string|Date} value Nilai tanggal.
 * @returns {string} Teks tanggal terformat, atau "-" jika kosong. Efek: murni.
 */
function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Membuat nama kelas CSS untuk badge status absensi.
 * @param {string} status Kode status (mis. "hadir").
 * @returns {string} String className. Efek: murni.
 */
function statusClass(status) {
  return `attend-status attend-${status}`;
}

/**
 * Mengelompokkan baris absensi berdasarkan tanggal.
 * @param {Array<{tanggal:string}>} rows Baris absensi.
 * @returns {Array<{tanggal:string, items:Array}>} Daftar grup per tanggal. Efek: murni.
 */
function groupByDate(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.tanggal)) map.set(row.tanggal, []);
    map.get(row.tanggal).push(row);
  });
  return [...map.entries()].map(([tanggal, items]) => ({ tanggal, items }));
}

/**
 * Halaman Dashboard Orang Tua (portal orang tua/wali).
 * Akses: pengguna dengan peran Orang Tua/Wali yang sudah login.
 * Fungsi halaman: menampilkan ringkasan & pengumuman, mengelola profil orang tua,
 * melihat data anak (siswa) yang tertaut, serta melihat dan mengekspor absensi utama
 * anak dari wali kelas. Bila sesi tidak valid, diarahkan ke "/login-orangtua".
 */
function DashboardOrangTua() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(false);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", no_telepon: "", alamat: "", email: "" });
  const [absensi, setAbsensi] = useState({ summary: emptySummary, rows: [] });
  const [absensiLoading, setAbsensiLoading] = useState(false);
  const [filter, setFilter] = useState({ dari: firstDayOfMonthISO(), sampai: todayISO() });

  // Efek pemuatan awal: mengambil data dashboard orang tua saat mount dan mengisi form profil.
  useEffect(() => {
    /**
     * Memuat data dashboard orang tua dari server dan menginisialisasi state.
     * Memanggil API: getOrangTuaDashboard().
     * Efek state: bila gagal -> alert + navigate ke "/login-orangtua"; bila sukses ->
     * setDashboard, setProfileForm, dan setLoading(false).
     */
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

  /**
   * Melakukan logout orang tua dan kembali ke beranda.
   * Memanggil: logout() lalu navigate ke "/".
   */
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /**
   * Membuka/menutup (toggle) tampilan isi pengumuman.
   * @param {number|string} id ID pengumuman.
   * Efek state: menambah/menghapus id dari expandedAnnouncements.
   */
  const toggleAnnouncement = (id) => {
    setExpandedAnnouncements((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  /**
   * Menangani perubahan input pada form profil orang tua.
   * @param {Event} event Event perubahan input (membawa name & value).
   * Efek state: memperbarui field terkait pada profileForm.
   */
  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((previous) => ({ ...previous, [name]: value }));
  };

  /**
   * Menyimpan perubahan profil orang tua ke server.
   * @param {Event} event Event submit form (dicegah default-nya).
   * Memanggil API: updateOrangTuaProfile(profileForm).
   * Efek state: setSavingProfile, setNotice; bila sukses keluar dari mode edit dan
   * memperbarui data user & siswa pada state dashboard.
   */
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

  /**
   * Memuat data absensi anak dari server sesuai rentang tanggal pada filter.
   * Memanggil API: getOrangTuaAbsensi(filter).
   * Efek state: setAbsensiLoading, setNotice (bila error), dan setAbsensi dengan hasil.
   */
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

  /**
   * Mengekspor absensi anak yang sedang ditampilkan ke berkas Excel (.xls).
   * Tidak melakukan apa-apa bila absensi.rows kosong.
   * Memanggil: exportExcel({...}). Efek: memicu unduhan berkas; tidak mengubah state.
   */
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

  // Absensi dikelompokkan per tanggal untuk ditampilkan terpisah pada tiap hari.
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

  const announcements = dashboard.pengumumanTerbaru || [];
  const siswa = dashboard.siswa;

  /**
   * Merender panel Dasbor orang tua: ringkasan profil anak dan pengumuman terbaru.
   * @returns {JSX.Element} Panel dasbor.
   */
  const renderDashboard = () => {
    const parentInitial = (dashboard.user?.name || "O").trim().charAt(0) || "O";

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header">
          <span>Dasbor</span>
          <h1>Informasi Sekolah</h1>
          <p>Pantau perkembangan anak dan informasi terbaru dari sekolah.</p>
        </div>

        <div className="teacher-profile-overview">
          <article className="teacher-card profile-card teacher-profile-card">
            <div className="teacher-card-title">
              <span>Ringkasan Profil</span>
              <strong>{siswa?.kelas?.nama_kelas || "Orang Tua"}</strong>
            </div>

            <div className="teacher-profile-head">
              <div className="teacher-profile-avatar" aria-hidden="true">
                <span>{parentInitial}</span>
              </div>
              <div className="teacher-profile-identity">
                <h2>{dashboard.user?.name}</h2>
                <p>Orang Tua / Wali</p>
              </div>
            </div>

            <div className="teacher-profile-list">
              <div><span>Anak</span><strong>{siswa?.nama || "Belum tertaut"}</strong></div>
              <div><span>Kelas</span><strong>{siswa?.kelas?.nama_kelas || "-"}</strong></div>
              <div><span>No. HP</span><strong>{siswa?.no_telepon || "-"}</strong></div>
            </div>
          </article>
        </div>

        <div className="teacher-grid">
          <article className="teacher-card announcement-card">
            <h3>Pengumuman Terbaru</h3>
            {announcements.length === 0 ? (
              <p className="teacher-empty">Belum ada pengumuman terbaru.</p>
            ) : (
              <div className="teacher-announcement-list">
                {announcements.map((item) => {
                  const isOpen = expandedAnnouncements.includes(item.id);
                  return (
                    <div className={`teacher-announcement${isOpen ? " expanded" : ""}`} key={item.id}>
                      <span>{formatDate(item.date)}</span>
                      <strong>{item.title}</strong>
                      <p>{item.content}</p>
                      <button
                        type="button"
                        className="teacher-announcement-toggle"
                        onClick={() => toggleAnnouncement(item.id)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? "Tutup" : "Selengkapnya"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </div>
      </section>
    );
  };

  /**
   * Merender panel Profil Orang Tua: mode tampilan (baca) atau mode edit (form kontak).
   * @returns {JSX.Element} Panel profil orang tua.
   */
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
            <div className="profile-photo"><span>{dashboard.user?.name?.slice(0, 1) || "O"}</span></div>
            <span className="teacher-role-pill">Orang Tua / Wali</span>
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
              <input type="email" name="email" value={profileForm.email} readOnly disabled />
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
            <div className="profile-photo"><span>{dashboard.user?.name?.slice(0, 1) || "O"}</span></div>
            <span className="teacher-role-pill">Orang Tua / Wali</span>
          </div>
          <div className="profile-readonly">
            <div><span>Nama</span><strong>{dashboard.user?.name || "-"}</strong></div>
            <div><span>Email</span><strong>{dashboard.user?.email || "-"}</strong></div>
            <div><span>No. HP</span><strong>{siswa?.no_telepon || "-"}</strong></div>
            <div className="wide"><span>Alamat</span><strong>{siswa?.alamat || "-"}</strong></div>
            <div><span>Hubungan dengan Siswa</span><strong>Orang Tua / Wali</strong></div>
            <div><span>Nama Siswa Terkait</span><strong>{siswa?.nama || "Belum tertaut"}</strong></div>
            <div><span>Kelas Siswa</span><strong>{siswa?.kelas?.nama_kelas || "-"}</strong></div>
            <div><span>Status Akun</span><strong>Aktif</strong></div>
            <div className="teacher-actions-row">
              <button type="button" className="teacher-primary" onClick={() => setEditing(true)}>Ubah</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  /**
   * Merender panel Data Siswa: profil anak yang tertaut dengan akun orang tua.
   * @returns {JSX.Element} Panel data siswa.
   */
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
              <div><span>Email Masuk</span><strong>{siswa.email || "-"}</strong></div>
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

  /**
   * Merender panel Kehadiran: filter periode, ringkasan, dan tabel absensi anak per tanggal.
   * @returns {JSX.Element} Panel kehadiran.
   */
  const renderKehadiran = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Kehadiran</span>
        <h1>Absensi Utama Anak Saya</h1>
        <p>Data yang tampil hanya absensi utama dari Guru Wali Kelas, satu data untuk setiap hari sekolah.</p>
      </div>

      <div className="parent-attendance-overview">
        <div>
          <span>Siswa</span>
          <strong>{siswa?.nama || "Belum tertaut"}</strong>
          <small>{siswa?.kelas?.nama_kelas || "Kelas belum tersedia"}</small>
        </div>
        <div>
          <span>Periode</span>
          <strong>{formatDate(filter.dari)} - {formatDate(filter.sampai)}</strong>
          <small>{absensi.summary.total || 0} data absensi tercatat</small>
        </div>
      </div>

      <div className="teacher-form-grid four-columns parent-attendance-filter">
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

      <div className="attend-cards parent-attendance-cards">
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

  /**
   * Menentukan panel yang dirender berdasarkan menu aktif (activeMenu).
   * @returns {JSX.Element} Panel profil/data-siswa/kehadiran, atau default dasbor.
   */
  const renderActivePanel = () => {
    if (activeMenu === "profil") return renderProfilOrangTua();
    if (activeMenu === "data-siswa") return renderDataSiswa();
    if (activeMenu === "kehadiran") return renderKehadiran();
    return renderDashboard();
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
