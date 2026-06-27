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
 * Dipakai sebagai default awal periode filter absensi.
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
 * Halaman Dashboard Siswa (portal siswa).
 * Akses: pengguna dengan peran Siswa yang sudah login.
 * Fungsi halaman: menampilkan ringkasan profil & pengumuman, mengelola/melengkapi profil
 * siswa (termasuk unggah foto), serta melihat dan mengekspor rekap absensi utama dari wali
 * kelas. Bila sesi tidak valid, pengguna diarahkan ke "/login-siswa".
 */
function DashboardSiswa() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [showReminder, setShowReminder] = useState(false);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState([]);
  const [editingProfile, setEditingProfile] = useState(false);
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

  // Efek pemuatan awal: mengambil data dashboard siswa saat mount dan mengisi form profil.
  useEffect(() => {
    /**
     * Memuat data dashboard siswa dari server dan menginisialisasi state halaman.
     * Memanggil API: getSiswaDashboard().
     * Efek state: bila gagal -> alert + navigate ke "/login-siswa"; bila sukses ->
     * setDashboard, setProfileForm (data siswa), setShowReminder (jika profil belum
     * lengkap), dan setLoading(false).
     */
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

  /**
   * Melakukan logout siswa dan kembali ke beranda.
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
   * Menangani perubahan input pada form profil siswa.
   * @param {Event} event Event perubahan input (membawa name & value).
   * Efek state: memperbarui field terkait pada profileForm.
   */
  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((previous) => ({ ...previous, [name]: value }));
  };

  /**
   * Menangani unggah foto profil: membaca berkas gambar sebagai data URL (base64).
   * @param {Event} event Event perubahan input file.
   * Efek state: menyimpan hasil baca (reader.result) ke profileForm.foto.
   */
  const handleFoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileForm((previous) => ({ ...previous, foto: reader.result }));
    reader.readAsDataURL(file);
  };

  /**
   * Menyimpan perubahan profil siswa ke server.
   * @param {Event} event Event submit form profil (dicegah default-nya).
   * Memanggil API: updateSiswaProfile({ nama, no_telepon, alamat, jenis_kelamin, email, foto }).
   * Efek state: setSavingProfile, setNotice (sukses/gagal); bila sukses menyembunyikan
   * pengingat (setShowReminder(false)) dan keluar dari mode edit (setEditingProfile(false)).
   */
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
    if (result.success) {
      setShowReminder(false);
      setEditingProfile(false);
    }
  };

  /**
   * Memuat data absensi siswa dari server sesuai rentang tanggal pada filter.
   * Memanggil API: getSiswaAbsensi(filter).
   * Efek state: setAbsensiLoading, setNotice (bila error), dan setAbsensi dengan hasil.
   */
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

  /**
   * Mengekspor data absensi siswa yang sedang ditampilkan ke berkas Excel (.xls).
   * Tidak melakukan apa-apa bila absensi.rows kosong.
   * Memanggil: exportExcel({...}) dengan judul, ringkasan, kolom, dan baris absensi.
   * Efek: memicu unduhan berkas; tidak mengubah state.
   */
  const exportAbsensi = () => {
    if (!absensi.rows.length) return;
    exportExcel({
      filename: `absensi-saya-${filter.dari}-${filter.sampai}.xls`,
      title: "Absensi Utama Saya",
      subtitle: `${dashboard.siswa?.nama || dashboard.user?.name || "Siswa"} • Guru Wali Kelas • ${filter.dari} sampai ${filter.sampai}`,
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
          <p>Memuat dashboard siswa...</p>
        </div>
      </main>
    );
  }

  if (!dashboard) return null;

  /**
   * Merender panel Dasbor siswa: ringkasan profil dan daftar pengumuman terbaru.
   * @returns {JSX.Element} Panel dasbor.
   */
  const renderDashboard = () => {
    const studentInitial = (dashboard.siswa?.nama || dashboard.user?.name || "S").trim().charAt(0) || "S";
    const className = dashboard.siswa?.kelas?.nama_kelas || "Kelas -";

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header">
          <span>Dasbor</span>
          <h1>Informasi Sekolah</h1>
          <p>Ringkasan profil dan pengumuman terbaru dari sekolah.</p>
        </div>

        <div className="teacher-profile-overview">
          <article className="teacher-card profile-card teacher-profile-card">
            <div className="teacher-card-title">
              <span>Ringkasan Profil</span>
              <strong>{className}</strong>
            </div>

            <div className="teacher-profile-head">
              <div className="teacher-profile-avatar" aria-hidden="true">
                <span>{studentInitial}</span>
              </div>
              <div className="teacher-profile-identity">
                <h2>{dashboard.siswa?.nama || dashboard.user?.name}</h2>
                <p>Siswa</p>
              </div>
            </div>

            <div className="teacher-profile-list">
              <div><span>Kelas</span><strong>{className}</strong></div>
              <div><span>NIS</span><strong>{dashboard.siswa?.nisn || "-"}</strong></div>
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
   * Merender panel Profil siswa: mode tampilan (baca) atau mode edit (form data diri + foto).
   * @returns {JSX.Element} Panel profil.
   */
  const renderProfil = () => {
    const jkLabel = profileForm.jenis_kelamin === "P" ? "Perempuan" : profileForm.jenis_kelamin === "L" ? "Laki-laki" : "-";
    const studentInitial = (profileForm.nama || dashboard.user?.name || "S").trim().charAt(0) || "S";
    const details = [
      ["Nama", profileForm.nama || "-"],
      ["NIS", profileForm.nisn || "-"],
      ["Kelas", profileForm.kelas || "-"],
      ["No. HP", profileForm.no_telepon || "-"],
      ["Alamat", profileForm.alamat || "-"],
      ["Jenis Kelamin", jkLabel],
      ["Email", profileForm.email || "-"],
      ["Status Akun", "Aktif"]
    ];

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header compact">
          <span>Profil</span>
          <h1>Profil Siswa</h1>
          <p>Lengkapi data diri agar informasi sekolah tersampaikan dengan benar.</p>
        </div>

        {editingProfile ? (
          <form className="profile-layout" onSubmit={handleSaveProfile}>
            <div className="profile-photo-card">
              <div className="profile-photo">
                {profileForm.foto ? <img src={profileForm.foto} alt="Foto siswa" /> : <span>{studentInitial}</span>}
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
                <button type="button" className="teacher-secondary" onClick={() => setEditingProfile(false)}>Batal</button>
                <button className="teacher-primary" type="submit" disabled={savingProfile}>
                  {savingProfile ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="profile-layout">
            <div className="profile-photo-card">
              <div className="profile-photo">
                {profileForm.foto ? <img src={profileForm.foto} alt="Foto siswa" /> : <span>{studentInitial}</span>}
              </div>
              <span className="teacher-role-pill">Siswa</span>
            </div>

            <div className="profile-readonly">
              {details.map(([label, value]) => (
                <div className={label === "Alamat" ? "wide" : ""} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <div className="teacher-actions-row">
                <button type="button" className="teacher-primary" onClick={() => setEditingProfile(true)}>Edit Profil</button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  };

  /**
   * Merender panel Absensi siswa: filter periode, kartu ringkasan, dan tabel absensi
   * yang dikelompokkan per tanggal.
   * @returns {JSX.Element} Panel absensi.
   */
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
          <strong>IZIN {absensi.summary.izin} • SAKIT {absensi.summary.sakit} • ALPHA {absensi.summary.alpha}</strong>
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

  /**
   * Menentukan panel yang dirender berdasarkan menu aktif (activeMenu).
   * @returns {JSX.Element} Panel profil/absensi, atau default dasbor.
   */
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
            <button type="button" className="portal-modal-close" onClick={() => setShowReminder(false)} aria-label="Tutup">×</button>
            <h3>INFORMASI PENTING</h3>
            <p>Lengkapi Profil Anda</p>
            <button type="button" className="teacher-primary" onClick={() => { setShowReminder(false); setActiveMenu("profil"); setEditingProfile(true); }}>
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
