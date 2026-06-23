import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getGuruDashboard,
  getRekapAbsensiGuru,
  logout,
  submitAbsensiGuru,
  updateGuruProfile
} from "../services/api";
import { exportExcel } from "../utils/exportExcel";

const ABSENSI_OPTIONS = [
  { value: "hadir", label: "Hadir" },
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
  { value: "alpha", label: "Alpha" }
];

const MENU_ITEMS = [
  { id: "dashboard", label: "Dasbor" },
  { id: "jadwal", label: "Jadwal Mengajar" },
  { id: "absensi", label: "Absensi" },
  { id: "rekap", label: "Rekapitulasi Absensi" },
  { id: "profil", label: "Edit Profil" }
];

const emptySummary = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : "-";
}

function getStatusLabel(value) {
  return ABSENSI_OPTIONS.find((item) => item.value === value)?.label || value;
}

function isHomeroomSubjectLabel(value) {
  return ["wali kelas", "guru wali kelas"].includes(String(value || "").trim().toLowerCase());
}

function DashboardGuru() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState([]);
  const [tanggal, setTanggal] = useState(todayISO());
  const [jadwalId, setJadwalId] = useState("");
  const [attendanceMode, setAttendanceMode] = useState("homeroom");
  const [entries, setEntries] = useState({});
  const [savedAttendanceSummary, setSavedAttendanceSummary] = useState(emptySummary);
  const [savingAbsensi, setSavingAbsensi] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [rekap, setRekap] = useState({ summary: emptySummary, rows: [] });
  const [rekapFilter, setRekapFilter] = useState({
    kelas_id: "",
    jadwal_id: "",
    mapel: "",
    dari: firstDayOfMonthISO(),
    sampai: todayISO()
  });
  useEffect(() => {
    const loadDashboard = async () => {
      const result = await getGuruDashboard();

      if (!result.success) {
        alert(result.message || "Gagal membuka dashboard guru");
        navigate("/login-guru");
        return;
      }

      const data = result.data;
      const firstJadwalId = data.jadwal?.[0]?.id ? String(data.jadwal[0].id) : "";
      const firstClassId = data.kelasAkses?.[0]?.id || data.guruProfile?.kelas_id || "";
      const isHomeroom = Boolean(data.guruProfile?.is_homeroom) || data.guruProfile?.teacher_type === "wali_kelas";
      setJadwalId(firstJadwalId);
      setAttendanceMode(isHomeroom ? "homeroom" : "subject");
      setRekapFilter((previous) => ({ ...previous, kelas_id: firstClassId ? String(firstClassId) : "" }));
      setProfileForm({ name: data.user?.name || "", email: data.user?.email || "" });
      setDashboard(data);
      setLoading(false);
    };

    loadDashboard();
  }, [navigate]);

  const profile = dashboard?.guruProfile;
  const isWali = Boolean(profile?.is_homeroom) || profile?.teacher_type === "wali_kelas";
  const hasSubjectRoster = Boolean(dashboard?.jadwal?.length);
  const displaySubject = profile?.subject && !isHomeroomSubjectLabel(profile.subject) ? profile.subject : "";
  const attendanceIsHomeroom = isWali && attendanceMode === "homeroom";
  const roleLabel = isWali && hasSubjectRoster ? "Guru Wali Kelas + Mata Pelajaran" : isWali ? "Guru Wali Kelas" : "Guru Mata Pelajaran";
  const teacherInitial = (dashboard?.user?.name || "G").trim().charAt(0) || "G";

  const classOptions = useMemo(() => {
    if (!dashboard) return [];
    if (dashboard.kelasAkses?.length) return dashboard.kelasAkses.filter(Boolean);
    return dashboard.guruProfile?.kelas ? [dashboard.guruProfile.kelas] : [];
  }, [dashboard]);

  const selectedJadwal = useMemo(() => {
    if (!dashboard || !jadwalId) return null;
    return (dashboard.jadwal || []).find((item) => Number(item.id) === Number(jadwalId)) || null;
  }, [dashboard, jadwalId]);

  const mapelOptions = useMemo(() => {
    const options = new Set();
    if (displaySubject) {
      displaySubject.split(/[,;+]/).map((item) => item.trim()).filter(Boolean).forEach((item) => options.add(item));
    }
    (dashboard?.jadwal || []).forEach((item) => {
      if (item.mapel) options.add(item.mapel);
    });
    return [...options].sort((first, second) => first.localeCompare(second, "id"));
  }, [dashboard, displaySubject]);

  const attendanceClassId = attendanceIsHomeroom ? profile?.kelas_id : selectedJadwal?.kelas_id;

  const siswaList = useMemo(() => {
    if (!dashboard || !attendanceClassId) return [];
    return (dashboard.siswa || []).filter((siswa) => Number(siswa.kelas_id) === Number(attendanceClassId));
  }, [dashboard, attendanceClassId]);

  const attendanceSummary = useMemo(() => {
    const currentStudentIds = new Set(siswaList.map((siswa) => Number(siswa.id)));
    return Object.values(entries).reduce((summary, entry) => {
      if (!currentStudentIds.has(Number(entry?.siswa_id))) return summary;
      const status = entry?.status;
      if (!status) return summary;
      summary[status] += 1;
      summary.total += 1;
      return summary;
    }, { ...emptySummary });
  }, [entries, siswaList]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setNotice(null);
    const result = await updateGuruProfile({ name: profileForm.name });
    setSavingProfile(false);
    setNotice({ type: result.success ? "success" : "error", text: result.message });
    if (result.success) {
      setDashboard((current) => current ? { ...current, user: { ...current.user, name: profileForm.name } } : current);
    }
  };

  const toggleAnnouncement = (id) => {
    setExpandedAnnouncements((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleLogout = () => {
    logout();
    navigate("/login-guru");
  };

  const handleEntry = (id, field, value) => {
    setSavedAttendanceSummary(emptySummary);
    setEntries((previous) => ({
      ...previous,
      [id]: { ...previous[id], siswa_id: id, [field]: value }
    }));
  };

  const handleSubmitAbsensi = async (event) => {
    event.preventDefault();
    setSavingAbsensi(true);
    setNotice(null);
    const selectedEntries = siswaList
      .map((siswa) => entries[siswa.id])
      .filter((entry) => entry?.status);

    if (selectedEntries.length === 0) {
      setSavingAbsensi(false);
      setNotice({ type: "error", text: "Pilih status absensi minimal satu siswa sebelum menyimpan." });
      return;
    }

    const result = await submitAbsensiGuru({
      tanggal,
      kelas_id: attendanceClassId,
      jadwal_id: attendanceIsHomeroom ? null : jadwalId,
      entries: selectedEntries
    });

    setSavingAbsensi(false);
    setNotice({ type: result.success ? "success" : "error", text: result.message });
    if (result.success) setSavedAttendanceSummary(attendanceSummary);
  };

  const handleRekapFilter = (event) => {
    const { name, value } = event.target;
    setRekapFilter((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "kelas_id" ? { jadwal_id: "" } : {})
    }));
  };

  const loadRekap = async () => {
    if (!rekapFilter.mapel.trim()) {
      setRekap({ summary: emptySummary, rows: [] });
      setNotice({ type: "error", text: "Pilih mata pelajaran terlebih dahulu untuk menampilkan rekap." });
      return;
    }

    if (hasSubjectRoster && !rekapFilter.jadwal_id) {
      setRekap({ summary: emptySummary, rows: [] });
      setNotice({ type: "error", text: "Pilih jadwal mengajar terlebih dahulu untuk menampilkan rekap." });
      return;
    }

    setRekapLoading(true);
    setNotice(null);

    const result = await getRekapAbsensiGuru(rekapFilter);
    setRekapLoading(false);

    if (!result.success) {
      setNotice({ type: "error", text: result.message });
      return;
    }

    setRekap(result.data || { summary: emptySummary, rows: [] });
  };

  const exportRekap = () => {
    if (!rekap.rows.length) return;

    exportExcel({
      filename: `rekap-absensi-${rekapFilter.dari || "awal"}-${rekapFilter.sampai || "akhir"}.xls`,
      title: "Rekapitulasi Absensi Siswa",
      subtitle: `${roleLabel} â€¢ ${rekapFilter.mapel ? `Mapel ${rekapFilter.mapel} â€¢ ` : ""}Periode ${rekapFilter.dari || "awal"} sampai ${rekapFilter.sampai || "akhir"}`,
      summary: [
        { label: "Hadir", value: rekap.summary?.hadir || 0 },
        { label: "Izin", value: rekap.summary?.izin || 0 },
        { label: "Sakit", value: rekap.summary?.sakit || 0 },
        { label: "Alpha", value: rekap.summary?.alpha || 0 },
        { label: "Total", value: rekap.summary?.total || 0 }
      ],
      columns: [
        { header: "No", value: (_row, index) => index + 1 },
        { header: "Tanggal", value: (row) => formatDate(row.tanggal) },
        { header: "Nama Siswa", value: (row) => row.siswa?.nama || "-" },
        { header: "Kelas", value: (row) => row.kelas?.nama_kelas || "-" },
        { header: "Mata Pelajaran", value: (row) => row.mapel || "Absensi Kelas" },
        { header: "Status", value: (row) => getStatusLabel(row.status) },
        { header: "Keterangan", value: (row) => row.keterangan || "-" }
      ],
      rows: rekap.rows
    });
  };

  const renderSummaryCards = (summary) => (
    <div className="teacher-stats">
      {ABSENSI_OPTIONS.map((item) => (
        <div className={`teacher-stat teacher-stat-${item.value}`} key={item.value}>
          <span>{item.label}</span>
          <strong>{summary[item.value] || 0}</strong>
        </div>
      ))}
      <div className="teacher-stat teacher-stat-total">
        <span>Total</span>
        <strong>{summary.total || 0}</strong>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const announcements = dashboard.pengumumanTerbaru || [];

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header">
          <span>Dasbor</span>
          <h1>Informasi Sekolah</h1>
          <p>Ringkasan sekolah, profil guru, dan pengumuman terbaru untuk aktivitas harian.</p>
        </div>

        <div className="teacher-profile-overview">
          <article className="teacher-card profile-card teacher-profile-card">
            <div className="teacher-card-title">
              <span>Ringkasan Profil</span>
              <strong>{roleLabel}</strong>
            </div>

            <div className="teacher-profile-head">
              <div className="teacher-profile-avatar" aria-hidden="true">
                <span>{teacherInitial}</span>
              </div>
              <div className="teacher-profile-identity">
                <h2>{dashboard.user?.name}</h2>
                <p>{roleLabel}</p>
              </div>
            </div>

            <div className="teacher-profile-list">
              <div><span>Kelas Akses</span><strong>{classOptions.map((item) => item.nama_kelas).join(", ") || "Belum diset"}</strong></div>
              {displaySubject && <div><span>Mata Pelajaran</span><strong>{displaySubject}</strong></div>}
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
                    <div className="teacher-announcement" key={item.id}>
                      <span>{formatDate(item.date)}</span>
                      <strong>{item.title}</strong>
                      {isOpen && <p>{item.content}</p>}
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

  const renderJadwal = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Jadwal Mengajar Guru</span>
        <h1>Jadwal Mengajar</h1>
        <p>{isWali ? "Wali kelas hanya mengakses kelas wali, sedangkan guru mapel melakukan absensi sesuai jadwal aktif." : "Guru mata pelajaran melakukan absensi berdasarkan kelas, mata pelajaran, hari, dan jam yang disetujui admin."}</p>
      </div>

      <div className="teacher-table-wrap">
        <table className="teacher-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Mata Pelajaran</th>
              <th>Kelas</th>
              <th>Hari</th>
              <th>Jam</th>
            </tr>
          </thead>
          <tbody>
            {isWali && (
              <tr>
                <td>1</td>
                <td>Absensi Kelas</td>
                <td>{profile?.kelas?.nama_kelas || "Belum diset"}</td>
                <td>Senin - Sabtu</td>
                <td>Awal masuk</td>
              </tr>
            )}
            {!isWali && (dashboard.jadwal || []).length === 0 ? (
              <tr><td colSpan="5" className="teacher-empty-cell">Belum ada jadwal mengajar dari admin.</td></tr>
            ) : (dashboard.jadwal || []).map((item, index) => (
              <tr key={item.id}>
                <td>{index + (isWali ? 2 : 1)}</td>
                <td>{item.mapel}</td>
                <td>{item.kelas?.nama_kelas || "-"}</td>
                <td>{item.hari}</td>
                <td>{formatTime(item.jam_mulai)} - {formatTime(item.jam_selesai)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderAbsensi = () => {
    const selectedClassName = attendanceIsHomeroom
      ? profile?.kelas?.nama_kelas || "Kelas belum diset admin"
      : selectedJadwal?.kelas?.nama_kelas || "Pilih jadwal mengajar";
    const selectedMapel = attendanceIsHomeroom ? "Absensi Kelas" : selectedJadwal?.mapel || "Pilih jadwal mengajar";
    const selectedJam = attendanceIsHomeroom ? "Awal masuk" : selectedJadwal ? `${formatTime(selectedJadwal.jam_mulai)} - ${formatTime(selectedJadwal.jam_selesai)}` : "Pilih jadwal";

    return (
      <section className="teacher-panel">
        <div className="teacher-panel-header compact">
          <span>Absensi</span>
          <h1>{attendanceIsHomeroom ? "Absensi" : "Absensi Mata Pelajaran"}</h1>
          <p>{attendanceIsHomeroom ? "Wali kelas mengisi absensi harian kelasnya." : "Guru mata pelajaran mengisi absensi sesuai mata pelajaran dan jam mengajar aktif."}</p>
        </div>

        {isWali && hasSubjectRoster && (
          <div className="teacher-actions-row attendance-mode-switch">
            <button type="button" className={attendanceMode === "homeroom" ? "teacher-primary" : "teacher-secondary"} onClick={() => setAttendanceMode("homeroom")}>
              Absensi Kelas
            </button>
            <button type="button" className={attendanceMode === "subject" ? "teacher-primary" : "teacher-secondary"} onClick={() => setAttendanceMode("subject")}>
              Absensi Jadwal Mapel
            </button>
          </div>
        )}

        <form onSubmit={handleSubmitAbsensi} className="teacher-form-stack">
          <div className="teacher-form-grid four-columns">
            <label className="teacher-field">Tanggal
              <input type="date" value={tanggal} onChange={(event) => setTanggal(event.target.value)} required />
            </label>

            <label className="teacher-field">Kelas
              <input value={selectedClassName} readOnly />
            </label>

            <label className="teacher-field">Mata Pelajaran
              <input value={selectedMapel} readOnly />
            </label>

            <label className="teacher-field">Jam
              <input value={selectedJam} readOnly />
            </label>
          </div>

          {!attendanceIsHomeroom && hasSubjectRoster && (
            <label className="teacher-field">Pilih Jadwal Mengajar
              <select value={jadwalId} onChange={(event) => setJadwalId(event.target.value)} required>
                {(dashboard.jadwal || []).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.mapel} - {item.kelas?.nama_kelas} - {item.hari} - {formatTime(item.jam_mulai)}-{formatTime(item.jam_selesai)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {renderSummaryCards(savedAttendanceSummary)}

          <div className="teacher-table-wrap">
            <table className="teacher-table attendance-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Siswa</th>
                  <th>NISN</th>
                  <th>Status</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {siswaList.length === 0 ? (
                  <tr><td colSpan="5" className="teacher-empty-cell">Belum ada siswa untuk kelas absensi ini.</td></tr>
                ) : siswaList.map((siswa, index) => (
                  <tr key={siswa.id}>
                    <td>{index + 1}</td>
                    <td>{siswa.nama}</td>
                    <td>{siswa.nisn}</td>
                    <td>
                      <select value={entries[siswa.id]?.status || ""} onChange={(event) => handleEntry(siswa.id, "status", event.target.value)}>
                        <option value="">Pilih status</option>
                        {ABSENSI_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <input value={entries[siswa.id]?.keterangan || ""} onChange={(event) => handleEntry(siswa.id, "keterangan", event.target.value)} placeholder="Contoh: sakit demam" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="teacher-actions-row">
            <button className="teacher-primary" type="submit" disabled={savingAbsensi || siswaList.length === 0 || (!attendanceIsHomeroom && !jadwalId)}>
              {savingAbsensi ? "Menyimpan..." : "Simpan Absensi"}
            </button>
          </div>
        </form>
      </section>
    );
  };

  const renderRekap = () => (
    <section className="teacher-panel teacher-rekap-panel">
      <div className="teacher-panel-header compact">
        <span>Rekapitulasi</span>
        <h1>Rekapitulasi Absensi</h1>
        <p>Untuk rekap mapel, pilih mata pelajaran dan jadwal mengajar agar data tidak tercampur dengan absensi kelas.</p>
      </div>

      <div className="teacher-rekap-filter-card">
        <div className="teacher-form-grid teacher-rekap-grid">
          <label className="teacher-field">Kelas
            <select name="kelas_id" value={rekapFilter.kelas_id} onChange={handleRekapFilter}>
              <option value="">Semua kelas akses</option>
              {classOptions.map((kelas) => <option key={kelas.id} value={kelas.id}>{kelas.nama_kelas}</option>)}
            </select>
          </label>

          <label className="teacher-field">Mata Pelajaran
            <input list="rekap-mapel-options" name="mapel" value={rekapFilter.mapel} onChange={handleRekapFilter} placeholder="Kosongkan untuk semua" />
            <datalist id="rekap-mapel-options">
              {mapelOptions.map((mapel) => <option key={mapel} value={mapel} />)}
            </datalist>
          </label>

          {hasSubjectRoster && (
            <label className="teacher-field">Jadwal Mengajar
              <select name="jadwal_id" value={rekapFilter.jadwal_id} onChange={handleRekapFilter}>
                <option value="">Semua jadwal mengajar</option>
                {(dashboard.jadwal || []).map((item) => (
                  <option key={item.id} value={item.id}>{item.mapel} - {item.kelas?.nama_kelas} - {item.hari} - {formatTime(item.jam_mulai)}-{formatTime(item.jam_selesai)}</option>
                ))}
              </select>
            </label>
          )}

          <label className="teacher-field">Dari
            <input type="date" name="dari" value={rekapFilter.dari} onChange={handleRekapFilter} />
          </label>

          <label className="teacher-field">Sampai
            <input type="date" name="sampai" value={rekapFilter.sampai} onChange={handleRekapFilter} />
          </label>
        </div>

        <div className="teacher-actions-row teacher-rekap-actions">
          <button type="button" className="teacher-primary" onClick={loadRekap} disabled={rekapLoading}>
            {rekapLoading ? "Memuat..." : "Tampilkan"}
          </button>
          <button type="button" className="teacher-secondary" onClick={exportRekap} disabled={!rekap.rows.length}>
            Ekspor Excel
          </button>
        </div>
      </div>

      {renderSummaryCards(rekap.summary || emptySummary)}

      <div className="teacher-table-wrap">
        <table className="teacher-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Nama Siswa</th>
              <th>Kelas</th>
              <th>Mata Pelajaran</th>
              <th>Status</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {!rekap.rows.length ? (
              <tr><td colSpan="7" className="teacher-empty-cell">Belum ada data rekap pada filter ini.</td></tr>
            ) : rekap.rows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td>{formatDate(row.tanggal)}</td>
                <td>{row.siswa?.nama || "-"}</td>
                <td>{row.kelas?.nama_kelas || "-"}</td>
                <td>{row.mapel || "Absensi Kelas"}</td>
                <td><span className={`teacher-badge status-${row.status}`}>{getStatusLabel(row.status)}</span></td>
                <td>{row.keterangan || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderProfil = () => (
    <section className="teacher-panel">
      <div className="teacher-panel-header compact">
        <span>Edit Profil</span>
        <h1>Edit Profil Guru</h1>
        <p>Perbarui nama tampilan akun. Email akun tidak dapat diubah dan hanya bisa diganti oleh admin.</p>
      </div>

      <form className="teacher-form-stack teacher-profile-form" onSubmit={handleSaveProfile}>
        <div className="teacher-form-grid">
          <label className="teacher-field">Nama Lengkap
            <input name="name" value={profileForm.name} onChange={handleProfileChange} required />
          </label>
          <label className="teacher-field">Email (tidak dapat diubah)
            <input type="email" name="email" value={profileForm.email} readOnly disabled />
          </label>
          <label className="teacher-field">Peran
            <input value={roleLabel} readOnly disabled />
          </label>
          <label className="teacher-field">Kelas Akses
            <input value={classOptions.map((item) => item.nama_kelas).join(", ") || "Belum diset"} readOnly disabled />
          </label>
        </div>

        <div className="teacher-actions-row">
          <button className="teacher-primary" type="submit" disabled={savingProfile}>
            {savingProfile ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </div>
      </form>
    </section>
  );

  const renderActivePanel = () => {
    if (activeMenu === "jadwal") return renderJadwal();
    if (activeMenu === "absensi") return renderAbsensi();
    if (activeMenu === "rekap") return renderRekap();
    if (activeMenu === "profil") return renderProfil();
    return renderDashboard();
  };

  if (loading) {
    return (
      <main className="teacher-loading">
        <div>
          <span>CNB</span>
          <p>Memuat dashboard guru...</p>
        </div>
      </main>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="teacher-shell">
      <header className="teacher-topbar">
        <div className="teacher-brand">
          <span>CNB</span>
          <div>
            <strong>Portal Guru</strong>
            <small>Sistem Informasi Sekolah</small>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="teacher-logout">Keluar</button>
      </header>

      <div className="teacher-layout">
        <aside className="teacher-sidebar">
          <div className="teacher-avatar">
            <span>{dashboard.user?.name?.slice(0, 1) || "G"}</span>
          </div>
          <h2>{dashboard.user?.name}</h2>
          <p>{roleLabel}</p>
          <span className="teacher-role-pill">{profile?.subject || profile?.kelas?.nama_kelas || "Guru"}</span>

          <nav className="teacher-menu" aria-label="Menu dashboard guru">
            {MENU_ITEMS.map((item) => {
              const label = item.label;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={activeMenu === item.id ? "active" : ""}
                  onClick={() => setActiveMenu(item.id)}
                >
                  {label}
                </button>
              );
            })}
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

export default DashboardGuru;
