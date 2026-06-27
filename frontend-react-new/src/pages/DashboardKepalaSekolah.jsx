import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getKepalaSekolahDashboard,
  logout,
  updateKepalaSekolahProfile
} from "../services/api";
import { exportExcel, exportPdf } from "../utils/exportExcel";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dasbor" },
  { id: "profil", label: "Profil Kepala Sekolah" },
  { id: "guru", label: "Data Guru" },
  { id: "siswa", label: "Data Siswa" },
  { id: "rekap", label: "Rekapitulasi Absensi" }
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
 * Halaman Dashboard Kepala Sekolah (portal kepala sekolah).
 * Akses: pengguna dengan peran Kepala Sekolah yang sudah login (data dibatasi sesuai
 * jenjang akses / scopeJenjang).
 * Fungsi halaman: menampilkan monitoring sekolah & pengumuman, profil kepala sekolah,
 * data guru, data siswa (dikelompokkan per kelas), serta rekapitulasi absensi sekolah
 * dengan filter dan ekspor Excel/PDF. Bila sesi tidak valid, diarahkan ke
 * "/login-kepala-sekolah".
 */
function DashboardKepalaSekolah() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ nama: "", no_telepon: "", alamat: "", foto: "", email: "" });
  const [filter, setFilter] = useState({ kelas_id: "", dari: firstDayOfMonthISO(), sampai: todayISO() });
  const [expandedAnnouncements, setExpandedAnnouncements] = useState([]);

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

  // Efek pemuatan awal: mengambil data dashboard kepala sekolah saat mount.
  useEffect(() => {
    /**
     * Memuat data dashboard kepala sekolah dari server dan menginisialisasi state.
     * Memanggil API: getKepalaSekolahDashboard().
     * Efek state: bila gagal -> alert + navigate ke "/login-kepala-sekolah"; bila sukses
     * -> setDashboard, setProfileForm, dan setLoading(false).
     */
    const load = async () => {
      const result = await getKepalaSekolahDashboard();
      if (!result.success) {
        alert(result.message || "Gagal membuka dashboard kepala sekolah");
        navigate("/login-kepala-sekolah");
        return;
      }

      setDashboard(result.data);
      setProfileForm({
        nama: result.data.kepalaSekolah?.nama || result.data.user?.name || "",
        no_telepon: result.data.kepalaSekolah?.no_telepon || "",
        alamat: result.data.kepalaSekolah?.alamat || "",
        foto: result.data.kepalaSekolah?.foto || "",
        email: result.data.kepalaSekolah?.email || result.data.user?.email || ""
      });
      setLoading(false);
    };

    load();
  }, [navigate]);

  /**
   * Melakukan logout kepala sekolah dan kembali ke beranda.
   * Memanggil: logout() lalu navigate ke "/".
   */
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  /**
   * Menangani perubahan field pada filter rekap absensi (kelas/periode).
   * @param {Event} event Event perubahan input/select (membawa name & value).
   * Efek state: memperbarui field terkait pada filter.
   */
  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilter((previous) => ({ ...previous, [name]: value }));
  };

  /**
   * Menangani perubahan input pada form profil kepala sekolah.
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
  const handleProfilePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileForm((previous) => ({ ...previous, foto: reader.result }));
    reader.readAsDataURL(file);
  };

  /**
   * Menyimpan perubahan profil kepala sekolah ke server.
   * @param {Event} event Event submit form (dicegah default-nya).
   * Memanggil API: updateKepalaSekolahProfile({ nama, no_telepon, alamat, foto }).
   * Efek state: setSavingProfile, setNotice; bila sukses keluar dari mode edit dan
   * memperbarui data user & kepalaSekolah pada state dashboard.
   */
  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setNotice(null);

    const result = await updateKepalaSekolahProfile({
      nama: profileForm.nama,
      no_telepon: profileForm.no_telepon,
      alamat: profileForm.alamat,
      foto: profileForm.foto
    });

    setSavingProfile(false);
    setNotice({ type: result.success ? "success" : "error", text: result.message });

    if (result.success) {
      setEditingProfile(false);
      setDashboard((previous) => previous ? {
        ...previous,
        user: result.data.user,
        kepalaSekolah: result.data.kepalaSekolah
      } : previous);
    }
  };


  /**
   * Memuat ulang data rekap absensi sesuai filter (kelas & periode) yang dipilih.
   * Memanggil API: getKepalaSekolahDashboard(filter).
   * Efek state: setRekapLoading, setNotice (bila error), dan memperbarui dashboard.absensi.
   */
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

  /**
   * Menyusun payload ekspor (judul, ringkasan, kolom, baris) dari data absensi dashboard.
   * @returns {object} Objek payload untuk dipakai exportExcel/exportPdf. Efek: tidak mengubah state.
   */
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

  /**
   * Mengekspor rekap absensi ke berkas Excel (.xls).
   * Tidak melakukan apa-apa bila tidak ada baris data.
   * Memanggil API: getKepalaSekolahDashboard({ ...filter, export_type: "excel" }) (untuk
   * pencatatan/audit di server) lalu exportExcel(payload) untuk mengunduh berkas.
   * Efek: memicu unduhan; tidak mengubah state.
   */
  const exportRekap = () => {
    const payload = buildExportPayload();
    if (!payload.rows.length) return;
    getKepalaSekolahDashboard({ ...filter, export_type: "excel" });
    exportExcel({ filename: `rekapitulasi-sekolah-${filter.dari}-${filter.sampai}.xls`, ...payload });
  };

  /**
   * Mengekspor rekap absensi ke berkas PDF.
   * Tidak melakukan apa-apa bila tidak ada baris data.
   * Memanggil API: getKepalaSekolahDashboard({ ...filter, export_type: "pdf" }) lalu
   * exportPdf(payload) untuk mengunduh berkas.
   * Efek: memicu unduhan; tidak mengubah state.
   */
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

  /**
   * Merender panel Dasbor (default): kartu monitoring, ringkasan profil, dan pengumuman.
   * @returns {JSX.Element} Panel dasbor.
   */
  const renderProfil = () => {
    const principalInitial = (kepala?.nama || dashboard.user?.name || "K").trim().charAt(0) || "K";
    const isSdScope = dashboard.scopeJenjang === "sd";

    return (
    <section className="teacher-panel">
      <div className="teacher-panel-header">
        <span>Dasbor</span>
        <h1>Informasi Sekolah</h1>
        <p>Ringkasan monitoring sekolah, profil, dan pengumuman untuk jenjang {scopeLabel}.</p>
      </div>

      <div className="principal-stat-grid">
        <div className="principal-stat-card"><span>Jumlah Siswa</span><strong>{monitoring.totalSiswa || 0}</strong><small>Siswa aktif sesuai jenjang</small></div>
        <div className="principal-stat-card"><span>Guru Wali Kelas</span><strong>{monitoring.totalGuruWaliKelas || 0}</strong><small>Guru wali dalam cakupan</small></div>
        {!isSdScope && (
          <div className="principal-stat-card"><span>Guru Mapel</span><strong>{monitoring.totalGuruMapel || 0}</strong><small>Pengajar mata pelajaran</small></div>
        )}
        <div className="principal-stat-card"><span>Data Kelas</span><strong>{monitoring.totalKelas || 0}</strong><small>Kelas terdaftar</small></div>
      </div>

      <div className="teacher-profile-overview">
        <article className="teacher-card profile-card teacher-profile-card">
          <div className="teacher-card-title">
            <span>Ringkasan Profil</span>
            <strong>Monitoring {scopeLabel}</strong>
          </div>

          <div className="teacher-profile-head">
            <div className="teacher-profile-avatar" aria-hidden="true">
              <span>{principalInitial}</span>
            </div>
            <div className="teacher-profile-identity">
              <h2>{kepala?.nama || dashboard.user?.name}</h2>
              <p>Kepala Sekolah</p>
            </div>
          </div>

          <div className="teacher-profile-list">
            <div><span>Jenjang Akses</span><strong>{scopeLabel}</strong></div>
            <div><span>NIP</span><strong>{kepala?.nip || "-"}</strong></div>
            <div><span>Email</span><strong>{kepala?.email || dashboard.user?.email || "-"}</strong></div>
            <div><span>No. HP</span><strong>{kepala?.no_telepon || "-"}</strong></div>
          </div>
        </article>
      </div>

      <div className="teacher-grid">
        <article className="teacher-card announcement-card principal-feed-card">
          <h3>Pengumuman Terbaru</h3>
          {(dashboard.pengumuman || []).length === 0 ? <p className="teacher-empty">Belum ada pengumuman.</p> : (
            <div className="teacher-announcement-list">
              {dashboard.pengumuman.map((item) => {
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
   * Merender panel Data Guru: tabel daftar guru sesuai jenjang akses kepala sekolah.
   * @returns {JSX.Element} Panel data guru.
   */
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
            <tr><th>No</th><th>Nama</th><th>Status Guru</th><th>No. HP</th><th>Mata Pelajaran</th><th>Status Akun</th></tr>
          </thead>
          <tbody>
            {(dashboard.guru || []).length === 0 ? (
              <tr><td colSpan="6" className="teacher-empty-cell">Belum ada data guru.</td></tr>
            ) : dashboard.guru.map((guru, index) => (
              <tr key={guru.id}>
                <td>{index + 1}</td>
                <td>{guru.nama}</td>
                <td>{guru.status_guru || "-"}</td>
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

  /**
   * Merender panel Data Siswa: mengelompokkan siswa per kelas (diurutkan per tingkat lalu
   * nama), lalu menampilkan tabel per kelompok.
   * @returns {JSX.Element} Panel data siswa.
   * Catatan: di dalamnya terdapat helper lokal rank(group) untuk menentukan urutan tingkat kelas.
   */
  const renderDataSiswa = () => {
    const students = dashboard.siswa || [];
    const groupsMap = new Map();
    students.forEach((siswa) => {
      const key = siswa.kelas?.nama_kelas || "Tanpa Kelas";
      if (!groupsMap.has(key)) {
        groupsMap.set(key, { nama: key, tingkat: siswa.kelas?.tingkat, list: [] });
      }
      groupsMap.get(key).list.push(siswa);
    });
    // Helper lokal: mengubah tingkat kelas menjadi angka untuk pengurutan grup kelas.
    const rank = (group) => {
      const tingkat = parseInt(group.tingkat, 10);
      return Number.isNaN(tingkat) ? Number.MAX_SAFE_INTEGER : tingkat;
    };
    const groups = [...groupsMap.values()]
      .map((group) => ({ ...group, list: [...group.list].sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id")) }))
      .sort((a, b) => rank(a) - rank(b) || a.nama.localeCompare(b.nama, "id", { numeric: true }));

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header compact">
          <span>Data Murid</span>
          <h1>Data Siswa</h1>
          <p>Daftar siswa yang sesuai dengan jenjang akses kepala sekolah, dikelompokkan per kelas.</p>
        </div>

        {students.length === 0 ? (
          <p className="teacher-empty">Belum ada data siswa.</p>
        ) : groups.map((group) => (
          <div className="student-class-group" key={group.nama}>
            <div className="student-class-group-header">
              <div>
                <h3>{group.nama}</h3>
                <p>Daftar siswa kelas ini.</p>
              </div>
              <span className="student-class-count">{group.list.length} siswa</span>
            </div>
            <div className="teacher-table-wrap">
              <table className="teacher-table">
                <thead>
                  <tr><th>No</th><th>NIS</th><th>Nama Siswa</th><th>Jenis Kelamin</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {group.list.map((siswa, index) => (
                    <tr key={siswa.id}>
                      <td>{index + 1}</td>
                      <td>{siswa.nisn}</td>
                      <td>{siswa.nama}</td>
                      <td>{siswa.jenis_kelamin === "P" ? "Perempuan" : siswa.jenis_kelamin === "L" ? "Laki-laki" : "-"}</td>
                      <td><span className={siswa.status === "aktif" ? "teacher-badge active" : "teacher-badge"}>{siswa.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    );
  };

  /**
   * Merender panel Rekapitulasi Absensi: filter kelas/periode, kartu ringkasan, tabel rekap,
   * serta tombol tampilkan dan ekspor Excel.
   * @returns {JSX.Element} Panel rekap absensi.
   */
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

  /**
   * Merender panel Profil Kepala Sekolah: mode tampilan (baca) atau mode edit (form + foto).
   * @returns {JSX.Element} Panel profil kepala sekolah.
   */
  const renderProfilKepala = () => {
    const jkLabel = kepala?.jenis_kelamin === "P" ? "Perempuan" : kepala?.jenis_kelamin === "L" ? "Laki-laki" : "-";
    const statusAkun = kepala?.status === "aktif" ? "Aktif" : (kepala?.status || "Aktif");
    const details = [
      ["Nama", kepala?.nama || dashboard.user?.name || "-"],
      ["NIP / NUPTK", kepala?.nip || "-"],
      ["Email", kepala?.email || dashboard.user?.email || "-"],
      ["No. HP", kepala?.no_telepon || "-"],
      ["Alamat", kepala?.alamat || "-"],
      ["Jenis Kelamin", jkLabel],
      ["Jabatan", "Kepala Sekolah"],
      ["Status Akun", statusAkun]
    ];

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header compact">
          <span>Profil</span>
          <h1>Profil Kepala Sekolah</h1>
          <p>Data pribadi kepala sekolah.</p>
        </div>

        {editingProfile ? (
          <form className="profile-layout" onSubmit={handleSaveProfile}>
            <div className="profile-photo-card">
              <div className="profile-photo">
                {profileForm.foto || kepala?.foto ? <img src={profileForm.foto || kepala.foto} alt="Foto kepala sekolah" /> : <span>{(kepala?.nama || dashboard.user?.name || "K").slice(0, 1)}</span>}
              </div>
              <label className="profile-photo-btn">
                Ubah Foto
                <input type="file" accept="image/*" onChange={handleProfilePhoto} hidden />
              </label>
            </div>
            <div className="profile-fields">
              <label className="teacher-field">Nama
                <input name="nama" value={profileForm.nama} onChange={handleProfileChange} required />
              </label>
              <label className="teacher-field">Email
                <input type="email" name="email" value={profileForm.email} readOnly disabled />
              </label>
              <label className="teacher-field">No. HP
                <input name="no_telepon" value={profileForm.no_telepon} onChange={handleProfileChange} placeholder="08xxxxxxxxxx" />
              </label>
              <label className="teacher-field">Alamat
                <input name="alamat" value={profileForm.alamat} onChange={handleProfileChange} placeholder="Alamat tempat tinggal" />
              </label>
              <div className="teacher-actions-row">
                <button type="button" className="teacher-secondary" onClick={() => setEditingProfile(false)}>Batal</button>
                <button type="submit" className="teacher-primary" disabled={savingProfile}>{savingProfile ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </form>
        ) : (
          <div className="profile-layout">
            <div className="profile-photo-card">
              <div className="profile-photo">
                {kepala?.foto ? <img src={kepala.foto} alt="Foto kepala sekolah" /> : <span>{(kepala?.nama || dashboard.user?.name || "K").slice(0, 1)}</span>}
              </div>
              <span className="teacher-role-pill">Kepala Sekolah</span>
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
   * Menentukan panel yang dirender berdasarkan menu aktif (activeMenu).
   * @returns {JSX.Element} Panel profil/guru/siswa/rekap, atau default dasbor (renderProfil).
   */
  const renderActivePanel = () => {
    if (activeMenu === "profil") return renderProfilKepala();
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
